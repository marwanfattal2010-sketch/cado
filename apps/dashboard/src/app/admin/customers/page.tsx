import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyStateV2, usd } from "@/components/ui";
import { untypedFrom } from "@/lib/untyped";

export const dynamic = "force-dynamic";

/**
 * Customers (§4.5): who buys, how often, and what they hold on their wallet.
 * Every column is a real aggregate over that customer's own rows. No payment
 * data beyond the method ever appears — none is stored.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; q?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { focus, q } = await searchParams;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, role")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (profiles ?? []).map((p) => p.id);
  const [{ data: orders }, { data: wallets }] = await Promise.all([
    ids.length
      ? supabase.from("orders").select("customer_id, total, created_at").in("customer_id", ids).limit(5000)
      : Promise.resolve({ data: [] as { customer_id: string; total: number; created_at: string }[] }),
    ids.length
      ? untypedFrom(supabase as never, "wallets").select("profile_id, balance").in("profile_id", ids)
      : Promise.resolve({ data: [] as { profile_id: string; balance: number }[] }),
  ]);

  const byCustomer = new Map<string, { n: number; spend: number; last: string }>();
  for (const o of orders ?? []) {
    const cur = byCustomer.get(o.customer_id) ?? { n: 0, spend: 0, last: "" };
    cur.n += 1;
    cur.spend += Number(o.total ?? 0);
    if (o.created_at > cur.last) cur.last = o.created_at;
    byCustomer.set(o.customer_id, cur);
  }
  const walletOf = new Map(((wallets ?? []) as { profile_id: string; balance: number }[]).map((w) => [w.profile_id, Number(w.balance ?? 0)]));

  const needle = (q ?? "").toLowerCase();
  const rows = (profiles ?? []).filter(
    (p) =>
      !needle ||
      (p.full_name ?? "").toLowerCase().includes(needle) ||
      (p.phone ?? "").includes(needle)
  );

  return (
    <div>
      <PageHeader title="Customers" />

      <form className="mb-4" action="/admin/customers" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email or phone…"
          className="w-full max-w-sm rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink/40"
        />
      </form>

      {rows.length === 0 ? (
        <EmptyStateV2 title={q ? `No customers match “${q}”.` : "No customer accounts yet."} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3 text-right">Orders</th>
                  <th className="py-2 pr-3 text-right">Lifetime</th>
                  <th className="py-2 pr-3 text-right">Wallet</th>
                  <th className="py-2 pr-3">Last order</th>
                  <th className="py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = byCustomer.get(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-line/60 last:border-0 ${focus === p.id ? "bg-ribbon-tint" : "hover:bg-surface-sunk"}`}
                    >
                      <td className="py-2 pr-3">
                        <p className="font-medium text-ink">{p.full_name ?? "—"}</p>
                        
                      </td>
                      <td className="py-2 pr-3">{p.phone ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{s?.n ?? 0}</td>
                      <td className="py-2 pr-3 text-right font-semibold tabular-nums">{usd(s?.spend ?? 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{usd(walletOf.get(p.id) ?? 0)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">
                        {s?.last ? new Date(s.last).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="whitespace-nowrap py-2 text-muted">
                        {new Date(p.created_at).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
