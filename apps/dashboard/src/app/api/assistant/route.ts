import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";
import { answerFromData, classify, PREVIEW_FALLBACK } from "./preview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * CADO Assistant (§5) — a back-office analyst that can only read.
 *
 * THREE RULES THIS FILE EXISTS TO ENFORCE:
 *
 * 1. The model NEVER writes SQL. It picks from a fixed set of parameterised
 *    tools below. A model that can compose SQL against a live marketplace is
 *    one hallucination away from a very bad afternoon, and "read-only" is not
 *    something a prompt can promise — it has to be the only thing on offer.
 *
 * 2. Every query runs as the CALLER, through their own Supabase session, so
 *    RLS decides what comes back. The service role is deliberately not used
 *    here: a store owner asking "what were my sales" must be answered by the
 *    database's own view of who they are, not by our filtering.
 *
 * 3. The model may only report numbers a tool returned. The system prompt says
 *    so, and because the tools are the only source of figures, there is nothing
 *    else for it to report. If a tool returns nothing, it must say so — an
 *    estimated revenue figure is worse than no answer.
 *
 * The API key lives on the server only. Without it the route answers 503 and
 * the panel shows "not configured"; the rest of the dashboard is unaffected.
 */

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are the CADO Assistant, the analyst inside CADO's back-office dashboard. CADO is a gift marketplace in Lebanon: customers order gifts from partner shops, CADO takes a commission and charges a delivery fee.

Rules you must follow:
- Answer ONLY from the results of the tools available to you. Never estimate, never guess, never fill a gap with a plausible number.
- If a tool returns no rows, say plainly that there is no data for that question and period. Do not soften it into a number.
- Never invent stores, products, customers or orders.
- Amounts are USD. Times are Asia/Beirut. Today's date is provided in the user's message context.
- Answer in short, plain English — the person reading is a shop owner, not an analyst. Two or three sentences, then the numbers.
- When you give a list or comparison, prefer a small markdown table.
- If asked to do something you have no tool for (changing data, sending messages, refunds), say you can only read and report, and point them at the page that does it.`;

/* ------------------------------------------------------------- tools ----- */

const tools: Anthropic.Tool[] = [
  {
    name: "revenue_summary",
    description:
      "Revenue, order count, commission and delivery fees. group_by 'day' returns a daily series; 'store' returns per-store totals. Use for any 'how much did we make' question.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date, YYYY-MM-DD" },
        to: { type: "string", description: "End date, YYYY-MM-DD, exclusive of the following day" },
        group_by: { type: "string", enum: ["day", "store"] },
      },
      required: ["from", "to", "group_by"],
    },
  },
  {
    name: "orders_search",
    description:
      "Recent orders with their per-store status. Optionally filter by status (pending, accepted, preparing, ready, out_for_delivery, delivered, cancelled) or by store name. Use for 'which orders are stuck', 'what came in today'.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        store: { type: "string", description: "Store name, partial match" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "top_products",
    description: "Best-selling products in a date range, by units sold.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "store_performance",
    description: "Lifetime totals for every store: orders, revenue, commission CADO earned, and what is still owed to them.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "payouts_owed",
    description: "Money CADO still owes stores: the unpaid rows in the payables ledger.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "delivery_status",
    description: "How many parcels are awaiting pickup, with a driver, or delivered — right now.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "customer_lookup",
    description: "Find customers by name or phone, with how many orders they have placed.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

type Supa = Awaited<ReturnType<typeof createServerClient>>;

async function runTool(supabase: Supa, name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "revenue_summary": {
      const from = String(input.from);
      const to = String(input.to);
      if (input.group_by === "store") {
        const { data, error } = await supabase.rpc("admin_finance_by_store", { p_from: from, p_to: to });
        return error ? { error: error.message } : data;
      }
      const { data, error } = await supabase.rpc("admin_finance_breakdown", { p_from: from, p_to: to });
      return error ? { error: error.message } : data;
    }
    case "orders_search": {
      const { data, error } = await supabase.rpc("admin_orders", {
        p_limit: Math.min(Number(input.limit ?? 60) || 60, 200),
        p_offset: 0,
      });
      if (error) return { error: error.message };
      type Sub = { status: string; partner_name: string };
      let rows = (data ?? []) as unknown as {
        order_number: string; placed_at: string; customer_name: string | null;
        total: number; sub_orders: Sub[];
      }[];
      if (input.status) {
        rows = rows.filter((r) => (r.sub_orders ?? []).some((s) => s.status === input.status));
      }
      if (input.store) {
        const q = String(input.store).toLowerCase();
        rows = rows.filter((r) => (r.sub_orders ?? []).some((s) => (s.partner_name ?? "").toLowerCase().includes(q)));
      }
      // Trim to what the model needs to answer; whole rows waste its attention.
      return rows.slice(0, 40).map((r) => ({
        order: r.order_number,
        placed_at: r.placed_at,
        customer: r.customer_name,
        total: r.total,
        stores: (r.sub_orders ?? []).map((s) => ({ store: s.partner_name, status: s.status })),
      }));
    }
    case "top_products": {
      // 0074 — via callRpc until applied and the types regenerated.
      const { data, error } = await callRpc<unknown>(supabase, "admin_top_products", {
        p_from: new Date(String(input.from)).toISOString(),
        p_to: new Date(String(input.to)).toISOString(),
        p_limit: Math.min(Number(input.limit ?? 10) || 10, 50),
      });
      return error ? { error: error.message } : data;
    }
    case "store_performance": {
      const { data, error } = await supabase.rpc("admin_partner_totals");
      return error ? { error: error.message } : data;
    }
    case "payouts_owed": {
      const { data, error } = await supabase
        .from("store_payables")
        .select("store_id, gross_amount, commission_amount, net_owed, status, created_at")
        .eq("status", "pending")
        .limit(200);
      if (error) return { error: error.message };
      const { data: names } = await supabase.from("partners").select("id, name");
      const nameOf = new Map((names ?? []).map((p) => [p.id, p.name]));
      return (data ?? []).map((r) => ({ store: nameOf.get(r.store_id) ?? r.store_id, ...r }));
    }
    case "delivery_status": {
      const { data, error } = await supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 });
      if (error) return { error: error.message };
      type Sub = { status: string; partner_name: string };
      const rows = (data ?? []) as unknown as { sub_orders: Sub[] }[];
      const tally: Record<string, number> = {};
      for (const r of rows) for (const s of r.sub_orders ?? []) tally[s.status] = (tally[s.status] ?? 0) + 1;
      return {
        awaiting_pickup: tally.ready ?? 0,
        with_driver: tally.out_for_delivery ?? 0,
        delivered: tally.delivered ?? 0,
        needs_confirming: tally.pending ?? 0,
      };
    }
    case "customer_lookup": {
      const q = `%${String(input.query)}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "customer")
        .or(`full_name.ilike.${q},phone.ilike.${q}`)
        .limit(20);
      return error ? { error: error.message } : data;
    }
    default:
      return { error: `no such tool: ${name}` };
  }
}

