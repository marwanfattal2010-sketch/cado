import Link from "next/link";
import { t, type DictKey } from "@/lib/dictionary";
import type { DashboardRole } from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";

interface NavItem {
  href: string;
  label: DictKey;
}

const STORE_NAV: NavItem[] = [
  { href: "/store", label: "nav.overview" },
  { href: "/store/orders", label: "nav.orders" },
  { href: "/store/products", label: "nav.products" },
  { href: "/store/payouts", label: "nav.payouts" },
  { href: "/store/account", label: "nav.account" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "nav.overview" },
  { href: "/admin/orders", label: "nav.orders" },
  { href: "/admin/stores", label: "nav.partners" },
  { href: "/admin/products", label: "nav.products" },
  { href: "/admin/settings", label: "nav.settings" },
];

/**
 * Mobile-first app shell. Store owners live on their phones, so the primary
 * navigation is a bottom bar on small screens and a left rail on wide ones.
 */
export function AppShell({
  role,
  storeName,
  children,
}: {
  role: DashboardRole;
  storeName?: string | null;
  children: React.ReactNode;
}) {
  const nav = role === "admin" ? ADMIN_NAV : STORE_NAV;

  return (
    <div className="min-h-screen md:flex">
      {/* Wide-screen left rail */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface px-4 py-6 md:block">
        <Brand storeName={storeName} role={role} />
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-card px-3 py-2 text-sm font-medium text-ink hover:bg-surface-sunk"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <SignOut className="mt-8" />
      </aside>

      <div className="flex-1 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Brand storeName={storeName} role={role} compact />
          <SignOut compact />
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 px-2 py-3 text-center text-xs font-medium text-ink"
          >
            {t(item.label)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Brand({
  storeName,
  role,
  compact,
}: {
  storeName?: string | null;
  role: DashboardRole;
  compact?: boolean;
}) {
  return (
    <div>
      {/* Official logo, ink variant — the shell is cream/surface. */}
      <BrandLogo variant="ink" height={compact ? 24 : 30} />
      {!compact && (
        <p className="mt-1.5 text-xs text-muted">
          {role === "admin" ? "CADO staff" : storeName ?? "Your store"}
        </p>
      )}
    </div>
  );
}

function SignOut({ compact, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <form action="/logout" method="post" className={className}>
      <button
        type="submit"
        className="rounded-pill px-3 py-2 text-sm font-medium text-muted hover:text-ribbon"
      >
        {compact ? t("nav.signout") : `↩ ${t("nav.signout")}`}
      </button>
    </form>
  );
}
