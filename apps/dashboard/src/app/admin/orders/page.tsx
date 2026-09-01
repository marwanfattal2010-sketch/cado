import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";
import { PageHeading, Panel, StatusPill, Empty, usdShort } from "@/components/v3/primitives";
import { OrderFilters } from "./OrderFilters";

export const dynamic = "force-dynamic";

/**
 * ORDERS (§6) — a dense table, not a wall of cards.
 *
 * Every filter, the search and the paging happen in Postgres
 * (admin_orders_page). Filtering a fetched page in React would look identical
 * on 29 orders and be silently wrong on 29,000 — a search over a truncated page
 * returns "no results" rather than an error, which is the worst kind of bug.
 *
 * 44px rows, 13px text, one line per order. An order that spans several shops
 * shows a pill per shop, because that is the truth: two shops can be at two
 * different stages of the same order.
 *
 * DEFAULT CHOSEN: server-rendered table rather than TanStack. Sorting is by
 * placed-at descending, filters are links, and the page is a server component —
 * so there is no client table library, no hydration cost, and every filter is a
 * shareable URL. If column sorting or reordering is wanted later, that is the
 * point to bring TanStack in.
 */

const PAGE_SIZE = 50;

type StoreLeg = { sub_order_id: string; partner_id: string; partner_name: string; status: string; total: number };
type Row = {
  order_id: string; order_number: string; placed_at: string;
  customer_name: string | null; customer_phone: string | null;
  payment_method: string; payment_status: string;
  total: number; item_count: number; stores: StoreLeg[]; total_count: number;
};

const VIEWS = [
  { key: "all", label: "All", status: null },
  { key: "needs-action", label: "Needs action", status: "pending" },
  { key: "awaiting-pickup", label: "Awaiting pickup", status: "ready" },
  { key: "with-driver", label: "With driver", status: "out_for_delivery" },
  { key: "delivered", label: "Delivered", status: "delivered" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
] as const;

const when = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
const exact = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; store?: string; pay?: string; paid?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;

  const view = VIEWS.find((v) => v.key === sp.view) ?? VIEWS[0];
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const search = (sp.q ?? "").trim();

  const [rowsRes, countsRes, storesRes] = await Promise.all([
    callRpc<Row[]>(supabase, "admin_orders_page", {
      p_search: search || null,
      p_status: view.status,
      p_partner: sp.store || null,
      p_payment_method: sp.pay || null,
      p_payment_status: sp.paid || null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
    callRpc<{ status: string; orders: number }[]>(supabase, "admin_order_status_counts"),
    supabase.from("partners").select("id, name").order("name"),
  ]);

  const rows = rowsRes.data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const counts = new Map((countsRes.data ?? []).map((c) => [c.status, Number(c.orders)]));
  const stores = storesRes.data ?? [];
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  // Keep the current filters when moving between tabs or pages.
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view: sp.view, q: sp.q, store: sp.store, pay: sp.pay, paid: sp.paid, page: sp.page, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    return `/admin/orders${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div>
      <PageHeading
        title="Orders"
        subtitle={
          rowsRes.error
            ? undefined
            : `${Number(total).toLocaleString()} order${Number(total) === 1 ? "" : "s"}${
                view.status || search || sp.store || sp.pay || sp.paid ? " matching these filters" : ""
              }`
        }
      />

      {rowsRes.error ? (
        <p className="mb-4 rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13px] text-status-red">
          Could not load orders: {rowsRes.error.message}
        </p>
      ) : null}

      {/* Saved views, each with a live count */}
      <div className="mb-3 flex flex-wrap gap-1">
        {VIEWS.map((v) => {
          const n = v.status ? counts.get(v.status) : undefined;
          const on = v.key === view.key;
          return (
            <Link
              key={v.key}
              href={qs({ view: v.key === "all" ? undefined : v.key, page: undefined })}
              className={`inline-flex items-center gap-1.5 rounded-card px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                on ? "bg-ribbon-tint text-ribbon" : "border border-line text-secondary hover:text-ink"
              }`}
            >
              {v.label}
              {n != null ? (
                <span className={`tnum ${on ? "text-ribbon" : "text-muted"}`}>{n}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <OrderFilters stores={stores} current={{ q: sp.q, store: sp.store, pay: sp.pay, paid: sp.paid, view: sp.view }} />

      <Panel bodyClass="p-0" className="mt-3">
        {rows.length === 0 ? (
          <Empty
            title={search || view.status ? "No orders match these filters." : "No orders yet."}
            hint={search ? `Nothing found for “${search}”.` : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Placed</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 text-right font-medium">Items</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const legs = o.stores ?? [];
                  return (
                    <tr key={o.order_id} className="h-11 border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                      <td className="px-3">
                        <Link href={`/admin/orders/${o.order_id}`} className="font-medium text-ribbon">
                          #{o.order_number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 text-secondary" title={exact(o.placed_at)}>
                        {when(o.placed_at)}
                      </td>
                      <td className="px-3">
                        <span className="text-ink">{o.customer_name ?? "—"}</span>
                        {o.customer_phone ? (
                          <span className="ml-1.5 text-[11px] text-muted tnum">{o.customer_phone}</span>
                        ) : null}
                      </td>
                      <td className="max-w-[200px] truncate px-3 text-secondary">
                        {legs.length > 1 ? `${legs.length} stores` : legs[0]?.partner_name ?? "—"}
                      </td>
                      <td className="px-3 text-right text-secondary tnum">{o.item_count}</td>
                      <td className="px-3 text-right font-semibold text-ink tnum">{usdShort(o.total)}</td>
                      <td className="whitespace-nowrap px-3">
                        <span className="text-secondary">{o.payment_method === "cod" ? "Cash" : "Whish"}</span>
                        <span
                          className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-pill align-middle ${
                            o.payment_status === "paid" ? "bg-status-green" : "bg-status-amber"
                          }`}
                          title={o.payment_status === "paid" ? "Paid" : "Unpaid"}
                        />
                      </td>
                      <td className="px-3">
                        <div className="flex flex-wrap gap-1">
                          {/* One pill per shop: two shops can be at two stages. */}
                          {legs.map((l) => (
                            <StatusPill key={l.sub_order_id} status={l.status} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-[12px] text-secondary">
          <span className="tnum">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, Number(total))} of{" "}
            {Number(total).toLocaleString()}
          </span>
          <div className="flex gap-1">
            <Link
              href={qs({ page: page - 1 })}
              aria-disabled={page <= 1}
              className={`rounded-card border border-line px-2.5 py-1.5 ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:text-ink"
              }`}
            >
              Previous
            </Link>
            <Link
              href={qs({ page: page + 1 })}
              aria-disabled={page >= pages}
              className={`rounded-card border border-line px-2.5 py-1.5 ${
                page >= pages ? "pointer-events-none opacity-40" : "hover:text-ink"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
