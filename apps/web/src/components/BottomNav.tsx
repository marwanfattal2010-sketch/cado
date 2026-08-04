import { NavLink } from "react-router-dom";
import { AccountIcon, GiftIcon, HomeIcon, OrdersIcon, SearchIcon } from "./Icons";

const TABS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/search", label: "Search", Icon: SearchIcon, end: false },
  { to: "/gift-cards", label: "Gift Cards", Icon: GiftIcon, end: false },
  { to: "/orders", label: "Orders", Icon: OrdersIcon, end: false },
  { to: "/account", label: "Account", Icon: AccountIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors ${
                isActive ? "text-ink" : "text-ink/40"
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