/* ------------------------------------------------------------- route ----- */

export async function POST(req: Request) {
  const user = await getDashboardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const history = (body.messages ?? []).slice(-12);
  if (history.length === 0) return NextResponse.json({ error: "Nothing asked." }, { status: 400 });

  const supabase = await createServerClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  /*
   * PREVIEW MODE. With no API key there is no model — but there is no reason to
   * show a dead box either. The three shortcut questions run the SAME real
   * queries the model would have called, and return the real answer. Nothing is
   * invented; what is missing is only free-text understanding, and the reply
   * says so when a question falls outside the three.
   */
  if (!apiKey) {
    const question = history[history.length - 1]?.content ?? "";
    const topic = classify(question);
    const reply = topic ? await answerFromData(supabase, topic) : PREVIEW_FALLBACK;
    return NextResponse.json({ reply, preview: true });
  }
  const anthropic = new Anthropic({ apiKey });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(new Date());
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  messages[messages.length - 1] = {
    ...messages[messages.length - 1],
    content: `${messages[messages.length - 1].content}\n\n(Today is ${today} in Asia/Beirut. The person asking is a CADO ${user.role === "admin" ? "admin" : "store owner"}.)`,
  };

  try {
    // Tool loop, bounded. Six turns is far more than any of these questions
    // need; the bound exists so a confused model cannot spin.
    for (let turn = 0; turn < 6; turn++) {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1400,
        system: SYSTEM,
        tools,
        messages,
      });

      if (res.stop_reason !== "tool_use") {
        const text = res.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("\n")
          .trim();
        return NextResponse.json({ reply: text || "I could not find an answer to that." });
      }

      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        const out = await runTool(supabase, block.name, (block.input ?? {}) as Record<string, unknown>);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(out ?? null).slice(0, 60_000),
        });
      }
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ reply: "That took too many steps — try asking something narrower." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "upstream", message }, { status: 502 });
  }
}
