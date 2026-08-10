/**
 * READ-ONLY reconnaissance before seeding production.
 *
 * Answers three questions that decide whether it is safe to seed:
 *   1. Has the seed already run? A second seed upserts, and an upsert on an
 *      existing sub_order/order_item is an UPDATE, which fires the
 *      order_events triggers. Those event rows then block the teardown's
 *      cascade unless migration 0034 is applied.
 *   2. Do any order_events already exist for the seed batch?
 *   3. Do the Stage 1 tables and the test auth users exist at all?
 *
 * Writes nothing. Safe to run against production.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function uid(label: string): string {
  const h = createHash("sha1").update(`cado-dashboard-seed::${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

const STORE_A = uid("partner-a");
const STORE_B = uid("partner-b");

async function main() {
  const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Store A id = ${STORE_A}`);
  console.log(`Store B id = ${STORE_B}`);
  console.log("");

  const tables = [
    "partners",
    "products",
    "product_variants",
    "orders",
    "sub_orders",
    "order_items",
    "store_payables",
    "payout_periods",
    "store_metrics",
    "order_events",
    "notifications",
    "store_owner_invites",
    "dashboard_seed_registry",
  ];

  console.log("Stage 1 tables (exists? / total rows):");
  for (const t of tables) {
    const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t.padEnd(24)} ${error ? `MISSING (${error.code})` : `${count} rows`}`);
  }
  console.log("");

  const reg = await db.from("dashboard_seed_registry").select("table_name, batch");
  const rows = reg.data ?? [];
  console.log(`seed registry: ${reg.error ? `error ${reg.error.message}` : `${rows.length} rows`}`);
  if (rows.length) {
    const byTable: Record<string, number> = {};
    for (const r of rows as Array<{ table_name: string }>) {
      byTable[r.table_name] = (byTable[r.table_name] ?? 0) + 1;
    }
    console.log(`  ${JSON.stringify(byTable)}`);
  }
  console.log("");

  for (const [label, id] of [["A", STORE_A], ["B", STORE_B]] as const) {
    const p = await db.from("partners").select("id, name").eq("id", id).maybeSingle();
    console.log(`test partner ${label}: ${p.data ? `EXISTS (${p.data.name})` : "not present"}`);
  }

  const ev = await db.from("order_events").select("id", { count: "exact", head: true }).in("partner_id", [STORE_A, STORE_B]);
  console.log(`order_events for test stores: ${ev.error ? `error ${ev.error.message}` : `${ev.count} rows`}`);
  console.log("");

  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const test = (users?.users ?? []).filter((u) => (u.email ?? "").endsWith("@cadotest.local"));
  console.log(`test auth users (@cadotest.local): ${test.length}`);
  for (const u of test) console.log(`  ${u.email}`);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
