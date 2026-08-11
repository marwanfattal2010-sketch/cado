import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { StatCard, money } from "@/components/StatCard";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

/**
 * Store owner's overview: this month's orders, revenue, CADO's cut, and what
 * lands in their pocket, then a month-by-month table.
 *
 * Every number is summed from order_items snapshots (line_total and
 * commission_amount_snapshot written at sale time) over the store's own
 * sub_orders — the same rows the payouts ledger is built from, so this page
 * can never disagree with what CADO actually owes. Nothing is recomputed from
 * current prices, and cancelled orders are excluded.
 */
export default async function StoreOverviewPage() {
  await requireStoreOwner();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("sub_orders")
    .select("id, status, created_at, order_items(line_total, commission_amount_snapshot)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    order_items: Array<{ line_total: number; commission_amount_snapshot: number | null }>;
  }>;

  // Group by calendar month, newest first.
  const byMonth = new Map<string, { orders: number; gross: number; commission: number }>();
  for (const so of rows) {
    const key = so.created_at.slice(0, 7); // YYYY-MM
    const bucket = byMonth.get(key) ?? { orders: 0, gross: 0, commission: 0 };
    bucket.orders += 1;
    for (const it of so.order_items) {
      bucket.gross += Number(it.line_total ?? 0);
      bucket.commission += Number(it.commission_amount_snapshot ?? 0);
    }
    byMonth.set(key, bucket);
  }

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = byMonth.get(thisMonthKey) ?? { orders: 0, gross: 0, commission: 0 };
  const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const monthName = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("overview.title")}</h1>

      {rows.length === 0 ? (
        <EmptyState title={t("overview.empty.title")} body={t("overview.empty.body")} />
      ) : (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("overview.thismonth")} · {monthName(thisMonthKey)}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t("overview.orders")} value={String(thisMonth.orders)} />
            <StatCard label={t("overview.revenue")} value={money(thisMonth.gross)} />
            <StatCard label={t("overview.commission")} value={`− ${money(thisMonth.commission)}`} />
            <StatCard
              label={t("overview.net")}
              value={money(thisMonth.gross - thisMonth.commission)}
            />
          </div>

          <h2 className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("overview.bymonth")}
          </h2>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-rest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">{t("overview.orders")}</th>
                  <th className="px-4 py-3 text-right">{t("overview.revenue")}</th>
                  <th className="px-4 py-3 text-right">{t("overview.commission")}</th>
                  <th className="px-4 py-3 text-right">{t("overview.net")}</th>
                </tr>
              </thead>
              <tbody>
                {months.map(([key, m]) => (
                  <tr key={key} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{monthName(key)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.orders}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(m.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      − {money(m.commission)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {money(m.gross - m.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
