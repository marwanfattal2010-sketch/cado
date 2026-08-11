import { Sheet, RemovableChip } from "./ui";
import { SlidersIcon, SortIcon } from "./Icons";
import type { ActiveFilterChip, CategoryFilters } from "./CategoryFilterPanel";

/**
 * The one control bar above every product grid — category, search results and
 * gift-finder results all render this exact component.
 *
 * Two buttons and nothing else. The loose chip rails that used to sit here
 * (audience chips, then category chips, then a "Sort: Suggested" pill) were
 * three rows of controls competing for the same glance, and on a 375px screen
 * they pushed the first product below the fold. Everything now lives behind
 * Filter; sort is its own small sheet.
 *
 * What the person chose comes back UNDER the bar as removable chips, so the
 * bar itself never changes height and the grid never moves.
 */

export type SortValue = "suggested" | "price_asc" | "price_desc" | "newest";

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function sortLabel(sort: SortValue): string {
  return SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Suggested";
}

type SortableProduct = {
  price?: number | string | null;
  created_at?: string | null;
  is_trending?: boolean | null;
};

/**
 * Sort is an ordering, never a filter — nothing here removes a product.
 *
 * "Suggested" is deliberately NOT a popularity rank. There is no sales or
 * view data the storefront can read under RLS, so inventing "most popular"
 * would be a fake trust signal. It means: editorially flagged first, then
 * whatever order the screen already had (curated list, relevance, newest).
 * Array.prototype.sort is stable, so that incoming order survives.
 */
export function sortProducts<T extends SortableProduct>(list: T[], sort: SortValue): T[] {
  const out = list.slice();
  switch (sort) {
    case "price_asc":
      out.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price_desc":
      out.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "newest":
      out.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
      break;
    case "suggested":
      out.sort((a, b) => Number(!!b.is_trending) - Number(!!a.is_trending));
      break;
  }
  return out;
}

const BUTTON =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-line bg-surface px-4 text-caption font-medium text-ink transition-all duration-press ease-out active:scale-[0.97]";

export function FilterBar({
  activeCount,
  sort,
  onOpenFilter,
  onOpenSort,
}: {
  activeCount: number;
  sort: SortValue;
  onOpenFilter: () => void;
  onOpenSort: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenFilter}
        aria-haspopup="dialog"
        aria-label={activeCount ? `Filter, ${activeCount} applied` : "Filter"}
        className={BUTTON}
      >
        <SlidersIcon className="h-[18px] w-[18px]" />
        Filter
        {activeCount ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold text-inverse">
            {activeCount}
          </span>
        ) : null}
      </button>

      {/* A hairline divider rather than a gap, so the two read as one control
          bar instead of two unrelated pills. */}
      <span aria-hidden className="h-6 w-px shrink-0 bg-line" />

      {/* The label stays the bare word "Sort" — the old "Sort: Suggested"
          pill spent half the bar's width restating a default nobody set.
          The current ordering is still announced, on the accessible name. */}
      <button
        type="button"
        onClick={onOpenSort}
        aria-haspopup="dialog"
        aria-label={`Sort, currently ${sortLabel(sort)}`}
        className={BUTTON}
      >
        <SortIcon className="h-[18px] w-[18px]" />
        Sort
      </button>
    </div>
  );
}

/**
 * The applied filters, as removable chips. Tapping the ✕ updates the grid
 * immediately — no re-opening the sheet — and the trailing "Clear" drops all
 * of them at once.
 */
export function ActiveFilterChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: ActiveFilterChip[];
  onRemove: (key: keyof CategoryFilters, value?: string) => void;
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <RemovableChip key={c.id} onRemove={() => onRemove(c.key, c.value)}>
          {c.label}
        </RemovableChip>
      ))}
      {chips.length > 1 ? (
        <button
          type="button"
          onClick={onClear}
          className="tap-44 inline-flex h-[32px] items-center rounded-pill px-2 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Four rows, one tap, closes on choose. A sort menu you have to Apply is a
 *  menu with an extra step for no reason. */
export function SortSheet({
  open,
  onClose,
  sort,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  sort: SortValue;
  onChange: (next: SortValue) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Sort">
      <div role="radiogroup" aria-label="Sort gifts" className="flex flex-col">
        {SORT_OPTIONS.map((o) => {
          const selected = o.value === sort;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onChange(o.value);
                onClose();
              }}
              className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line text-left text-body last:border-b-0"
            >
              <span className={selected ? "font-medium text-ink" : "text-ink"}>{o.label}</span>
              <span
                aria-hidden
                className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-pill border text-[12px] leading-none ${
                  selected ? "border-primary bg-primary text-inverse" : "border-line"
                }`}
              >
                {selected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
