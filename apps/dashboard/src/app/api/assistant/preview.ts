import "server-only";
import { callRpc } from "@/lib/rpc";

/**
 * PREVIEW MODE — the assistant without the model.
 *
 * Marwan asked for "a fake one, just for preview". A fake assistant is the one
 * thing this project has always refused: the moment it answers "revenue was
 * $4,120" with a number nobody queried, it is worse than no assistant at all,
 * because it looks exactly as authoritative as the real one.
 *
 * So preview mode is not fake — it is the same TOOLS with no language model on
 * top. The three shortcut questions are answered by running the real queries
 * and formatting the real results. Every figure below came out of the database.
 * What is missing is only the ability to understand a free-text question, and
 * that is what the panel says, in those words.
 *
 * When ANTHROPIC_API_KEY is set this file is not used at all.
 */

type Supa = unknown;

const usd = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const beirutToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(d);
};

export type PreviewTopic = "analytics" | "reports" | "orders";

/** Which canned answer a question maps to, or null for anything else. */
export function classify(question: string): PreviewTopic | null {
  const q = question.toLowerCase();
  if (q.includes("revenue by store") || q.includes("analytics")) return "analytics";
  if (q.includes("summarise") || q.includes("summarize") || q.includes("report") || q.includes("this month"))
    return "reports";
  if (q.includes("stuck") || q.includes("attention") || q.includes("orders")) return "orders";
  return null;
}

export async function answerFromData(supabase: Supa, topic: PreviewTopic): Promise<string> {
  if (topic === "analytics") {
    const { data, error } = await callRpc<
      { partner_id: string; name: string; orders: number; sales: number; commission: number; payable: number }[]
    >(supabase, "admin_finance_by_store", { p_from: daysAgo(30), p_to: beirutToday() });
    if (error) return `I couldn't read that: ${error.message}`;
    const rows = data ?? [];
    if (rows.length === 0) return "No store made a sale in the last 30 days.";
    const total = rows.reduce((t, r) => t + Number(r.sales), 0);
    const lines = rows
      .slice(0, 10)
      .map((r) => `| ${r.name} | ${usd(r.sales)} | ${usd(r.commission)} | ${r.orders} |`)
      .join("\n");
    return [
      `Revenue by store, last 30 days — ${usd(total)} across ${rows.length} stores.`,
      "",
      "| Store | Sales | CADO commission | Orders |",
      "| --- | --- | --- | --- |",
      lines,
    ].join("\n");
  }

  if (topic === "reports") {
    const { data, error } = await callRpc<
      { gmv: number; orders: number; commission: number; delivery_fees: number; cado_earned: number; active_customers: number }[]
    >(supabase, "admin_home_summary", {
      p_from: new Date(`${daysAgo(30)}T00:00:00Z`).toISOString(),
      p_to: new Date().toISOString(),
    });
    if (error) return `I couldn't read that: ${error.message}`;
    const s = (data ?? [])[0];
    if (!s || Number(s.orders) === 0) return "There were no orders in the last 30 days.";
    return [
      `Last 30 days: ${s.orders} orders worth ${usd(s.gmv)}.`,
      "",
      `- CADO earned ${usd(s.cado_earned)} (${usd(s.commission)} commission + ${usd(s.delivery_fees)} delivery)`,
      `- ${s.active_customers} customers ordered`,
      `- Average order ${usd(Number(s.gmv) / Number(s.orders))}`,
    ].join("\n");
  }

  // orders
  const { data, error } = await callRpc<
    { order_number: string; placed_at: string; sub_orders: { status: string; partner_name: string }[] }[]
  >(supabase, "admin_orders", { p_limit: 200, p_offset: 0 });
  if (error) return `I couldn't read that: ${error.message}`;
  const rows = data ?? [];
  const now = Date.now();
  const stuck = rows.filter(
    (r) =>
      (now - new Date(r.placed_at).getTime()) / 3_600_000 > 2 &&
      (r.sub_orders ?? []).some((s) => s.status === "pending")
  );
  if (stuck.length === 0) return "Nothing is stuck — every order has been confirmed by its store.";
  const lines = stuck
    .slice(0, 10)
    .map((r) => {
      const hours = Math.round((now - new Date(r.placed_at).getTime()) / 3_600_000);
      const store = (r.sub_orders ?? []).find((s) => s.status === "pending")?.partner_name ?? "a store";
      const waited = hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
      return `| #${r.order_number} | ${store} | ${waited} |`;
    })
    .join("\n");
  return [
    `${stuck.length} order${stuck.length === 1 ? "" : "s"} still waiting for a store to confirm.`,
    "",
    "| Order | Store | Waiting |",
    "| --- | --- | --- |",
    lines,
  ].join("\n");
}

export const PREVIEW_FALLBACK =
  "I can only answer the three shortcut questions until CADO's AI key is added — those run real queries against your data. Free-text questions need the key.";
