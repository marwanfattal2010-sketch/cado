import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCatalogue, useAllSubcategories, useStoreDirectory } from "../hooks/useCatalogue";
import { useCategories } from "../hooks/useCategories";
import { useHomeSignals } from "../hooks/useHomeEndless";
import { StaggeredGrid } from "../components/shop/StaggeredGrid";
import { AllFiltersSheet, FacetChips, useFacets } from "../components/shop/Facets";
import { ChevronLeftIcon } from "../components/Icons";
import {
  SORTS,
  activeCount,
  emptyBrowse,
  matches,
  parseBrowse,
  serializeBrowse,
  sortResults,
  toggleValue,
  type BrowseState,
  type Lookup,
  type Sort,
} from "../lib/browseParams";
import { TILE_LABEL, priceTier, recipientLabel, type FacetGroup } from "../lib/facets";
import { OCCASIONS } from "../lib/filters";

/**
 * /browse — the Results page, and the point of this whole rebuild.
 *
 * Before it, every entry point on a category tab set ONE filter and scroll-
 * jumped to the grid at the bottom of the same page. Three things were broken
 * by that and all three are fixed by having a page of its own:
 *
 *   - selections replace each other → they stack, because each one is a URL
 *     param rather than a setState that overwrites;
 *   - a long unexplained jump → you navigate somewhere, with a title that
 *     says what you are looking at;
 *   - tiles and subcategory circles had nowhere to go → they have a
 *     destination that can express what they mean.
 *
 * Filtering is client-side over the shared catalogue. That is deliberate at
 * this size: the whole live catalogue is about a hundred products and is
 * already in memory, so every chip toggle is instant and costs no request.
 * When the catalogue grows past a few thousand this is the first thing to
 * move back to the server.
 */
/** The sorts that are their own tap on the row, so the ▾ menu skips them. */
const isInline = (s: Sort) => s === "popular" || s === "price-asc" || s === "price-desc";

