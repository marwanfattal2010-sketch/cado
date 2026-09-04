import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StaggeredGrid } from "../StaggeredGrid";
import { Chip } from "../Chip";
import { AllFiltersSheet, FacetChips, useFacets } from "../Facets";
import { OCCASIONS } from "../../../lib/filters";
import { TILE_LABEL, priceTier, recipientLabel, type FacetGroup } from "../../../lib/facets";
import { FLOWER_TYPES } from "../../../lib/facets";
import {
  FILTER_PARAM_NAMES,
  SORTS,
  activeCount,
  effectiveSort,
  emptyBrowse,
  matches,
  parseBrowse,
  serializeBrowse,
  sortResults,
  toggleValue,
  type BrowseState,
  type ListKey,
  type Lookup,
  type Sort,
} from "../../../lib/browseParams";
import type { FeedProduct } from "../../../lib/browse";

/**
 * THE FILTERED GRID, AND THE ONE FILTER ENGINE BEHIND IT.
 *
 * Both the rebuilt Fashion tab and the Flowers tab mount this. It is not a
 * component each of them has a copy of — it is the same hook, the same
 * `Facets.tsx` sheets and the same `BrowseState`, so a URL built on one tab
 * means exactly what it means on the other, and a fix to the filter logic
 * cannot land on one tab and miss the next.
 *
 * The state lives in the page's own query string. Applying a filter re-renders
 * the grid in place and scrolls to it; nothing navigates. On a pager that
 * matters — a category tab is a panel inside a horizontal scroller, and going
 * to a separate results page to tick a box loses both your place in the strip
 * and your scroll position in the panel.
 */

/* -------------------------------------------------------------------------- */
/* The hook                                                                   */
/* -------------------------------------------------------------------------- */

export function useTabFilters({
  slug,
  tabSlug,
  all,
  subcategories,
  stores,
  lookup,
}: {
  /** The CATEGORY slug — "flowers-gifts". */
  slug: string;
  /**
   * The TAB slug — "flowers". Usually the same string as the category, and on
   * four tabs it is not: flowers/flowers-gifts, jewelry/jewelry-accessories,
   * home/gift-sets, perfumes/perfumes.
   *
   * The distinction is not cosmetic. `tab` is the pager's own parameter, so
   * writing the category slug into it names a tab that does not exist —
   * reloading `?tab=flowers-gifts` would land on the wrong tab entirely. This
   * went unnoticed on Fashion, where the two slugs are the same word.
   */
  tabSlug: string;
  /** Everything in this category, unfiltered. */
  all: FeedProduct[];
  subcategories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
  lookup: Lookup;
}) {
  const [params, setParams] = useSearchParams();
  const gridTop = useRef<HTMLDivElement | null>(null);

  /*
   * Only the ACTIVE tab's panel acts on the filter params.
   *
   * Three panels are mounted at once — the one you are on and its two
   * neighbours — and they all read the same query string. Without this check
   * every one of them would filter itself by whatever the visible tab's chips
   * say, so swiping to Chocolate would land on a page already narrowed to
   * `cat=bouquets`.
   */
  const urlState = useMemo(() => parseBrowse(params), [params]);
  const isMine = params.get("tab") === tabSlug;
  /*
   * `cat` comes from the PANEL, never from the URL.
   *
   * `parseBrowse` reads the category out of the `tab` parameter, and `tab`
   * now correctly holds the tab slug — so on Flowers it parsed `cat:
   * "flowers"` when the category is `flowers-gifts`. Nothing matched
   * FACETS_BY_CATEGORY, the facet list fell back to its two-item default, and
   * the row lost five of its seven chips. The panel already knows which
   * category it is; the URL only has to say which tab.
   */
  const state: BrowseState = isMine ? { ...urlState, cat: slug } : emptyBrowse(slug);

  const push = (next: BrowseState, scroll = true) => {
    const qs = new URLSearchParams(serializeBrowse({ ...next, cat: slug }));
    // The pager owns `tab`, and it wants the TAB slug. serializeBrowse just
    // wrote the category into it, which on Flowers is a different word.
    qs.set("tab", tabSlug);
    // Anything the shell keeps in the query string that is not ours survives.
    params.forEach((v, k) => {
      if (!FILTER_PARAM_NAMES.includes(k) && k !== "tab") qs.set(k, v);
    });
    setParams(qs, { replace: false });
    if (scroll) requestAnimationFrame(() => gridTop.current?.scrollIntoView({ block: "start" }));
  };

  const results = useMemo(
    () => sortResults(all.filter((p) => matches(p, state, lookup)), effectiveSort(state), lookup),
    [all, state, lookup]
  );

  const facets = useFacets({ products: all, state, lookup, subcategories, stores });

  /* ---- the applied chips, in the order they read best ------------------- */

  type Applied = { key: string; label: string; remove: () => void };
  const applied: Applied[] = [];
  if (state.tile) {
    applied.push({
      key: "view",
      label: TILE_LABEL[state.tile],
      remove: () => push({ ...state, tile: null }, false),
    });
  }
  const group = (g: ListKey, label: (v: string) => string) => {
    for (const v of state[g]) {
      applied.push({
        key: `${g}:${v}`,
        label: label(v),
        remove: () => push(toggleValue(state, g, v), false),
      });
    }
  };
  group("for", (v) => recipientLabel(v));
  group("occasion", (v) => OCCASIONS.find((o) => o.value === v)?.label ?? v);
  group("flower", (v) => FLOWER_TYPES.find((t) => t.value === v)?.label ?? v);
  group("colour", (v) => v.charAt(0).toUpperCase() + v.slice(1));
  group("price", (v) => priceTier(v)?.label ?? v);
  group("type", (v) => subcategories.find((s) => s.slug === v)?.name ?? v);
  group("size", (v) => `Size ${v}`);
  group("store", (v) => stores.find((s) => s.slug === v)?.name ?? v);
  if (state.min != null || state.max != null) {
    applied.push({
      key: "range",
      label: `$${state.min ?? 0} – $${state.max ?? "∞"}`,
      remove: () => push({ ...state, min: null, max: null }, false),
    });
  }

  return { state, push, results, facets, applied, gridTop, isMine, params, setParams, slug };
}

