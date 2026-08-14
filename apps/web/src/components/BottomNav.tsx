import { NavLink } from "react-router-dom";
import { AccountIcon, GiftIcon, HeartIcon, HomeIcon, OrdersIcon } from "./Icons";
import { useT } from "../lib/i18n";

// No Search tab — search lives inline on the home page, where people already
// look for it, and another destination here would crowd the row.
// Occasions lost its tab to Favorites; it stays reachable from the home page
// sections and the footer.
//
// No Shop tab either, and that is not an omission: the Shop page IS the home
// page now, so a second tab pointing at it was the same destination twice.
const TABS = [
  { to: "/", key: "nav.home", label: "Home", Icon: HomeIcon, end: true },
  { to: "/gift-cards", key: "nav.giftCards", label: "Gift Cards", Icon: GiftIcon, end: false },
  { to: "/wishlist", key: "nav.favorites", label: "Favorites", Icon: HeartIcon, end: false },
  { to: "/orders", key: "nav.orders", label: "Orders", Icon: OrdersIcon, end: false },
  { to: "/account", key: "nav.account", label: "Account", Icon: AccountIcon, end: false },
];

export function BottomNav() {
  const { t } = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, key, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              // whitespace-nowrap is the one thing kept from the six-tab
              // layout: at five tabs "Gift Cards" fits on one line at every
              // width, but wrapping is what grew the bar from 64px to 81px
              // and shoved every page's bottom padding out of step, so it is
              // cheap insurance against the next label.
              // The active tab is Persimmon. The nav is one control, so this
              // applies to every tab in it — a bar where some tabs go orange
              // and others go black reads as a bug, not as restraint.
              `flex min-h-[56px] flex-1 flex-col items-center gap-1 whitespace-nowrap py-2.5 text-[11px] font-medium tracking-wide transition-all duration-150 active:scale-90 ${
                isActive ? "text-persimmon" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-[22px] w-[22px]" filled={isActive} />
                <span>{t(key, label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
