import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./ui";
import { BUDGETS, OCCASIONS, AUDIENCES, budgetBySlug } from "../lib/filters";
import {
  NO_FILTERS,
  countActive,
  productMatches,
  toggleFilter,
  type CategoryFilters,
  type FilterableProduct,
} from "./CategoryFilterPanel";

/**
 * The browse controls: a two-row bar, and the panel behind its Filter button.
 *
 * One component for the category tabs, search, store pages and gift-finder
 * results. It replaces the pair of Filter/Sort pills entirely — those are
 * deleted, not left orphaned — and it reuses the existing filter model rather
 * than inventing a second one, so "under $50" still means exactly what
 * inBudgetRange() says it means, with its exclusive upper bound.
 *
 * Everything applies in place. Nothing here navigates or reloads.
 */

export type BrowseSort = "recommended" | "popular" | "price_asc" | "price_desc";

export const BROWSE_SORTS: { value: BrowseSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most Popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

type Sortable = {
  price?: number | string | null;
  created_at?: string | null;
  is_trending?: boolean | null;
};

/**
 * Sort is an ordering, never a filter — nothing here removes a product.
 *
 * "Most Popular" is `products.is_trending`, an editorial flag a human sets in
 * the dashboard. It is NOT a sales rank: the storefront cannot read order
 * volume under RLS, and there is no view or purchase counter anywhere in the
 * schema. Newest-first breaks the tie, which is the order rows already arrive
 * in, so the two sorts differ from each other rather than being the same list
 * under two names.
 */
export function sortBrowse<T extends Sortable>(list: T[], sort: BrowseSort): T[] {
  const out = list.slice();
  const newest = (a: T, b: T) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  switch (sort) {
    case "price_asc":
      out.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price_desc":
      out.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "popular":
      out.sort((a, b) => Number(!!b.is_trending) - Number(!!a.is_trending) || newest(a, b));
      break;
    case "recommended":
      out.sort(newest);
      break;
  }
  return out;
}

export type FilterOptions = {
  categories?: { value: string; label: string }[];
  stores?: { value: string; label: string }[];
  colors?: string[];
  sizes?: string[];
};

/** The seven groups, in the order the panel lists them. */
type GroupKey = "category" | "storeId" | "budget" | "color" | "size" | "audience" | "occasion";

const GROUP_LABELS: Record<GroupKey, string> = {
  category: "Category",
  storeId: "Store",
  budget: "Price",
  color: "Colour",
  size: "Size",
  audience: "Recipient",
  occasion: "Occasion",
};

/** Options for a group, always derived from the products actually in view. */
function optionsFor(
  key: GroupKey,
  rows: FilterableProduct[],
  extra: FilterOptions
): { value: string; label: string }[] {
  switch (key) {
    case "category":
      return extra.categories ?? [];
    case "storeId":
      return extra.stores ?? [];
    case "budget":
      // Only bands something actually falls into.
      return BUDGETS.filter((b) => rows.some((p) => inBand(p, b.slug))).map((b) => ({
        value: b.slug,
        label: b.label,
      }));
    case "color": {
      const seen = new Set<string>();
      for (const p of rows) if (p.color) seen.add(p.color);
      return [...seen].sort().map((c) => ({ value: c, label: c }));
    }
    case "size":
      return (extra.sizes ?? []).map((s) => ({ value: s, label: s }));
    case "audience": {
      const seen = new Set<string>();
      for (const p of rows) for (const t of p.recipient_tags ?? []) seen.add(t);
      return AUDIENCES.filter((a) => seen.has(a.value));
    }
    case "occasion": {
      const seen = new Set<string>();
      for (const p of rows) for (const t of (p.occasion_tags as string[] | null) ?? []) seen.add(t);
      return OCCASIONS.filter((o) => seen.has(o.value)).map((o) => ({ value: o.value, label: o.label }));
    }
  }
}

function inBand(p: FilterableProduct, slug: string) {
  const band = budgetBySlug(slug);
  if (!band) return true;
  const price = Number(p.price);
  return price >= band.min && (band.max == null || price < band.max);
}

/* ------------------------------------------------------------------ */
/* The bar                                                             */
/* ------------------------------------------------------------------ */

/**
 * Filter controls are solid rectangles, not pills: 4px corners, cream with a
 * near-black hairline when off, a solid Persimmon fill with white text when
 * on. Height and padding are unchanged from the pill version — only the
 * shape and the colour moved.
 *
 * The round chips on Home are a different control and stay round; nothing
 * here is shared with them.
 */
const PILL =
  "inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-3.5 text-[13px] font-medium transition-colors";
const PILL_OFF = "border-ink bg-canvas text-ink";
const PILL_ON = "border-persimmon bg-persimmon text-white";

export function BrowseFilterBar({
  rows,
  filters,
  options,
  sort,
  onSort,
  onFilters,
  onOpenPanel,
}: {
  rows: FilterableProduct[];
  filters: CategoryFilters;
  options: FilterOptions;
  sort: BrowseSort;
  onSort: (s: BrowseSort) => void;
  onFilters: (f: CategoryFilters) => void;
  onOpenPanel: () => void;
}) {
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  /** A chip only exists when the products in view really have that
   *  attribute — Chocolate has no sizes, so Chocolate shows no Size chip. */
  const quickGroups = useMemo(
    () =>
      (["category", "size", "color", "budget", "storeId"] as GroupKey[]).filter(
        (k) => optionsFor(k, rows, options).length > 1
      ),
    [rows, options]
  );

  const activeCount = countActive(filters);

  return (
    <div className="sticky top-0 z-20 bg-canvas/95 pb-2 backdrop-blur">
      {/* Row 1 — sort, and the way into the panel. */}
      <div className="flex items-center gap-1 px-[var(--page-x)] pt-2">
        <button
          type="button"
          onClick={() => onSort(sort === "recommended" ? "popular" : "recommended")}
          className={`${PILL} ${sort === "recommended" ? PILL_ON : PILL_OFF}`}
        >
          Recommended
          <span aria-hidden>▾</span>
        </button>
        <button
          type="button"
          onClick={() => onSort("popular")}
          className={`${PILL} ${sort === "popular" ? PILL_ON : PILL_OFF}`}
        >
          Most Popular
        </button>
        <button
          type="button"
          onClick={() => onSort(sort === "price_asc" ? "price_desc" : "price_asc")}
          className={`${PILL} ${sort === "price_asc" || sort === "price_desc" ? PILL_ON : PILL_OFF}`}
        >
          Price
          <span aria-hidden>{sort === "price_desc" ? "↓" : sort === "price_asc" ? "↑" : "⇅"}</span>
        </button>
        <button
          type="button"
          onClick={onOpenPanel}
          className={`${PILL} ml-auto ${activeCount ? PILL_ON : PILL_OFF}`}
        >
          Filter{activeCount ? ` ${activeCount}` : ""}
          <span aria-hidden>⛛</span>
        </button>
      </div>

      {/* Row 2 — quick chips, each a small dropdown. */}
      {quickGroups.length > 0 ? (
        <div className="scroll-row pt-2" style={{ ["--row-gap" as string]: "6px" }}>
          {quickGroups.map((key) => {
            const opts = optionsFor(key, rows, options);
            const chosen = filters[key as keyof CategoryFilters] as string[];
            const on = chosen.length > 0;
            const label = on
              ? `${GROUP_LABELS[key]}: ${opts.find((o) => o.value === chosen[0])?.label ?? chosen[0]}`
              : GROUP_LABELS[key];
            return (
              <div key={key} className="relative shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    // Tapping the value clears it; tapping the label opens.
                    if (on) onFilters({ ...filters, [key]: [] });
                    else setOpenGroup(openGroup === key ? null : key);
                  }}
                  className={`${PILL} ${on ? PILL_ON : PILL_OFF}`}
                >
                  {label}
                  <span aria-hidden>{on ? "×" : "▾"}</span>
                </button>

                {openGroup === key ? (
                  <div className="absolute left-0 top-[38px] z-30 max-h-[240px] w-[190px] overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-lift">
                    {opts.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          onFilters(toggleFilter(filters, key as never, o.value));
                          setOpenGroup(null);
                        }}
                        className="block w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-sunk"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The panel                                                           */
/* ------------------------------------------------------------------ */

/**
 * Full-screen, one list of groups, and you slide into a group rather than
 * scrolling past all seven. The count on the button is live — it is the same
 * `productMatches` the grid runs, over the draft rather than the applied
 * filters, so "Show 42 items" is 42 cards and never an estimate.
 */
export function BrowseFilterPanel({
  open,
  onClose,
  rows,
  options,
  filters,
  onApply,
  sizesByProduct,
}: {
  open: boolean;
  onClose: () => void;
  rows: FilterableProduct[];
  options: FilterOptions;
  filters: CategoryFilters;
  onApply: (f: CategoryFilters) => void;
  sizesByProduct?: Map<string, Set<string>>;
}) {
  const [draft, setDraft] = useState<CategoryFilters>(filters);
  const [group, setGroup] = useState<GroupKey | null>(null);

  // Always reopen showing what the grid is actually filtered by, never a
  // half-edited previous visit.
  useEffect(() => {
    if (open) {
      setDraft(filters);
      setGroup(null);
    }
  }, [open, filters]);

  const count = useMemo(
    () => rows.filter((p) => productMatches(p, draft, sizesByProduct)).length,
    [rows, draft, sizesByProduct]
  );

  const groups = (["category", "storeId", "budget", "color", "size", "audience", "occasion"] as GroupKey[])
    .map((key) => ({ key, opts: optionsFor(key, rows, options) }))
    .filter((g) => g.opts.length > 0);

  const summary = (key: GroupKey, opts: { value: string; label: string }[]) => {
    const chosen = draft[key as keyof CategoryFilters] as string[];
    if (!chosen.length) return "Any";
    return chosen.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(", ");
  };

  const footer = (
    <button
      type="button"
      disabled={count === 0}
      onClick={() => {
        onApply(draft);
        onClose();
      }}
      className="h-[52px] w-full rounded-[4px] bg-persimmon text-body font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-muted"
    >
      {count === 0 ? "No matches" : `Show ${count} item${count === 1 ? "" : "s"}`}
    </button>
  );

  const active = groups.find((g) => g.key === group);

  return (
    <Sheet open={open} onClose={onClose} fullHeight footer={footer}>
      <div className="flex items-center gap-2 pb-2">
        <button
          type="button"
          onClick={() => (active ? setGroup(null) : onClose())}
          aria-label={active ? "Back" : "Close"}
          className="flex h-11 w-11 items-center justify-center rounded-pill text-ink"
        >
          {active ? "‹" : "✕"}
        </button>
        <p className="flex-1 text-center font-display text-h2">{active ? GROUP_LABELS[active.key] : "Filter"}</p>
        <button
          type="button"
          onClick={() => setDraft(NO_FILTERS)}
          className="flex h-11 items-center px-2 text-caption font-medium text-ink"
        >
          Clear all
        </button>
      </div>

      {active ? (
        <div className="pb-4">
          {active.opts.map((o) => {
            const chosen = (draft[active.key as keyof CategoryFilters] as string[]).includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setDraft((d) => toggleFilter(d, active.key as never, o.value))}
                className="flex min-h-[52px] w-full items-center justify-between border-b border-line px-1 text-left text-body"
              >
                <span>{o.label}</span>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 items-center justify-center rounded-[4px] border text-[12px] ${
                    chosen ? "border-persimmon bg-persimmon text-white" : "border-line"
                  }`}
                >
                  {chosen ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pb-4">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className="flex min-h-[60px] w-full items-center justify-between gap-3 border-b border-line px-1 text-left"
            >
              <span className="min-w-0">
                <span className="block text-body">{GROUP_LABELS[g.key]}</span>
                <span className="mt-0.5 block truncate text-caption text-muted">
                  {summary(g.key, g.opts)}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-muted">
                ›
              </span>
            </button>
          ))}

          {/* Two toggles, both reading a real column. */}
          {(
            [
              ["onSale", "On sale"],
              ["inStock", "In stock only"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-[60px] w-full items-center justify-between gap-3 border-b border-line px-1 text-body"
            >
              {label}
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                className="h-5 w-5 accent-[color:rgb(var(--persimmon))]"
              />
            </label>
          ))}
        </div>
      )}
    </Sheet>
  );
}
