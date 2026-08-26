"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { DashboardRole } from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";

/**
 * The V2 shell: grouped left sidebar on desktop, bottom bar + "More" sheet on
 * mobile (Marwan runs this from his phone), top strip with the role and sign
 * out. Persimmon marks exactly one thing: where you are.
 *
 * Every href below is a page that exists. The spec's full IA lists sections
 * that are not built yet (Marketing, Reports, Delivery…) — those are OMITTED
 * rather than rendered as dead links, and get added here the day their page
 * lands. A professional tool never 404s from its own navigation.
 */

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { heading?: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "Overview", icon: "◧" }],
  },
  {
    heading: "Operate",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "▤" },
      { href: "/admin/stores", label: "Stores", icon: "⌂" },
      { href: "/admin/products", label: "Products", icon: "▦" },
      { href: "/admin/customers", label: "Customers", icon: "◉" },
    ],
  },
  {
    heading: "Money",
    items: [
      { href: "/admin/finance", label: "Finance", icon: "◈" },
      { href: "/admin/gift-cards", label: "Gift cards", icon: "▣" },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/audit", label: "Audit log", icon: "≡" },
      { href: "/admin/invites", label: "Team", icon: "✉" },
      { href: "/admin/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

const STORE_NAV: NavGroup[] = [
  {
    items: [
      { href: "/store", label: "Overview", icon: "◧" },
      { href: "/store/orders", label: "Orders", icon: "▤" },
      { href: "/store/products", label: "Products", icon: "▦" },
      { href: "/store/payouts", label: "Earnings", icon: "◈" },
      { href: "/store/account", label: "Settings", icon: "⚙" },
    ],
  },
];

/** The five slots the mobile bottom bar holds; the rest go in the sheet. */
const MOBILE_PRIMARY = 4;

export function AppShell({
  role,
  storeName,
  children,
}: {
  role: DashboardRole;
  storeName?: string | null;
  children: React.ReactNode;
}) {
  const groups = role === "admin" ? ADMIN_NAV : STORE_NAV;
  const flat = groups.flatMap((g) => g.items);
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" || href === "/store" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="px-2">
          <BrandLogo variant="ink" height={26} />
          <p className="mt-1 text-[11px] text-muted">
            {role === "admin" ? "CADO admin" : storeName ?? "Your store"}
          </p>
        </div>
        <nav className="mt-6 flex-1 space-y-4 overflow-y-auto">
          {groups.map((g, i) => (
            <div key={i}>
              {g.heading ? (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {g.heading}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-card px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                      isActive(item.href)
                        ? "bg-ribbon-tint text-ribbon"
                        : "text-ink hover:bg-surface-sunk"
                    }`}
                  >
                    <span aria-hidden className="w-4 text-center text-xs">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <SignOut />
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <div>
            <BrandLogo variant="ink" height={22} />
            <p className="text-[10px] text-muted">{role === "admin" ? "CADO admin" : storeName ?? ""}</p>
          </div>
          <SignOut compact />
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>

      {/* Mobile bottom bar: first N items + More */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface md:hidden">
        {flat.slice(0, MOBILE_PRIMARY).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium ${
              isActive(item.href) ? "text-ribbon" : "text-muted"
            }`}
          >
            <span aria-hidden className="text-sm leading-none">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
        {flat.length > MOBILE_PRIMARY ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium text-muted"
          >
            <span aria-hidden className="text-sm leading-none">
              ⋯
            </span>
            More
          </button>
        ) : null}
      </nav>

      {/* The More sheet */}
      {moreOpen ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-surface p-4 pb-8"
            role="dialog"
            aria-label="More sections"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {flat.slice(MOBILE_PRIMARY).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 rounded-card px-2 py-3 text-xs font-medium ${
                    isActive(item.href) ? "bg-ribbon-tint text-ribbon" : "text-ink hover:bg-surface-sunk"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignOut({ compact }: { compact?: boolean }) {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className="rounded-pill px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ribbon"
      >
        {compact ? "Sign out" : "↩ Sign out"}
      </button>
    </form>
  );
}
