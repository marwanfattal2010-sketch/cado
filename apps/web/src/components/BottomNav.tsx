import { NavLink } from "react-router-dom";
import { AccountIcon, GiftIcon, HeartIcon, HomeIcon, OrdersIcon } from "./Icons";

// No Search tab — search lives inline on the homepage, where people already
// look for it, and a fifth destination here would crowd the row.
// Occasions lost its tab to Favorites; it stays reachable from the homepage
// sections and the footer.
const TABS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/wishlist", label: "Favorites", Icon: HeartIcon, end: false },
  { to: "/gift-cards", label: "Gift Cards", Icon: GiftIcon, end: false },
  { to: "/orders", label: "Orders", Icon: OrdersIcon, end: false },
  { to: "/account", label: "Account", Icon: AccountIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide transition-all duration-150 active:scale-90 ${
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
