"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ReceiptText, Truck, Store, Package, Users, Gift,
  Wallet, Megaphone, LifeBuoy, UserCog, ScrollText, Settings as Cog,
  PanelLeftClose, PanelLeft, LogOut,
} from "lucide-react";
import type { DashboardRole } from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";

/**
 * V3 shell: 240px sidebar collapsing to 64px, 56px top bar, one flat nav list.
 *
 * The V2 shell grouped items under OPERATE / MONEY / SYSTEM headings. Those
 * headings were noise — thirteen items do not need three labels to be found —
 * so the order itself carries the meaning: what you do all day first, money in
 * the middle, configuration last, with one hairline before the admin-only tail.
 *
 * Every href here is a page that exists. A nav that 404s is worse than a nav
 * that is missing an entry, so new sections are added the day their page lands.
 */

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/gift-cards", label: "Gift cards", icon: Gift },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
];
/** Rendered after a hairline divider. */
const ADMIN_NAV_TAIL: NavItem[] = [
  { href: "/admin/invites", label: "Team", icon: UserCog },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Cog },
];

const STORE_NAV: NavItem[] = [
  { href: "/store", label: "Home", icon: LayoutDashboard },
  { href: "/store/orders", label: "Orders", icon: ReceiptText },
  { href: "/store/products", label: "Products", icon: Package },
  { href: "/store/payouts", label: "Finance", icon: Wallet },
  { href: "/store/reviews", label: "Reviews", icon: LifeBuoy },
];
const STORE_NAV_TAIL: NavItem[] = [
  { href: "/store/profile", label: "Store profile", icon: Store },
  { href: "/store/account", label: "Settings", icon: Cog },
];

const COLLAPSE_KEY = "cado-nav-collapsed";

export function AppShell({
  role,
  storeName,
  children,
}: {
  role: DashboardRole;
  storeName?: string | null;
  children: React.ReactNode;
}) {
  const head = role === "admin" ? ADMIN_NAV : STORE_NAV;
  const tail = role === "admin" ? ADMIN_NAV_TAIL : STORE_NAV_TAIL;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => setMobileNav(false), [pathname]);

  const toggleCollapse = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  // "/admin" and "/store" are exact; everything else matches its subtree, so
  // /admin/orders/123 keeps Orders lit.
  const isActive = (href: string) =>
    href === "/admin" || href === "/store" ? pathname === href : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-card px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
          active ? "bg-ribbon-tint text-ribbon" : "text-secondary hover:bg-surface-sunk hover:text-ink"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        <span className="shrink-0"><Icon size={18} /></span>
        {collapsed ? null : <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const navBody = (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {head.map((i) => <NavLink key={i.href} item={i} />)}
        <div className="my-2 border-t border-line" />
        {tail.map((i) => <NavLink key={i.href} item={i} />)}
      </nav>
      <form action="/logout" method="post" className="px-2 pb-2">
        <button
          type="submit"
          title={collapsed ? "Sign out" : undefined}
          className={`flex w-full items-center gap-3 rounded-card px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-ink ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="shrink-0"><LogOut size={18} /></span>
          {collapsed ? null : "Sign out"}
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-surface py-3 transition-[width] duration-150 md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className={`mb-3 flex items-center px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {collapsed ? null : (
            <div className="min-w-0">
              <BrandLogo variant="ink" height={22} />
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {role === "admin" ? "Back office" : storeName ?? "Your store"}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-card text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {navBody}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:px-4">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-card text-muted hover:bg-surface-sunk hover:text-ink md:hidden"
          >
            <PanelLeft size={18} />
          </button>
          <div className="md:hidden"><BrandLogo variant="ink" height={18} /></div>
          <div className="min-w-0 flex-1"><GlobalSearch role={role} /></div>
          <ThemeToggle />
          <NotificationBell />
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>

      {/* Mobile drawer nav */}
      {mobileNav ? (
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative flex w-64 flex-col border-r border-line bg-surface py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 px-3">
              <BrandLogo variant="ink" height={22} />
              <p className="mt-0.5 text-[11px] text-muted">
                {role === "admin" ? "Back office" : storeName ?? "Your store"}
              </p>
            </div>
            {navBody}
          </div>
        </div>
      ) : null}
    </div>
  );
}
