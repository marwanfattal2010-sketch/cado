import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  PageHeader,
  Card,
  DateRangeBar,
  resolveRange,
  usd,
  EmptyStateV2,
  KpiCard,
  BarChart,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Finance (§4.7): what CADO earned and what it owes each store.
 *
 * EVERY figure on this page comes out of Postgres already added up. Nothing is
 * summed in React, and nothing is read from order_items directly — admins have
 * no read policy on orders / sub_orders / order_items (0020 dropped them on
 * purpose), so a direct select returns an empty array rather than an error.
 * That is how this page previously showed "No sales in this range" directly
 * above a ledger listing that same range's sales.
 *
 * Two RPCs, both SECURITY DEFINER and both gated on is_admin():
 *   admin_finance_breakdown(from,to)  per day   — shipped in 0068, applied
 *   admin_finance_by_store(from,to)   per store — 0073, may not be applied yet
 *
 * The per-store table degrades honestly: if 0073 has not run, PostgREST answers
 * PGRST202 (no such function) and the card says so instead of showing zeroes.
 */

type ByStore = {
  partner_id: string;
  name: string;
  orders: number;
  sales: number;
  commission: number;
  payable: number;
  cancelled: number;
};

type ByDay = {
  day: string;
  gmv: number;
  orders: number;
  commission: number;
  delivery_fees: number;
};

const asDate = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { range } = await searchParams;
  const r = resolveRange(range);

  const [daily, perStore, payablesRes, partnerNamesRes] = await Promise.all([
    supabase.rpc("admin_finance_breakdown", { p_from: asDate(r.from), p_to: asDate(r.to) }),
    supabase.rpc("admin_finance_by_store" as never, {
      p_from: asDate(r.from),
      p_to: asDate(r.to),
    } as never),
    supabase
      .from("store_payables")
      .select("id, store_id, gross_amount, commission_amount, net_owed, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("partners").select("id, name"),
  ]);

  const days = (daily.data ?? []) as ByDay[];
  // Range headline: the sum of days the DATABASE returned, not of rows a
  // browser query happened to see.
  const totals = days.reduce(
    (t, d) => ({
      gmv: t.gmv + Number(d.gmv ?? 0),
      orders: t.orders + Number(d.orders ?? 0),
      commission: t.commission + Number(d.commission ?? 0),
      delivery: t.delivery + Number(d.delivery_fees ?? 0),
    }),
    { gmv: 0, orders: 0, commission: 0, delivery: 0 }
  );

  const storeRows = (perStore.data ?? []) as ByStore[];
  // PGRST202 = the function isn't in the database yet (0073 unapplied).
  const storeRpcMissing = perStore.error?.code === "PGRST202";

  const payables = payablesRes.data ?? [];
  const nameOf = new Map((partnerNamesRes.data ?? []).map((p) => [p.id, p.name]));

  return (
    <div>
      <PageHeader title="Finance" action={<DateRangeBar current={r.key} basePath="/admin/finance" />} />

      {daily.error ? (
        <p className="mb-4 rounded-card bg-status-red-tint p-3 text-sm text-status-red">
          Could not load takings: {daily.error.message}
        </p>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Sales" value={usd(totals.gmv)} hint={`${r.key} · what customers paid`} />
        <KpiCard label="CADO commission" value={usd(totals.commission)} hint="Your earnings" />
        <KpiCard label="Delivery fees" value={usd(totals.delivery)} hint="Collected on orders" />
        <KpiCard label="Orders" value={String(totals.orders)} hint="In this range" />
      </div>

      {days.length > 0 ? (
        <Card title="Sales per day" className="mb-4">
          <BarChart
            points={days.map((d) => ({
              label: new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
              value: Number(d.gmv ?? 0),
            }))}
            formatValue={usd}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Sales & commission by store (${r.key})`}>
          {storeRpcMissing ? (
            <EmptyStateV2
              icon="⚙"
              title="Per-store figures need migration 0073 applied. The totals above are correct and come from the database."
            />
          ) : storeRows.length === 0 ? (
            <EmptyStateV2 title="No sales in this range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Store</th>
                    <th className="py-2 pr-3 text-right">Sales</th>
                    <th className="py-2 pr-3 text-right">Commission</th>
                    <th className="py-2 text-right">Payable to store</th>
                  </tr>
                </thead>
                <tbody>
                  {storeRows.map((s) => (
                    <tr key={s.partner_id} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{s.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{usd(s.sales)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ribbon">{usd(s.commission)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{usd(s.payable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Store payables (ledger)">
          {payables.length === 0 ? (
            <EmptyStateV2 title="No payable periods recorded yet." />
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {payables.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{nameOf.get(p.store_id) ?? "—"}</p>
                    <p className="text-xs text-muted">
                      {new Date(p.created_at).toLocaleDateString("en-GB")} · gross {usd(p.gross_amount)} −
                      commission {usd(p.commission_amount)} · {p.status}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{usd(p.net_owed)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
