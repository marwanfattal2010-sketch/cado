import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCatalogue, useAllSubcategories, useStoreDirectory } from "../hooks/useCatalogue";
import { useCategories } from "../hooks/useCategories";
import { useHomeSignals } from "../hooks/useHomeEndless";
import { ProductCard } from "../components/ProductCard";
import { Chip } from "../components/shop/Chip";
import { FilterSheet } from "../components/shop/FilterSheet";
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
import { TILE_LABEL, priceTierLabel, parsePriceTier, recipientLabel } from "../lib/facets";
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
    }),
    [subcategoriesAll.data, directory.data, signals.data]
  );

  const results = useMemo(
    () => sortResults(pool.filter((p) => matches(p, state, lookup)), state.sort, lookup),
    [pool, state, lookup]
  );

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
      label: priceTierLabel(parsePriceTier(v) ?? 0),
      remove: () => push(toggleValue(state, "price", v)),
    });
  for (const v of state.type)
    applied.push({
      key: `type:${v}`,
      label: subcategories.find((s) => s.slug === v)?.name ?? v,
      remove: () => push(toggleValue(state, "type", v)),
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
    : applied.every((a) => /^(tile|type|store):?/.test(a.key));
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
        STICKY CHROME, and it is measured.
        ONE control row, not two: back + title + Sort + Filter on a single
        line, then the applied chips. That comes to ~86px at 375px against the
        120px the brief allows, and it buys back a third of the first screen.
        Heights are written in px on purpose — this project replaces Tailwind's
        spacing scale (h-8 is 64px here, not 32), so scale classes lie.
      */}
      <div className="sticky top-0 z-20 bg-canvas">
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
              {results.length} {results.length === 1 ? "gift" : "gifts"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="shrink-0 whitespace-nowrap px-1.5 text-caption font-medium text-ink"
          >
            {SORTS.find((s) => s.value === state.sort)?.short} ▾
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-[32px] shrink-0 items-center gap-1.5 rounded-pill border border-ink/[0.12] px-3 text-caption font-semibold text-ink"
          >
            Filter
            {activeCount(state) > 0 ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-persimmon px-1 text-[10px] font-black text-white">
                {activeCount(state)}
              </span>
            ) : null}
          </button>
        </div>

        {applied.length ? (
          <div className="scroll-row py-1.5" style={{ ["--row-gap" as string]: "8px" }}>
            {applied.map((a) => (
              <Chip key={a.key} label={a.label} selected removable onClick={a.remove} />
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 self-center whitespace-nowrap px-1 text-caption font-medium text-muted underline underline-offset-4"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-[var(--page-x)] pb-24 pt-2">
        {results.length === 0 ? (
          <EmptyState applied={applied} onClearAll={clearAll} />
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
            {results.map((p) => (
              <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} compact />
            ))}
          </div>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setSheetOpen(false);
          push(next);
        }}
        state={state}
        products={pool}
        lookup={lookup}
        subcategories={subcategories}
        stores={stores}
      />

      {sortOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <button type="button" aria-label="Close" className="flex-1" onClick={() => setSortOpen(false)} />
          <div className="rounded-t-[18px] bg-canvas pb-3">
            <p className="px-4 py-3 text-body font-semibold text-ink">Sort</p>
            {SORTS.map((s) => (
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