export type TabFilters = ReturnType<typeof useTabFilters>;

/* -------------------------------------------------------------------------- */
/* The section                                                                */
/* -------------------------------------------------------------------------- */

export function FilterGridSection({
  filters,
  heading,
  subcategories,
  stores,
}: {
  filters: TabFilters;
  /** "All flowers", "All fashion" — the count is appended here. */
  heading: string;
  subcategories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
}) {
  const { state, push, results, facets, applied, gridTop, isMine, params, setParams, slug } =
    filters;
  const [allOpen, setAllOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <>
      <div ref={gridTop} className="pt-6">
        <h2 className="px-[var(--page-x)] pb-2 text-h2 text-ink">
          {heading} · {results.length} {results.length === 1 ? "gift" : "gifts"}
        </h2>

        {/*
          STICKY FROM HERE DOWN, and only here. The header, the search field
          and the tab strip live outside the scroller and are permanently in
          place, so this is the only thing on the page that has to stick — and
          it sticks to the top of the panel it lives in, which is why it only
          takes effect once you have scrolled into the grid.
        */}
        <div className="sticky top-0 z-20 bg-canvas">
          <SortRow
            state={state}
            push={push}
            onOpenAll={() => setAllOpen(true)}
            openSort={() => setSortOpen(true)}
          />

          {applied.length ? (
            <div className="scroll-row py-1" style={{ ["--row-gap" as string]: "8px" }}>
              {applied.map((a) => (
                <Chip key={a.key} label={a.label} selected removable onClick={a.remove} />
              ))}
              <button
                type="button"
                onClick={() => push({ ...emptyBrowse(slug), sort: state.sort }, false)}
                className="shrink-0 self-center whitespace-nowrap px-1 text-caption font-medium text-muted underline underline-offset-4"
              >
                Clear all
              </button>
            </div>
          ) : null}

          <div className="pb-1">
            <FacetChips
              cat={slug}
              state={state}
              onChange={(next) => push(next, false)}
              facets={facets}
              subcategories={subcategories}
              stores={stores}
              openOnMount={isMine ? (params.get("facet") as FacetGroup | null) : null}
              onOpened={() => {
                const next = new URLSearchParams(params);
                next.delete("facet");
                setParams(next, { replace: true });
              }}
            />
          </div>
        </div>

        <div className="pb-8">
          {results.length === 0 ? (
            <div className="px-[var(--page-x)] pt-2"><EmptyGrid applied={applied} onClearAll={() => push(emptyBrowse(slug), false)} /></div>
          ) : (
            <StaggeredGrid products={results} />
          )}
        </div>
      </div>

      <AllFiltersSheet
        open={allOpen}
        onClose={() => setAllOpen(false)}
        onApply={(next) => {
          setAllOpen(false);
          push(next, false);
        }}
        state={state}
        facets={facets}
      />

      {sortOpen ? (
        <SortSheet state={state} push={push} onClose={() => setSortOpen(false)} />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Sort                                                                       */
/* -------------------------------------------------------------------------- */

/** The sorts that are their own tap on the row, so the ▾ menu skips them. */
const MENU_SORTS: Sort[] = ["recommended", "newest", "discount"];

function SortRow({
  state,
  push,
  onOpenAll,
  openSort,
}: {
  state: BrowseState;
  push: (s: BrowseState, scroll?: boolean) => void;
  onOpenAll: () => void;
  openSort: () => void;
}) {
  const current = SORTS.find((s) => s.value === state.sort);
  return (
    <div className="flex items-center gap-3 px-[var(--page-x)] py-1">
      <button
        type="button"
        onClick={openSort}
        className={`whitespace-nowrap text-caption ${
          MENU_SORTS.includes(state.sort) ? "font-semibold text-ink" : "font-medium text-muted"
        }`}
      >
        {MENU_SORTS.includes(state.sort) ? current?.short : "Recommended"} ▾
      </button>
      <button
        type="button"
        onClick={() => push({ ...state, sort: "popular" }, false)}
        className={`whitespace-nowrap text-caption ${
          state.sort === "popular" ? "font-semibold text-ink" : "font-medium text-muted"
        }`}
      >
        Most popular
      </button>
      <button
        type="button"
        onClick={() =>
          push({ ...state, sort: state.sort === "price-asc" ? "price-desc" : "price-asc" }, false)
        }
        className={`whitespace-nowrap text-caption ${
          state.sort.startsWith("price") ? "font-semibold text-ink" : "font-medium text-muted"
        }`}
      >
        Price {state.sort === "price-asc" ? "↑" : state.sort === "price-desc" ? "↓" : "⇅"}
      </button>
      <button
        type="button"
        onClick={onOpenAll}
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
  );
}

function SortSheet({
  state,
  push,
  onClose,
}: {
  state: BrowseState;
  push: (s: BrowseState, scroll?: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="rounded-t-[18px] bg-canvas pb-3">
        <p className="px-4 py-3 text-body font-semibold text-ink">Sort</p>
        {SORTS.filter((s) => MENU_SORTS.includes(s.value)).map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              onClose();
              push({ ...state, sort: s.value }, false);
            }}
            className="flex h-12 w-full items-center justify-between border-t border-line px-4 text-left text-body text-ink"
          >
            {s.label}
            {state.sort === s.value ? <span className="text-persimmon">✓</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyGrid({
  applied,
  onClearAll,
}: {
  applied: { label: string; remove: () => void }[];
  onClearAll: () => void;
}) {
  const last = applied[applied.length - 1];
  return (
    <div className="rounded-card bg-surface p-6 text-center shadow-rest">
      <p className="text-body font-semibold text-ink">No gifts match all of these.</p>
      {last ? <p className="mt-1 text-caption text-muted">Try removing “{last.label}”.</p> : null}
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