export function BrowseResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const catalogue = useCatalogue();
  const categories = useCategories();
  const subcategoriesAll = useAllSubcategories();
  const directory = useStoreDirectory();
  const signals = useHomeSignals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const state = useMemo(() => parseBrowse(params), [params]);

  /** Writing state back to the URL IS the state update. */
  const push = (next: BrowseState) => setParams(serializeBrowse(next), { replace: false });

  const category = categories.data?.find((c) => c.slug === state.cat);

  const subcategories = useMemo(
    () =>
      (subcategoriesAll.data ?? [])
        .filter((s) => s.category_id === category?.id)
        .map((s) => ({ slug: s.slug, name: s.name })),
    [subcategoriesAll.data, category?.id]
  );

  /** Everything in this category — the pool every count is measured against. */
  const pool = useMemo(
    () => (catalogue.data ?? []).filter((p) => !category || p.category_id === category.id),
    [catalogue.data, category]
  );

  const stores = useMemo(() => {
    const ids = new Set(pool.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id) && s.slug)
      .map((s) => ({ slug: s.slug as string, name: s.name.replace(/\[.*?\]\s*/g, "") }));
  }, [directory.data, pool]);

  const lookup = useMemo<Lookup>(
    () => ({
      typeId: (slug) => (subcategoriesAll.data ?? []).find((s) => s.slug === slug)?.id,
      storeId: (slug) => (directory.data ?? []).find((s) => s.slug === slug)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((s) => s.recentOrders > 0),
    }),
    [subcategoriesAll.data, directory.data, signals.data]
  );

  const results = useMemo(
    () => sortResults(pool.filter((p) => matches(p, state, lookup)), state.sort, lookup),
    [pool, state, lookup]
  );

  /** One option model, shared by the chip row and the all-facets sheet. */
  const facets = useFacets({ products: pool, state, lookup, subcategories, stores });

  /* ---- the applied chips, in the order they read best ------------------- */

  type Applied = { key: string; label: string; remove: () => void };
  const applied: Applied[] = [];
  if (state.tile) {
    applied.push({
      key: "tile",
      label: TILE_LABEL[state.tile],
      remove: () => push({ ...state, tile: null }),
    });
  }
  for (const v of state.for)
    applied.push({
      key: `for:${v}`,
      label: recipientLabel(v),
      remove: () => push(toggleValue(state, "for", v)),
    });
  for (const v of state.occasion)
    applied.push({
      key: `occ:${v}`,
      label: OCCASIONS.find((o) => o.value === v)?.label ?? v,
      remove: () => push(toggleValue(state, "occasion", v)),
    });
  for (const v of state.price)
    applied.push({
      key: `price:${v}`,
      label: priceTier(v)?.label ?? v,
      remove: () => push(toggleValue(state, "price", v)),
    });
  for (const v of state.type)
    applied.push({
      key: `type:${v}`,
      label: subcategories.find((s) => s.slug === v)?.name ?? v,
      remove: () => push(toggleValue(state, "type", v)),
    });
  for (const v of state.size)
    applied.push({
      key: `size:${v}`,
      label: `Size ${v}`,
      remove: () => push(toggleValue(state, "size", v)),
    });
  for (const v of state.colour)
    applied.push({
      key: `colour:${v}`,
      label: v.charAt(0).toUpperCase() + v.slice(1),
      remove: () => push(toggleValue(state, "colour", v)),
    });
  for (const v of state.store)
    applied.push({
      key: `store:${v}`,
      label: stores.find((s) => s.slug === v)?.name ?? v,
      remove: () => push(toggleValue(state, "store", v)),
    });
  if (state.min != null || state.max != null)
    applied.push({
      key: "range",
      label: `$${state.min ?? 0} – $${state.max ?? "∞"}`,
      remove: () => push({ ...state, min: null, max: null }),
    });

  /* ---- the title, in plain words --------------------------------------- */

  const catName = category?.name ?? "Gifts";
  /*
   * A title in plain words. "For Him" is right on a chip but reads oddly as
   * a heading, so the leading "For" is lowercased into the sentence: the
   * heading becomes "Gifts for Him · Anniversary".
   */
  const labels = applied.map((a) => a.label);
  const phrase =
    labels.length <= 3
      ? labels.join(" · ")
      : `${labels[0]} · ${labels[1]} +${labels.length - 2}`;
  const first = labels[0] ?? "";
  /*
   * A NAME IS ALREADY A HEADING; A DESCRIPTION NEEDS THE NOUN.
   *
   * "Anniversary" describes gifts, so it takes one: "Anniversary gifts". A
   * type or a shop IS the thing you are looking at, so bolting the noun on
   * gives "Men gifts" and "Necklaces gifts". Same for a tile — "Ready to gift
   * gifts". Those stand alone, with the count line underneath carrying the
   * noun.
   */
  const namesOnly = !applied.length
    ? false
    : applied.every((a) => /^(tile|type|store|size|colour):?/.test(a.key));
  const title = !applied.length
    ? `All ${catName}`
    : namesOnly
      ? phrase
      : first.startsWith("For ")
        ? `Gifts ${phrase.replace(/^For /, "for ")}`
        : `${phrase} gifts`;

  const clearAll = () => push({ ...emptyBrowse(state.cat), sort: state.sort });

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/*
        STICKY CHROME — header, applied chips, sort row, facet chips.
        Measured at 375px and kept under the 120px the brief allows: the header
        and the two chip rows are 36-40px each and the sort row is text only.
        Heights are written in px on purpose — this project replaces Tailwind's
        spacing scale (h-8 is 64px here, not 32), so scale classes lie.
      */}
      {/*
        THE TITLE ROW SCROLLS AWAY; the three control rows stick.
        Kept sticky, the four rows measured 152px against the 120px the brief
        allows. The brief's own list of what sticks is applied chips, sort and
        facet chips — the title is not in it — and those three come to 110px.
        The controls are what you need while scrolling a grid; the title is
        what you needed when you arrived.
      */}
      <div className="flex items-center gap-1 px-2 pt-1.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-semibold leading-tight text-ink">{title}</h1>
          <p className="text-[11px] leading-none text-muted">
            {results.length} {results.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-canvas">
        {/*
          ONE CHIP ROW, not two.
          There used to be an applied row above the facet row, which meant a
          chosen filter appeared twice — once as a chip to remove and once as
          a facet showing its own value — and cost a whole 44px band of sticky
          chrome to do it. Applied things now lead the single facet row, in
          persimmon with an ✕; everything unset follows in grey.
        */}

        {/* Row A — sort, inline. Tapping Price toggles its direction. */}
        <div className="flex items-center gap-3 px-[var(--page-x)] py-1">
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className={`whitespace-nowrap text-caption ${
              state.sort === "recommended" || state.sort === "newest" || state.sort === "discount"
                ? "font-semibold text-ink"
                : "font-medium text-muted"
            }`}
          >
            {SORTS.find((s) => s.value === state.sort && !isInline(s.value))?.short ?? "Recommended"} ▾
          </button>
          <button
            type="button"
            onClick={() => push({ ...state, sort: "popular" })}
            className={`whitespace-nowrap text-caption ${
              state.sort === "popular" ? "font-semibold text-ink" : "font-medium text-muted"
            }`}
          >
            Most popular
          </button>
          <button
            type="button"
            onClick={() =>
              push({ ...state, sort: state.sort === "price-asc" ? "price-desc" : "price-asc" })
            }
            className={`whitespace-nowrap text-caption ${
              state.sort.startsWith("price") ? "font-semibold text-ink" : "font-medium text-muted"
            }`}
          >
            Price {state.sort === "price-asc" ? "↑" : state.sort === "price-desc" ? "↓" : "⇅"}
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-ink"
          >
            Filter ⛛
            {activeCount(state) > 0 ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-persimmon px-1 text-[10px] font-black text-white">
                {activeCount(state)}
              </span>
            ) : null}
          </button>
        </div>

        {/* Row 3 — one dropdown chip per facet. */}
        <div className="pb-1">
          <FacetChips
            cat={state.cat}
            state={state}
            onChange={push}
            facets={facets}
            subcategories={subcategories}
            stores={stores}
            extra={applied.filter((a) => a.key === "tile" || a.key === "range")}
            openOnMount={params.get("facet") as FacetGroup | null}
            onOpened={() => {
              // Consumed once. Left in the URL it would reopen the sheet every
              // time a filter changed, because every change rewrites the query.
              const next = new URLSearchParams(params);
              next.delete("facet");
              setParams(next, { replace: true });
            }}
          />
        </div>
      </div>

      <div className="pb-24">
        {results.length === 0 ? (
          <div className="px-[var(--page-x)] pt-2">
            <EmptyState applied={applied} onClearAll={clearAll} />
          </div>
        ) : (
          /* The same staggered grid the tab page uses — one component, so a
             card cannot look like two different things on two screens. */
          <StaggeredGrid products={results} />
        )}
      </div>

      <AllFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setSheetOpen(false);
          push(next);
        }}
        state={state}
        facets={facets}
      />

      {/*
        The little menu behind "Recommended ▾" — only the sorts that are NOT
        already a tap on the row itself, so the row and the menu never offer
        the same thing twice.
      */}
      {sortOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <button type="button" aria-label="Close" className="flex-1" onClick={() => setSortOpen(false)} />
          <div className="rounded-t-[18px] bg-canvas pb-3">
            <p className="px-4 py-3 text-body font-semibold text-ink">Sort</p>
            {SORTS.filter((s) => !isInline(s.value)).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setSortOpen(false);
                  push({ ...state, sort: s.value as Sort });
                }}
                className="flex h-12 w-full items-center justify-between border-t border-line px-4 text-left text-body text-ink"
              >
                {s.label}
                {state.sort === s.value ? <span className="text-persimmon">✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Never a bare "no results".
 *
 * It names the filter most likely to be the culprit — the last one added,
 * which is the one the shopper just chose — and offers the two ways out.
 */
function EmptyState({
  applied,
  onClearAll,
}: {
  applied: { key: string; label: string; remove: () => void }[];
  onClearAll: () => void;
}) {
  const last = applied[applied.length - 1];
  return (
    <div className="rounded-card bg-surface p-6 text-center shadow-rest">
      <p className="text-body font-semibold text-ink">No gifts match all of these.</p>
      {last ? (
        <p className="mt-1 text-caption text-muted">Try removing “{last.label}”.</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        {last ? (
          <button
            type="button"
            onClick={last.remove}
            className="min-h-[44px] rounded-pill bg-persimmon text-body font-semibold text-white"
          >
            Remove last filter
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClearAll}
          className="min-h-[44px] rounded-pill border border-line text-body font-medium text-ink"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
