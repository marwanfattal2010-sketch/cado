import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCart } from "../hooks/useCart";
import { usePoints, useUnreadCount } from "../hooks/useHeaderData";
import { GiftBagIcon, StarIcon } from "./Icons";

/**
 * THE THREE CONTROLS ON THE RIGHT OF EVERY HEADER.
 *
 * One size, one shape: 40px tall, 10px corners. The bell and the points pill
 * are outlined and white; the cart is FILLED persimmon, because it is the only
 * one of the three that is a destination rather than a status. On a header
 * that is otherwise white and ink, that fill is the single thing the eye lands
 * on — which is right, since a cart with something in it is the most
 * consequential thing up there.
 *
 * Both the shop header and the tab header use these, so Account and Orders get
 * the same bell and cart as Home rather than their own smaller copies.
 *
 * REAL NUMBERS OR NOTHING. The points pill shows "0 pts" for a signed-out
 * shopper, because zero is what they have. The bell's badge is hidden at zero
 * rather than showing a 0 — a badge means "something is waiting" — and the
 * cart shows its icon alone when empty.
 */

/** The shape the two outlined controls share. */
const BOX =
  "flex h-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-white";

export function PointsPill() {
  const { session } = useAuth();
  const points = usePoints();
  const value = session ? (points.data ?? 0) : 0;

  return (
    <Link
      to={session ? "/points" : "/login"}
      aria-label={`${value} points`}
      className={`${BOX} gap-1 px-3 text-[13px] font-semibold text-header-fg`}
    >
      <StarIcon className="h-4 w-4 text-persimmon" filled />
      {value} pts
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
      className={`${BOX} relative w-10 text-header-fg`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[21px] w-[21px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" strokeLinejoin="round" />
        <path d="M10 20a2.2 2.2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-persimmon px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The cart, and the COUNT SITS INSIDE the box beside the icon rather than as a
 * bubble hanging off its corner. A badge on a filled square is a dot on a dot,
 * and at 40px there is room for the number itself. Empty, the box is square
 * and shows only the bag.
 */
export function CartButton({ storeId }: { storeId?: string }) {
  const cart = useCart();
  const items = cart.data ?? [];
  const onStore = !!storeId;

  /*
   * Inside a store the basket counts that store's ITEMS; everywhere else it
   * counts CARTS. A driver goes to one shop, so three items from one shop is
   * one journey and one number worth knowing, while one item each from three
   * shops is three separate deliveries.
   */
  const count = onStore
    ? items
        .filter((i) => i.product?.partner?.id === storeId)
        .reduce((sum, i) => sum + (i.quantity ?? 0), 0)
    : new Set(items.map((i) => i.product?.partner?.id).filter(Boolean)).size;

  return (
    <Link
      to={onStore ? `/cart?store=${storeId}` : "/cart"}
      aria-label={
        onStore
          ? `Cart, ${count} item${count === 1 ? "" : "s"}`
          : `Your carts, ${count} cart${count === 1 ? "" : "s"}`
      }
      className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-[10px] bg-persimmon text-white transition-transform duration-press ease-out active:scale-[0.96] ${
        count > 0 ? "px-2.5" : "w-10"
      }`}
    >
      <GiftBagIcon className="h-[21px] w-[21px]" />
      {count > 0 ? (
        <span key={count} className="animate-bump text-[13px] font-bold leading-none">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
