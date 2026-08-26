import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatusPill, usd, EmptyStateV2 } from "@/components/ui";
import { untypedFrom } from "@/lib/untyped";

export const dynamic = "force-dynamic";

/**
 * Gift cards, group gifts and wallets (§4.6).
 *
 * Codes are shown as last-4 ONLY — the full code is a bearer instrument and
 * never renders on an admin screen. RLS lets admins read the rows, but the
 * mask is applied before anything reaches the page.
 */
export default async function AdminGiftCardsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: cards }, { data: pools }, { data: wallets }] = await Promise.all([
    supabase
      .from("gift_cards")
      .select("id, code, original_amount, current_balance, status, buyer_name, recipient_name, delivery_method, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    untypedFrom(supabase as never, "gift_card_pools")
      .select("id, recipient_name, goal_cents, status, deadline, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    untypedFrom(supabase as never, "wallets")
      .select("profile_id, balance, profile:profiles(full_name, email)")
      .order("balance", { ascending: false })
      .limit(50),
  ]);

  const activeValue = (cards ?? [])
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + Number(c.current_balance ?? 0), 0);

  return (
    <div>
      <PageHeader title="Gift cards" />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Cards issued</p>
          <p className="mt-1 font-display text-2xl">{(cards ?? []).length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Outstanding balance</p>
          <p className="mt-1 font-display text-2xl">{usd(activeValue)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Group gifts</p>
          <p className="mt-1 font-display text-2xl">{(pools ?? []).length}</p>
        </Card>
      </div>

      <Card title="Cards">
        {(cards ?? []).length === 0 ? (
          <EmptyStateV2 title="No gift cards sold yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3 text-right">Balance</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Buyer</th>
                  <th className="py-2 pr-3">For</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2">Issued</th>
                </tr>
              </thead>
              <tbody>
                {(cards ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                    <td className="py-2 pr-3 font-mono text-xs">···{String(c.code).slice(-4)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{usd(c.original_amount)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{usd(c.current_balance)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={c.status === "depleted" ? "delivered" : c.status} />
                    </td>
                    <td className="py-2 pr-3">{c.buyer_name ?? "—"}</td>
                    <td className="py-2 pr-3">{c.recipient_name}</td>
                    <td className="py-2 pr-3 text-muted">{c.delivery_method}</td>
                    <td className="whitespace-nowrap py-2 text-muted">
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Group gifts">
          {(pools ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No group gifts yet.</p>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {(pools ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">For {p.recipient_name}</p>
                    <p className="text-xs text-muted">
                      goal {usd((p.goal_cents ?? 0) / 100)} · {p.status}
                      {p.deadline ? ` · by ${p.deadline}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Wallets (top balances)">
          {(wallets ?? []).filter((w) => Number(w.balance) > 0).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Every wallet is at $0.</p>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {(wallets ?? [])
                .filter((w) => Number(w.balance) > 0)
                .map((w) => (
                  <li key={w.profile_id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">
                        {(w.profile as { full_name?: string; email?: string } | null)?.full_name ??
                          (w.profile as { email?: string } | null)?.email ??
                          "—"}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{usd(w.balance)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
