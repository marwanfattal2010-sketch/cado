import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const BASE =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-all duration-fast ease active:scale-[0.96]";

// Active state is the one place a chip may use ribbon.
const REST = "bg-surface-sunk text-ink hover:bg-line";
const ACTIVE = "bg-ribbon text-inverse";

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
}: Omit<Props, "onClick"> & { to: string }) {
  return (
    <Link to={to} className={`${BASE} ${active ? ACTIVE : REST} ${className}`}>
      {children}
    </Link>
  );
}
