import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

/**
 * What CADO owes this store. Reads store_payables directly, which is now
 * possible because 0032 added "partner reads own payables" — before that the
 * table had RLS on with zero policies, so stores could never see their money.
 */
export default async function StorePayoutsPage() {
  await requireStoreOwner();
  const supabase = await createServerClient();

  const { data: payables } = await supabase
    .from("store_payables")
    .select("id, gross_amount, commission_amount, net_owed, status, created_at")
    .order("created_at", { ascending: false });

  const rows = payables ?? [];
  const pendingNet = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.net_owed), 0);
  const paidNet = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.net_owed), 0);

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("payouts.title")}</h1>

      {rows.length === 0 ? (
        <EmptyState title={t("payouts.empty.title")} body={t("payouts.empty.body")} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
              <p className="text-xs uppercase tracking-wide text-muted">{t("payouts.pending")}</p>
              <p className="mt-1 font-display text-xl text-status-amber tabular-nums">
                ${pendingNet.toFixed(2)}
              </p>
            </div>
            <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
              <p className="text-xs uppercase tracking-wide text-muted">{t("payouts.paid")}</p>
              <p className="mt-1 font-display text-xl text-status-green tabular-nums">
                ${paidNet.toFixed(2)}
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-rest">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${
                      r.status === "paid"
                        ? "bg-status-green-tint text-status-green"
                        : "bg-status-amber-tint text-status-amber"
                    }`}
                  >
                    {r.status === "paid" ? t("payouts.paid") : t("payouts.pending")}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-muted">
                    <dt>{t("payouts.gross")}</dt>
                    <dd className="tabular-nums">${Number(r.gross_amount).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted">
                    <dt>{t("payouts.commission")}</dt>
                    <dd className="tabular-nums">−${Number(r.commission_amount).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold text-ink">
                    <dt>{t("payouts.net")}</dt>
                    <dd className="tabular-nums">${Number(r.net_owed).toFixed(2)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
