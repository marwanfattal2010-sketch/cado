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
  onOpenPanel,
}: {
  rows: FilterableProduct[];
  filters: CategoryFilters;
  options: FilterOptions;
  sort: BrowseSort;
  onSort: (s: BrowseSort) => void;
  /**
   * Opens the sheet. A group means "open straight into that group".
   *
   * There is no `onFilters` any more: the chips no longer edit the filter
   * themselves. Everything is chosen in the sheet and applied once, which is
   * what makes the live result count on its footer trustworthy.
   */
  onOpenPanel: (group?: GroupKey) => void;
}) {
  /**
   * Chip order is the brief's, not the panel's: Category, Recipient, Colour,
   * Size, Price, Store. Recipient was missing entirely even though the data
   * behind it (recipient_tags) has been there all along.
   *
   * A chip only exists when the products in view really have that attribute —
   * Chocolate has no sizes, so Chocolate shows no Size chip.
   */
  const quickGroups = useMemo(
    () =>
      (["category", "audience", "color", "size", "budget", "storeId"] as GroupKey[]).filter(
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
          onClick={() => onOpenPanel()}
          className={`${PILL} ml-auto ${activeCount ? PILL_ON : PILL_OFF}`}
        >
          Filter{activeCount ? ` ${activeCount}` : ""}
          <span aria-hidden>⛛</span>
        </button>
      </div>

      {/*
        Row 2 — the filter chips.

        Each one OPENS THE SHEET at its own group. They used to drop a little
        190px menu underneath, which is why the bar felt unfinished: a
        dropdown can show one group, cannot show a result count, cannot hold
        the price inputs, and is the wrong control on a phone where it opens
        under your thumb. One destination now, entered from six doors.
      */}
      {quickGroups.length > 0 ? (
        <div className="scroll-row pt-2" style={{ ["--row-gap" as string]: "6px" }}>
          {quickGroups.map((key) => {
            const chosen = filters[key as keyof CategoryFilters] as string[];
            // Price is the one chip backed by two things — the preset bands
            // and a typed range — so it lights up for either.
            const typedRange = key === "budget" && (filters.priceMin != null || filters.priceMax != null);
            const n = chosen.length + (typedRange ? 1 : 0);
            const on = n > 0;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => onOpenPanel(key)}
                className={`${PILL} ${on ? PILL_ON : PILL_OFF}`}
              >
                {GROUP_LABELS[key]}
                {/* "Colour · 2" — the count, not the first value's name. With
                    two colours picked, naming only one was actively wrong. */}
                {on ? <span aria-hidden>· {n}</span> : <span aria-hidden>▾</span>}
              </button>
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
 * How a colour NAME is drawn as a dot.
 *
 * Not an option list — the options come from products.color — this only
 * decides what swatch to paint beside a name the database already gave us. A
 * colour with no entry here still renders, with a neutral dot, so a new value
 * typed into the dashboard is never dropped.
 *
 * Literal hex is correct here and is the one sanctioned exception to the "no
 * raw hex" rule: these are samples of a real-world colour, so they cannot
 * come from the brand palette.
 */
const COLOR_DOT: Record<string, string> = {
  black: "#111111",
  white: "#FFFFFF",
  cream: "#F6F1E7",
  beige: "#E8DCC8",
  brown: "#7A5230",
  tan: "#C99A6B",
  grey: "#9AA0A6",
  gray: "#9AA0A6",
  silver: "#C6CBD1",
  gold: "#C9A227",
  red: "#C0392B",
  pink: "#E58AA8",
  purple: "#7D5BA6",
  blue: "#2F6FB5",
  navy: "#1F3864",
  green: "#3B7A57",
  yellow: "#E3C04B",
  orange: "#E07B39",
};

/**
 * Two columns: the groups on the left, that group's options on the right.
 *
 * The previous panel was a single list you drilled into and backed out of,
 * which meant comparing Colour against Size took four taps. Side by side, the
 * groups stay on screen and switching is one tap — which is the whole reason
 * the SHEIN-style layout is worth copying.
 *
 * Every count is live and is the same `productMatches` the grid runs, over
 * the draft rather than the applied filters — so "Show 42 results" is 42
 * cards, and the number beside an option is exactly what tapping it gives.
 */
export function BrowseFilterPanel({
  open,
  onClose,
  rows,
  options,
  filters,
  onApply,
  sizesByProduct,
  initialGroup,
}: {
  open: boolean;
  onClose: () => void;
  rows: FilterableProduct[];
  options: FilterOptions;
  filters: CategoryFilters;
  onApply: (f: CategoryFilters) => void;
  sizesByProduct?: Map<string, Set<string>>;
  /** Which group to land on — set when a chip opened the sheet. */
  initialGroup?: GroupKey | null;
}) {
  const [draft, setDraft] = useState<CategoryFilters>(filters);
  const [group, setGroup] = useState<GroupKey | "more" | null>(null);

  // Always reopen showing what the grid is actually filtered by, never a
  // half-edited previous visit.
  useEffect(() => {
    if (open) {
      setDraft(filters);
      setGroup(initialGroup ?? null);
    }
  }, [open, filters, initialGroup]);

  const count = useMemo(
    () => rows.filter((p) => productMatches(p, draft, sizesByProduct)).length,
    [rows, draft, sizesByProduct]
  );

  const groups = (["category", "audience", "color", "size", "budget", "storeId", "occasion"] as GroupKey[])
    .map((key) => ({ key, opts: optionsFor(key, rows, options) }))
    .filter((g) => g.opts.length > 0);

  const active = groups.find((g) => g.key === group) ?? groups[0];

  /**
   * How many products a single option would leave, given everything else
   * already ticked. Counted WITHOUT that group's own selections, which is the
   * behaviour people expect: with "Red" on, "Blue" should say how many blue
   * ones there are, not zero.
   */
  const countFor = (key: GroupKey, value: string) => {
    const probe: CategoryFilters = { ...draft, [key]: [value] } as CategoryFilters;
    return rows.filter((p) => productMatches(p, probe, sizesByProduct)).length;
  };

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setDraft(NO_FILTERS)}
        className="h-[52px] shrink-0 rounded-[4px] border border-ink bg-canvas px-6 text-body font-medium text-ink"
      >
        Clear
      </button>
      <button
        type="button"
        disabled={count === 0}
        onClick={() => {
          onApply(draft);
          onClose();
        }}
        className="h-[52px] flex-1 rounded-[4px] bg-persimmon text-body font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-muted"
      >
        {count === 0 ? "No matches" : `Show ${count} result${count === 1 ? "" : "s"}`}
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} fullHeight footer={footer}>
      <div className="flex items-center gap-2 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-pill text-ink"
        >
          ✕
        </button>
        <p className="flex-1 text-center font-display text-h2">Filter</p>
        {/* Balances the close button so the title is optically centred. */}
        <span className="h-11 w-11" aria-hidden />
      </div>

      {/*
        TWO COLUMNS. Groups on the left, that group's options on the right.

        Both scroll independently inside the sheet, and `-mx-5` cancels the
        Sheet's own horizontal padding so the divider runs edge to edge.
      */}
      <div className="-mx-5 flex h-full min-h-0">
        <div className="w-[36%] shrink-0 overflow-y-auto border-r border-line bg-surface-sunk">
          {groups.map((g) => {
            const picked =
              (draft[g.key as keyof CategoryFilters] as string[]).length +
              (g.key === "budget" && (draft.priceMin != null || draft.priceMax != null) ? 1 : 0);
            const on = group === g.key || (group == null && active?.key === g.key);
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={`flex w-full items-center justify-between gap-1 px-3 py-3.5 text-left text-[13px] ${
                  on ? "bg-surface font-semibold text-ink" : "text-muted"
                }`}
              >
                <span className="truncate">{GROUP_LABELS[g.key]}</span>
                {picked ? (
                  <span className="shrink-0 rounded-pill bg-persimmon px-1.5 text-[10px] font-bold leading-4 text-white">
                    {picked}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Two toggles, both reading a real column. They are a group like
              any other rather than a footnote under the list. */}
          <button
            type="button"
            onClick={() => setGroup("more")}
            className={`flex w-full items-center justify-between gap-1 px-3 py-3.5 text-left text-[13px] ${
              group === "more" ? "bg-surface font-semibold text-ink" : "text-muted"
            }`}
          >
            <span className="truncate">More</span>
            {(draft.onSale ? 1 : 0) + (draft.inStock ? 1 : 0) ? (
              <span className="shrink-0 rounded-pill bg-persimmon px-1.5 text-[10px] font-bold leading-4 text-white">
                {(draft.onSale ? 1 : 0) + (draft.inStock ? 1 : 0)}
              </span>
            ) : null}
          </button>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-4">
          {group === "more" ? (
            (
              [
                ["onSale", "On sale"],
                ["inStock", "In stock only"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-line text-body"
              >
                {label}
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                  className="h-5 w-5 accent-[color:rgb(var(--persimmon))]"
                />
              </label>
            ))
          ) : (
            <>
              {/* PRICE gets typed bounds as well as the preset bands. Both go
                  through the same exclusive-upper-bound rule, so a $50 item
                  can never land in two ranges at once. */}
              {active?.key === "budget" ? (
                <div className="flex items-center gap-2 py-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Min"
                    value={draft.priceMin ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        priceMin: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="h-10 w-full min-w-0 rounded-[4px] border border-line bg-canvas px-2 text-[13px] text-ink outline-none focus:border-ink/40"
                  />
                  <span aria-hidden className="shrink-0 text-muted">
                    –
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Max"
                    value={draft.priceMax ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        priceMax: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="h-10 w-full min-w-0 rounded-[4px] border border-line bg-canvas px-2 text-[13px] text-ink outline-none focus:border-ink/40"
                  />
                </div>
              ) : null}

              {active?.opts.map((o) => {
                const chosen = (draft[active.key as keyof CategoryFilters] as string[]).includes(o.value);
                const n = countFor(active.key, o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDraft((d) => toggleFilter(d, active.key as never, o.value))}
                    className="flex min-h-[52px] w-full items-center justify-between gap-2 border-b border-line text-left text-body"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {active.key === "color" ? (
                        <span
                          aria-hidden
                          className="h-4 w-4 shrink-0 rounded-pill border border-line"
                          style={{ background: COLOR_DOT[o.label.toLowerCase()] ?? "rgb(var(--line))" }}
                        />
                      ) : null}
                      <span className="truncate">{o.label}</span>
                      {/* What tapping it actually gives you. */}
                      <span className="shrink-0 text-caption text-muted">{n}</span>
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-[12px] ${
                        chosen ? "border-persimmon bg-persimmon text-white" : "border-line"
                      }`}
                    >
                      {chosen ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
