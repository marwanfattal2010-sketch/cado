import { NavLink } from "react-router-dom";
import { AccountIcon, GiftIcon, HeartIcon, HomeIcon, OrdersIcon, ShopIcon } from "./Icons";

// No Search tab — search lives inline on the homepage, where people already
// look for it, and another destination here would crowd the row.
// Occasions lost its tab to Favorites; it stays reachable from the homepage
// sections and the footer.
//
// Shop sits second, right after Home: it is the browse path, so it belongs
// next to the thing people land on, not buried at the end. Six is the ceiling
// for this row at 375px — "Gift Cards" is the widest label and it only just
// fits, so a seventh tab means dropping one first.
const TABS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/shop", label: "Shop", Icon: ShopIcon, end: false },
  { to: "/gift-cards", label: "Gift Cards", Icon: GiftIcon, end: false },
  { to: "/wishlist", label: "Favorites", Icon: HeartIcon, end: false },
  { to: "/orders", label: "Orders", Icon: OrdersIcon, end: false },
  { to: "/account", label: "Account", Icon: AccountIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] sm:px-2">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              // whitespace-nowrap and the smaller size under 360px are what
              // keep six tabs on one line. Without them "Gift Cards" wraps on
              // a 320px phone and the whole bar grows from 64px to 81px,
              // shoving every page's bottom padding out of step.
              `flex min-h-[56px] flex-1 flex-col items-center gap-1 whitespace-nowrap py-2.5 text-[10px] font-medium tracking-tight transition-all duration-150 active:scale-90 min-[360px]:text-[11px] min-[360px]:tracking-wide ${
                isActive ? "text-ink" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-[22px] w-[22px]" filled={isActive} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
