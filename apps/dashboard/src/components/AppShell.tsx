"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ReceiptText, Truck, Store, Package, Users, Gift,
  Wallet, Megaphone, LifeBuoy, UserCog, ScrollText, Settings as Cog,
  PanelLeftClose, PanelLeft, LogOut, UserPlus, ChevronDown,
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

/**
 * PRODUCTS IS NOT HERE, deliberately (V4 §5). A product belongs to a shop, and
 * a flat list of every product across every shop is a page nobody can act on —
 * you always arrive at it wanting one store's catalogue. Products now live on
 * the store page's Products tab, /admin/products redirects to Stores, and the
 * top-bar search still finds any product by name.
 */
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/stores", label: "Stores", icon: Store },
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
  userName,
  userEmail,
  children,
}: {
  role: DashboardRole;
  storeName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
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

      {/*
       * Where the reference puts "Upgrade to Pro". CADO has nothing to upsell
       * its own staff, so the slot carries the thing an admin most often comes
       * to this dashboard to do — and it goes to the real invite flow, not a
       * decorative banner.
       */}
      {!collapsed && role === "admin" ? (
        <div className="px-2 pb-2">
          <Link
            href="/admin/invites"
            className="tint-card block rounded-card p-3 transition-transform hover:-translate-y-px"
            style={{ ["--tint" as string]: "var(--ribbon)" }}
          >
            <span className="tint-chip mb-2 flex h-8 w-8 items-center justify-center rounded-[10px]">
              <UserPlus size={16} />
            </span>
            <p className="text-[13px] font-semibold text-ink">Invite a store owner</p>
            <p className="mt-0.5 text-[11.5px] leading-4 text-secondary">
              Add a shop and its login in one step.
            </p>
          </Link>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-surface py-3 transition-[width] duration-150 md:flex ${
          collapsed ? "w-16" : "w-[232px]"
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
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:px-5">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-muted hover:bg-surface-sunk hover:text-ink md:hidden"
          >
            <PanelLeft size={18} />
          </button>
          <div className="md:hidden"><BrandLogo variant="ink" height={18} /></div>
          <div className="min-w-0 flex-1"><GlobalSearch role={role} /></div>
          <NotificationBell />
          <ThemeToggle />
          <UserMenu name={userName} email={userEmail} role={role} />
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-5">{children}</main>
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

/**
 * Avatar + name + role, with the menu the reference has in its top-right.
 * Initials on persimmon rather than a stock photo: a fake face is still fake
 * content, and this is a real person's account.
 */
function UserMenu({
  name,
  email,
  role,
}: {
  name?: string | null;
  email?: string | null;
  role: DashboardRole;
}) {
  const [open, setOpen] = useState(false);
  const label = name?.trim() || email?.split("@")[0] || "Account";
  const initials =
    label
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-pill px-1 py-1 transition-colors hover:bg-surface-sunk"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-ribbon text-[12px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block max-w-[140px] truncate text-[13px] font-medium text-ink">{label}</span>
          <span className="block text-[11px] text-muted">{role === "admin" ? "Owner" : "Store"}</span>
        </span>
        <ChevronDown size={14} className="hidden text-muted lg:block" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-card border border-line bg-surface shadow-lift"
          >
            <div className="border-b border-line px-3 py-2.5">
              <p className="truncate text-[13px] font-medium text-ink">{label}</p>
              {email ? <p className="truncate text-[11.5px] text-muted">{email}</p> : null}
            </div>
            <Link
              href={role === "admin" ? "/admin/settings" : "/store/account"}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-[13px] text-secondary transition-colors hover:bg-surface-sunk hover:text-ink"
            >
              Settings
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-secondary transition-colors hover:bg-surface-sunk hover:text-ink"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
