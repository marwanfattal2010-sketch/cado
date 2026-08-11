import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// h-11 = 44px, the minimum tap target. Chips are the densest interactive
// thing on the site, so they set the floor for everything else.
const BASE =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-pill px-4 text-body font-medium transition-all duration-press ease-out active:scale-[0.97]";

// Two states, one rule, everywhere: unselected is white with a hairline
// border, selected is a charcoal fill with cream text. No hue is involved
// in either — a chip is navigation, not an accent.
const REST = "border border-line bg-surface text-ink hover:bg-surface-sunk";
const ACTIVE = "border border-primary bg-primary text-inverse";

type Props = {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * Filter chips apply instantly — there is deliberately no Apply button and
 * no form submit here. That immediacy is most of what makes browsing feel
 * fast, so callers should update state directly in onClick.
 */
export function Chip({ active = false, onClick, className = "", children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${BASE} ${active ? ACTIVE : REST} ${className}`}
    >
      {children}
    </button>
  );
}

export function ChipLink({
  to,
  active = false,
  className = "",
  children,
  onPointerEnter,
}: Omit<Props, "onClick"> & { to: string; onPointerEnter?: () => void }) {
  return (
    <Link
      to={to}
      onPointerEnter={onPointerEnter}
      className={`${BASE} ${active ? ACTIVE : REST} ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * A removable filter summary — the small chips under a page title saying
 * what is currently narrowing the grid. Tapping it clears that one filter,
 * so the ✕ is the whole point. `.tap-44` lifts the 32px pill to a legal
 * touch target without making the row bulky.
 */
export function RemovableChip({ onRemove, children }: { onRemove: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      /* h-[32px], not h-8: this project's spacing scale maps 8 to 64px. */
      className="tap-44 inline-flex h-[32px] shrink-0 items-center gap-1.5 rounded-pill border border-primary bg-primary px-3 text-caption font-medium text-inverse transition-all duration-press ease-out active:scale-[0.97]"
    >
      {children}
      <span aria-hidden className="text-[13px] leading-none opacity-70">
        ✕
      </span>
      <span className="sr-only">Remove filter</span>
    </button>
  );
}
