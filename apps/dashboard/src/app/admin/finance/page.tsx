import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, DateRangeBar, resolveRange, usd, EmptyStateV2 } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Finance (§4.7): what CADO earned and what it owes each store.
 *
 * Per store: sales = the store's delivered/active line totals (snapshots),
 * commission = the snapshot the order was placed with, payable = the
 * difference. All figures are sums of stored snapshots — the page never
 * recomputes a price from products.
 */
export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { range } = await searchParams;
  const r = resolveRange(range);

  const { data: lines } = await supabase
    .from("order_items")
    .select(
      "line_total, commission_amount_snapshot, sub_order:sub_orders!inner(status, partner_id, partner:partners(name), order:orders!inner(created_at))"
    )
    .gte("sub_order.order.created_at", r.from.toISOString())
    .lt("sub_order.order.created_at", r.to.toISOString())
    .limit(5000);

  type Line = {
    line_total: number;
    commission_amount_snapshot: number | null;
    sub_order: { status: string; partner_id: string; partner: { name: string } | null };
  };
  const rows = (lines ?? []) as unknown as Line[];

  const byStore = new Map<string, { name: string; sales: number; commission: number; cancelled: number }>();
  for (const l of rows) {
    const id = l.sub_order.partner_id;
    const cur =
      byStore.get(id) ?? { name: l.sub_order.partner?.name ?? "—", sales: 0, commission: 0, cancelled: 0 };
    if (l.sub_order.status === "cancelled") cur.cancelled += Number(l.line_total ?? 0);
    else {
      cur.sales += Number(l.line_total ?? 0);
      cur.commission += Number(l.commission_amount_snapshot ?? 0);
    }
    byStore.set(id, cur);
  }
  const stores = [...byStore.values()].sort((a, b) => b.sales - a.sales);
  const totals = stores.reduce(
    (t, s) => ({ sales: t.sales + s.sales, commission: t.commission + s.commission }),
    { sales: 0, commission: 0 }
  );

  // The REAL ledger shape (0022): one row per order — store_id, gross,
  // commission, net_owed. Periods come later via payout_statements (0068).
  const { data: payables } = await supabase
    .from("store_payables")
    .select("id, store_id, gross_amount, commission_amount, net_owed, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: partnerNames } = await supabase.from("partners").select("id, name");
  const nameOf = new Map((partnerNames ?? []).map((p) => [p.id, p.name]));

  return (
    <div>
      <PageHeader title="Finance" action={<DateRangeBar current={r.key} basePath="/admin/finance" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Sales & commission by store (${r.key})`}>
          {stores.length === 0 ? (
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
                  {stores.map((s) => (
                    <tr key={s.name} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{s.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{usd(s.sales)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ribbon">{usd(s.commission)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{usd(s.sales - s.commission)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{usd(totals.sales)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ribbon">{usd(totals.commission)}</td>
                    <td className="py-2 text-right tabular-nums">{usd(totals.sales - totals.commission)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Store payables (ledger)">
          {(payables ?? []).length === 0 ? (
            <EmptyStateV2 title="No payable periods recorded yet." />
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {(payables ?? []).map((p) => (
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
