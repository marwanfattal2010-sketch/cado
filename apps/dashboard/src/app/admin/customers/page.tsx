import Link from "next/link";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";
import { Initials } from "@/components/v3/tint";
import { CustomerSearch } from "./CustomerSearch";

export const dynamic = "force-dynamic";

/**
 * CUSTOMERS (V4 §6) — name, phone, city, orders, spend, last order.
 *
 * Everything comes from admin_customers_list(): profiles, orders and addresses
 * are all closed to admins by RLS, so a direct query would return an empty
 * table and look like CADO has no customers.
 *
 * The list shows a customer's CITY but not their street. Full address detail is
 * on the one-person page, where an admin has actually navigated to that person —
 * a table of everyone's doorsteps is not something to leave lying open.
 */

const PAGE_SIZE = 50;

type Row = {
  customer_id: string; full_name: string; phone: string | null; city: string | null;
  orders: number; total_spent: number; last_order: string | null; joined: string;
  total_count: number;
};

const usd = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { data, error } = await callRpc<Row[]>(supabase, "admin_customers_list", {
    p_search: (sp.q ?? "").trim() || null,
    p_city: sp.city || null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, city: sp.city, page: sp.page, ...over })) if (v) p.set(k, String(v));
    return `/admin/customers${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-8 text-ink">Customers</h1>
          <p className="mt-0.5 text-[13.5px] text-secondary tnum">
            {total.toLocaleString()} customer{total === 1 ? "" : "s"}
            {sp.q ? " matching your search" : ""}
          </p>
        </div>
        <CustomerSearch initial={sp.q ?? ""} />
      </div>

      {error ? (
        <p className="mb-4 rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13px] text-status-red">
          Could not load customers: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-surface-sunk text-muted">
              <Users size={22} />
            </span>
            <p className="text-[13.5px] text-secondary">
              {sp.q ? `Nobody matches “${sp.q}”.` : "No customers yet."}
            </p>
            {sp.q ? <Link href="/admin/customers" className="text-[13px] font-semibold text-ribbon">Clear search</Link> : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11.5px] text-muted">
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 font-medium">City</th>
                  <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total spent</th>
                  <th className="px-3 py-2.5 font-medium">Last order</th>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.customer_id} className="h-12 border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                    <td className="px-4">
                      <Link href={`/admin/customers/${c.customer_id}`} className="flex items-center gap-2.5">
                        <Initials name={c.full_name} size={30} />
                        <span className="font-medium text-ink">{c.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-3 text-secondary tnum">{c.phone ?? "—"}</td>
                    <td className="px-3 text-secondary">{c.city ?? "—"}</td>
                    <td className="px-3 text-right text-ink tnum">{c.orders}</td>
                    <td className="px-3 text-right font-semibold text-ink tnum">{usd(c.total_spent)}</td>
                    <td className="px-3 text-secondary">{date(c.last_order)}</td>
                    <td className="px-3 text-secondary">{date(c.joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-secondary">
          <span className="tnum">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <Link href={qs({ page: page - 1 })} className={`rounded-[10px] border border-line px-2.5 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Previous</Link>
            <Link href={qs({ page: page + 1 })} className={`rounded-[10px] border border-line px-2.5 py-1.5 ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>Next</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
