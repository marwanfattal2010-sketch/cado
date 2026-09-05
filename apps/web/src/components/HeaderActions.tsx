import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePoints, useUnreadCount } from "../hooks/useHeaderData";

/**
 * The points pill and the bell (spec 1.11).
 *
 * Both show REAL NUMBERS or nothing. A signed-out shopper sees "0 pts",
 * which is true — they have none — rather than "Earn points", which was an
 * invitation dressed up as a balance;
 * because zero is what they have and a welcome balance nobody earned would be
 * the first thing the app lies about. The bell's badge is hidden at zero
 * rather than showing a 0 — a badge means "something is waiting".
 */

export function PointsPill() {
  const { session } = useAuth();
  const points = usePoints();

  if (!session) {
    return (
      <Link
        to="/login"
        className="tap-44 flex shrink-0 items-center gap-1 rounded-pill border border-line bg-white px-2.5 py-1.5 text-[13px] font-semibold text-header-fg"
      >
        <span aria-hidden className="text-persimmon">★</span>
        0 pts
      </Link>
    );
  }

  return (
    <Link
      to="/points"
      aria-label={`${points.data ?? 0} points`}
      className="tap-44 flex shrink-0 items-center gap-1 rounded-pill border border-line bg-white px-2.5 py-1.5 text-[13px] font-semibold text-header-fg"
    >
      <span aria-hidden className="text-persimmon">★</span>
      {points.data ?? 0} pts
    </Link>
  );
}

export function NotificationBell() {
  const { session } = useAuth();
  const unread = useUnreadCount();

  return (
    <Link
      to={session ? "/notifications" : "/login"}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="tap-44 relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-header-fg transition hover:bg-header-fg/[0.06]"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" strokeLinejoin="round" />
        <path d="M10 20a2.2 2.2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-header-badge px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
