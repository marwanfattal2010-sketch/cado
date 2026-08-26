import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  KpiCard,
  StatusPill,
  DateRangeBar,
  resolveRange,
  BarChart,
  Card,
  EmptyStateV2,
  usd,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Admin Overview V2.
 *
 * Every figure is a real query for the CHOSEN range, and every delta is that
 * same query run for the previous equal period — a delta against nothing is
 * hidden, not invented. Money comes from order rows and commission SNAPSHOTS
 * (what place_order wrote at purchase time), never recomputed prices.
 *
 * The daily chart uses admin_finance_breakdown (migration 0068). Until that
 * is applied the chart section says so plainly instead of faking a series.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { range } = await searchParams;
  const r = resolveRange(range);

  /** Orders and GMV for one window — one round trip per period. */
  async function window_(from: Date, to: Date) {
    const { data } = await supabase
      .from("orders")
      .select("id, total, delivery_fee, customer_id, created_at")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .limit(5000);
    const rows = data ?? [];
    return {
      orders: rows.length,
      gmv: rows.reduce((s, o) => s + Number(o.total ?? 0), 0),
      fees: rows.reduce((s, o) => s + Number(o.delivery_fee ?? 0), 0),
      customers: new Set(rows.map((o) => o.customer_id)).size,
    };
  }

  const [cur, prev] = await Promise.all([window_(r.from, r.to), window_(r.prevFrom, r.prevTo)]);

  // Commission for the window, from the per-line snapshots 0031 added.
  const { data: commRows } = await supabase
    .from("order_items")
    .select("commission_amount_snapshot, sub_order:sub_orders!inner(status, order:orders!inner(created_at))")
    .gte("sub_order.order.created_at", r.from.toISOString())
    .lt("sub_order.order.created_at", r.to.toISOString())
    .neq("sub_order.status", "cancelled")
    .limit(5000);
  const commission = (commRows ?? []).reduce((s, x) => s + Number(x.commission_amount_snapshot ?? 0), 0);

  const delta = (now: number, before: number) =>
    before > 0 ? ((now - before) / before) * 100 : null;

  // Daily series — 0068's function; absent pre-migration.
  const daily = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }).rpc("admin_finance_breakdown", {
    p_from: r.from.toISOString().slice(0, 10),
    p_to: r.to.toISOString().slice(0, 10),
  });
  const dailyRows = (daily.data ?? []) as unknown as { day: string; gmv: number }[];

  /* ---------------- needs attention: each row is a real condition -------- */

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const [{ data: stale }, { data: pendingApps }, { data: oosVisible }] = await Promise.all([
    supabase
      .from("sub_orders")
      .select("id, order_id, status, created_at, partner:partners(name)")
      .eq("status", "pending")
      .lt("created_at", fifteenMinAgo)
      .limit(10),
    supabase.from("partners").select("id, name").eq("status", "pending").limit(10),
    supabase
      .from("products")
      .select("id, title, partner:partners(name)")
      .eq("is_active", true)
      .eq("stock_quantity", 0)
      .limit(10),
  ]);

  const { data: recent } = await supabase
    .from("orders")
    .select("id, order_number, total, created_at, recipient_name, sub_orders(status, partner:partners(name))")
    .order("created_at", { ascending: false })
    .limit(10);

  const attention = [
    ...(stale ?? []).map((s) => ({
      label: `Order unconfirmed ${Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000)} min — ${
        (s.partner as { name?: string } | null)?.name ?? "store"
      }`,
      href: `/admin/orders/${s.order_id}`,
    })),
    ...(pendingApps ?? []).map((p) => ({
      label: `Store application: ${p.name}`,
      href: `/admin/stores`,
    })),
    ...(oosVisible ?? []).map((p) => ({
      label: `Out of stock but visible: ${p.title}`,
      href: `/admin/products`,
    })),
  ];

  return (
    <div>
      <PageHeader title="Overview" action={<DateRangeBar current={r.key} basePath="/admin" />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Revenue (GMV)" value={usd(cur.gmv)} delta={delta(cur.gmv, prev.gmv)} />
        <KpiCard label="Orders" value={String(cur.orders)} delta={delta(cur.orders, prev.orders)} />
        <KpiCard label="Commission" value={usd(commission)} hint="from purchase-time snapshots" />
        <KpiCard label="Delivery fees" value={usd(cur.fees)} delta={delta(cur.fees, prev.fees)} />
        <KpiCard
          label="Avg order value"
          value={cur.orders > 0 ? usd(cur.gmv / cur.orders) : "—"}
          hint={cur.orders === 0 ? "no orders in range" : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Revenue by day" className="lg:col-span-2">
          {daily.error ? (
            <p className="py-6 text-center text-sm text-muted">
              Daily series needs migration 0068 (admin_finance_breakdown). The totals above are live.
            </p>
          ) : dailyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No orders in this range.</p>
          ) : (
            <BarChart
              points={dailyRows.map((d) => ({
                label: new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                value: Number(d.gmv),
              }))}
              formatValue={(v) => usd(v)}
            />
          )}
        </Card>

        <Card title="Needs attention">
          {attention.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing waiting. All clear.</p>
          ) : (
            <ul className="space-y-1">
              {attention.slice(0, 8).map((a, i) => (
                <li key={i}>
                  <Link
                    href={a.href}
                    className="block rounded-card px-2 py-1.5 text-sm text-ink transition-colors hover:bg-status-amber-tint"
                  >
                    <span className="mr-1.5 text-status-amber">●</span>
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent orders" className="mt-4" action={<Link href="/admin/orders" className="text-xs font-medium text-ribbon">All orders →</Link>}>
        {(recent ?? []).length === 0 ? (
          <EmptyStateV2 title="No orders yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Placed</th>
                  <th className="py-2 pr-3">Store</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((o) => {
                  const sub = (o.sub_orders as { status: string; partner: { name: string } | null }[] | null)?.[0];
                  return (
                    <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-ribbon">
                          #{o.order_number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">
                        {new Date(o.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">{sub?.partner?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{o.recipient_name ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <StatusPill status={sub?.status} />
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">{usd(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
