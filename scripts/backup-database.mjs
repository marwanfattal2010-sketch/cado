/**
 * Full data backup of the CADO database to local JSON files.
 *
 * Why this exists: the project is on Supabase's free plan, which has no daily
 * backups and no point-in-time recovery. Until that changes, a bad UPDATE or a
 * dropped table is unrecoverable. The schema is safe in supabase/migrations/;
 * this covers the part that is not — the data.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<token> node scripts/backup-database.mjs [outDir]
 *
 * Default outDir is C:/Users/Marwan/cado-backups/<timestamp>/ — deliberately
 * OUTSIDE the git repo. These files contain real customer names, phone
 * numbers and addresses; committing them would publish that to GitHub.
 *
 * Restore: each file is a JSON array of rows for one table. Insert them back
 * parents-first (the order in TABLES is already dependency-safe) after
 * re-running the migrations on a fresh project.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PROJECT_REF = "tzuntmerjhegkzsbfmnf";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is not set.");
  process.exit(1);
}

/** Parents before children, so a restore can run top to bottom. */
const TABLES = [
  "categories",
  "subcategories",
  "occasions",
  "partners",
  "profiles",
  "addresses",
  "products",
  "product_variants",
  "product_images",
  "gift_cards",
  "gift_card_transactions",
  "orders",
  "sub_orders",
  "order_items",
  "order_status_history",
  "order_events",
  "store_payables",
  "payout_periods",
  "store_metrics",
  "favorites",
  "cart_items",
  "notifications",
  "occasion_events",
  "occasion_reminders",
  "user_reminders",
  "store_owner_invites",
  "audit_log",
  "dashboard_seed_registry",
];

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = process.argv[2] ?? `C:/Users/Marwan/cado-backups/${stamp}`;
mkdirSync(outDir, { recursive: true });

console.log(`Backing up ${TABLES.length} tables to ${outDir}`);

const summary = [];
let failed = 0;

for (const table of TABLES) {
  try {
    // to_jsonb keeps every column without naming them, so a new column added
    // later is captured automatically instead of being silently dropped.
    const rows = await query(`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from "${table}" t`);
    const data = rows?.[0]?.data ?? [];
    writeFileSync(join(outDir, `${table}.json`), JSON.stringify(data, null, 2), "utf8");
    summary.push({ table, rows: data.length });
    console.log(`  ${table.padEnd(26)} ${data.length} rows`);
  } catch (e) {
    failed++;
    summary.push({ table, error: String(e).slice(0, 200) });
    console.error(`  ${table.padEnd(26)} FAILED: ${e}`);
  }
}

writeFileSync(
  join(outDir, "_manifest.json"),
  JSON.stringify({ takenAt: new Date().toISOString(), project: PROJECT_REF, tables: summary }, null, 2),
  "utf8"
);

const total = summary.reduce((n, s) => n + (s.rows ?? 0), 0);
console.log(`\nDone: ${total} rows across ${TABLES.length - failed} tables. ${failed} failed.`);
if (failed > 0) process.exit(1);
