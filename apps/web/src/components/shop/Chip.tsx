/**
 * The one chip in the app.
 *
 * Used by the applied-chip row on the results page, the occasion row on a
 * category tab, and any inline filter chip. One component means a selected
 * chip can never look like a button on one screen and a tag on another.
 *
 * Unselected is cream with a near-black hairline; selected is a persimmon
 * fill with white text and a white × inside it, so a selection can always be
 * undone exactly where it was made. Press is a 120ms scale — no colour flash,
 * because a chip that changes colour on touch reads as already selected.
 */
export function Chip({
  label,
  selected = false,
  onClick,
  removable = false,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  /** Shows the × — set on applied chips and on selected inline chips. */
  removable?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 text-[13px] font-medium transition-transform duration-press ease-out active:scale-[0.97] ${
        disabled ? "opacity-40" : ""
      } ${
        selected
          ? "bg-persimmon text-white"
          : "border border-ink/[0.12] bg-canvas text-ink"
      }`}
    >
      {label}
      {removable ? (
        <span aria-hidden className={selected ? "text-white/90" : "text-muted"}>
          ×
        </span>
      ) : null}
    </button>
  );
}
