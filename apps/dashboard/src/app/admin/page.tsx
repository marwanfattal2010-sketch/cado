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

  /*
   * EVERY figure here comes from a SECURITY DEFINER RPC, and it has to.
   *
   * Migration 0020 deliberately dropped the admin read policies on orders,
   * sub_orders and order_items. PostgREST answers a blocked select with an
   * EMPTY ARRAY rather than an error, so this page previously showed $0
   * revenue, 0 orders and "No orders yet" — directly above a chart plotting
   * that same range's orders, because the chart already used an RPC. A zero
   * that means "you are not allowed to see this" is indistinguishable from a
   * zero that means "nothing happened", which is the worst way for a money
   * screen to fail.
   */
  const asDate = (d: Date) => d.toISOString().slice(0, 10);

  const sumDays = (rows: { gmv: number; orders: number; commission: number; delivery_fees: number }[]) =>
    rows.reduce(
      (t, d) => ({
        gmv: t.gmv + Number(d.gmv ?? 0),
        orders: t.orders + Number(d.orders ?? 0),
        commission: t.commission + Number(d.commission ?? 0),
        fees: t.fees + Number(d.delivery_fees ?? 0),
      }),
      { gmv: 0, orders: 0, commission: 0, fees: 0 }
    );

  const [daily, dailyPrev, recentRes] = await Promise.all([
    supabase.rpc("admin_finance_breakdown", { p_from: asDate(r.from), p_to: asDate(r.to) }),
    supabase.rpc("admin_finance_breakdown", { p_from: asDate(r.prevFrom), p_to: asDate(r.prevTo) }),
    // 200 is this function's ceiling; enough to find both the newest orders and
    // any that have sat unconfirmed.
    supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 }),
  ]);

  const dailyRows = (daily.data ?? []) as { day: string; gmv: number }[];
  const cur = sumDays((daily.data ?? []) as never[]);
  const prev = sumDays((dailyPrev.data ?? []) as never[]);
  const commission = cur.commission;

  const delta = (now: number, before: number) =>
    before > 0 ? ((now - before) / before) * 100 : null;

  /* ---------------- needs attention: each row is a real condition -------- */

  /** The shape admin_orders() embeds in its sub_orders jsonb column. */
  type EmbeddedSub = { status: string; partner_name: string };
  type AdminOrderRow = {
    order_id: string;
    order_number: string;
    placed_at: string;
    customer_name: string;
    total: number;
    sub_orders: EmbeddedSub[];
  };
  // sub_orders is a jsonb column, so the generated type is Json; the shape is
  // fixed by admin_orders() itself (0036).
  const adminOrders = (recentRes.data ?? []) as unknown as AdminOrderRow[];
  const recent = adminOrders.slice(0, 10);

  // Unconfirmed for over 15 minutes — derived from the same RPC rows, because
  // selecting sub_orders directly returns nothing for an admin and this panel
  // would quietly claim "all clear" while stores sat on orders.
  const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
  const stale = adminOrders
    .filter(
      (o) =>
        new Date(o.placed_at).getTime() < fifteenMinAgo &&
        (o.sub_orders ?? []).some((s) => s.status === "pending")
    )
    .slice(0, 10);

  const [{ data: pendingApps }, { data: oosVisible }] = await Promise.all([
    supabase.from("partners").select("id, name").eq("status", "pending").limit(10),
    supabase
      .from("products")
      .select("id, title, partner:partners(name)")
      .eq("is_active", true)
      .eq("stock_quantity", 0)
      .limit(10),
  ]);

  /** "40 min", "6 hours", "20 days" — nobody can read "28329 min". */
  const waited = (since: string) => {
    const mins = Math.round((Date.now() - new Date(since).getTime()) / 60000);
    if (mins < 90) return `${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  const attention = [
    ...stale.map((o) => ({
      label: `Order unconfirmed ${waited(o.placed_at)} — ${
        (o.sub_orders ?? []).find((s) => s.status === "pending")?.partner_name ?? "store"
      }`,
      href: `/admin/orders/${o.order_id}`,
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
        {recent.length === 0 ? (
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
                {recent.map((o) => {
                  const subs = o.sub_orders ?? [];
                  const sub = subs[0];
                  return (
                    <tr key={o.order_id} className="border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/orders/${o.order_id}`} className="font-medium text-ribbon">
                          #{o.order_number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">
                        {new Date(o.placed_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        {/* An order can span stores; say so rather than show the first and imply it is the only one. */}
                        {subs.length > 1 ? `${subs.length} stores` : sub?.partner_name ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{o.customer_name ?? "—"}</td>
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
