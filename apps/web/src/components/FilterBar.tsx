import { RemovableChip } from "./ui";
import type { ActiveFilterChip, CategoryFilters } from "./CategoryFilterPanel";

/*
 * What is left of this file.
 *
 * The Filter and Sort pills, SortSheet, SortValue, SORT_OPTIONS, sortLabel
 * and sortProducts are deleted — every screen now renders BrowseFilterBar and
 * BrowseFilterPanel, which sort through sortBrowse. Only the removable chips
 * survived the replacement, because the new bar shows a selection inside its
 * own chip and the applied set still belongs above the grid.
 */

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
          className="tap-44 inline-flex h-[32px] items-center px-2 text-caption font-medium text-ink underline underline-offset-4"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
