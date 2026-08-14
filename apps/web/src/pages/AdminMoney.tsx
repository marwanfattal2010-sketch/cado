import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAdminMoneySummary, useReconcileGiftCards } from "../hooks/useAdminMoney";
import { formatMoney } from "../lib/money";

// Server-side is_admin() is the real gate (see admin_money_summary /
// reconcile_gift_cards) — this page just hides the UI for everyone else.
// Hiding the button is not the security boundary; the database refusing the
// query for a non-admin session is.
export function AdminMoney() {
  const { session, profile } = useAuth();
  const summary = useAdminMoneySummary();
  const reconcile = useReconcileGiftCards();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-ink/50">Log in as an admin to view this page.</p>
        <Link to="/login" className="mt-6 inline-block rounded-pill bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-ink/50">This page is for admins only.</p>
      </div>
    );
  }

  const rows = summary.data ?? [];
  const liability = rows[0]?.gift_cards_outstanding_liability ?? 0;
  const pending = rows[0]?.gift_cards_pending_payment_total ?? 0;
  const activeCount = rows[0]?.gift_cards_active_count ?? 0;
  const mismatches = reconcile.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Money summary</h1>
      <p className="mt-1 text-sm text-ink/50">Admin only — not linked from anywhere in the app.</p>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-ink p-5 text-cream">
          <p className="text-xs text-cream/60">Outstanding gift card liability</p>
          <p className="mt-2 font-display text-2xl font-semibold">{formatMoney(liability)}</p>
          <p className="mt-1 text-xs text-cream/50">{activeCount} active cards — money customers can still spend</p>
        </div>
        {/* ring-ink/[0.08], not ring-ink/8: Tailwind's opacity scale only has
            multiples of 5, so a bare /8 generates no rule at all. The
            arbitrary value keeps the 8% that was intended here. */}
        <div className="rounded-card bg-white p-5 ring-1 ring-ink/[0.08]">
          <p className="text-xs text-ink/50">Awaiting payment confirmation</p>
          <p className="mt-2 font-display text-2xl font-semibold">{formatMoney(pending)}</p>
          <p className="mt-1 text-xs text-ink/40">Not spendable yet, not counted as liability yet</p>
        </div>
        <div className={`rounded-card p-5 ring-1 ${mismatches.length ? "bg-red-50 ring-red-200" : "bg-emerald-50 ring-emerald-200"}`}>
          <p className="text-xs text-ink/50">Reconciliation</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {mismatches.length === 0 ? "Balanced" : `${mismatches.length} mismatch${mismatches.length > 1 ? "es" : ""}`}
          </p>
          <p className="mt-1 text-xs text-ink/40">Ledger totals vs. card balances</p>
        </div>
      </div>

      {mismatches.length > 0 ? (
        <div className="mt-4 rounded-card bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          <p className="font-medium">These cards don't add up — look at them first:</p>
          <ul className="mt-2 space-y-1">
            {mismatches.map((m) => (
              <li key={m.gift_card_id}>
                {m.code}: expected {m.expected_spent}, ledger shows {m.actual_spent} (off by {m.discrepancy})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h2 className="mt-10 text-sm font-semibold tracking-wide text-ink/50">WHAT YOU OWE EACH STORE</h2>
      <div className="mt-3 overflow-hidden rounded-card bg-white ring-1 ring-ink/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.08] text-left text-xs text-ink/40">
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Gross sales</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Net owed</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.store_id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 font-medium">{r.store_name}</td>
                <td className="px-4 py-3">{formatMoney(r.store_gross_total)}</td>
                <td className="px-4 py-3 text-ink/50">{formatMoney(r.store_commission_total)}</td>
                <td className="px-4 py-3">{formatMoney(r.store_net_owed_total)}</td>
                <td className="px-4 py-3 text-emerald-700">{formatMoney(r.store_net_paid_total)}</td>
                <td className="px-4 py-3 font-medium text-red-600">{formatMoney(r.store_net_unpaid_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
