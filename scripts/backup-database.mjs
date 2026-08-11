/**
 * Full data backup of the CADO database to local JSON files.
 *
 * Why this exists: the project is on Supabase's free plan, which has no daily
 * backups and no point-in-time recovery. Until that changes, a bad UPDATE or a
 * dropped table is unrecoverable. The schema is safe in supabase/migrations/;
 * this covers the part that is not — the data.
 *
 * Auth: the SERVICE ROLE key, read from apps/dashboard/.env.local, NOT a
 * personal access token. That is deliberate — a management token is a
 * short-lived human credential that gets revoked, and a scheduled job must not
 * die silently when it is. The service role key already lives on this machine
 * and bypasses RLS, which is exactly what a backup needs.
 *
 * Usage:
 *   node scripts/backup-database.mjs [outDir]
 *
 * Default outDir is C:/Users/Marwan/cado-backups/<timestamp>/ — deliberately
 * OUTSIDE the git repo. These files contain real customer names, phone
 * numbers and addresses; committing them would publish that to GitHub.
 *
 * Restore: each file is a JSON array of rows for one table. Insert them back
 * parents-first (the order in TABLES is already dependency-safe) after
 * re-running the migrations on a fresh project.
 */
import { writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, "..", "apps", "dashboard", ".env.local");

/** Keep this many backup folders; older ones are deleted after a good run. */
const KEEP = 14;

function readEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (m[1] === "NEXT_PUBLIC_SUPABASE_URL" && !url) url = value;
      if (m[1] === "SUPABASE_SERVICE_ROLE_KEY" && !key) key = value;
    }
  } catch {
    /* env file is optional if the vars are already exported */
  }
  return { url, key };
}

const { url, key } = readEnv();
if (!url || !key) {
  console.error(`Could not find Supabase URL / service role key (looked in ${ENV_FILE}).`);
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

const PAGE = 1000;

/** Paged so a table larger than PostgREST's default limit is never truncated. */
async function fetchAll(table) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
        Prefer: "count=exact",
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const root = "C:/Users/Marwan/cado-backups";
const outDir = process.argv[2] ?? `${root}/${stamp}`;
mkdirSync(outDir, { recursive: true });

console.log(`[${new Date().toISOString()}] backing up ${TABLES.length} tables to ${outDir}`);

const summary = [];
let failed = 0;
let total = 0;

for (const table of TABLES) {
  try {
    const data = await fetchAll(table);
    writeFileSync(join(outDir, `${table}.json`), JSON.stringify(data, null, 2), "utf8");
    summary.push({ table, rows: data.length });
    total += data.length;
    console.log(`  ${table.padEnd(26)} ${data.length} rows`);
  } catch (e) {
    failed++;
    summary.push({ table, error: String(e).slice(0, 200) });
    console.error(`  ${table.padEnd(26)} FAILED: ${e}`);
  }
}

writeFileSync(
  join(outDir, "_manifest.json"),
  JSON.stringify(
    { takenAt: new Date().toISOString(), rows: total, failed, tables: summary },
    null,
    2
  ),
  "utf8"
);

console.log(`Done: ${total} rows, ${TABLES.length - failed} tables OK, ${failed} failed.`);

// Only prune once we know THIS backup succeeded — deleting good history
// because of a failed run is how a backup system becomes the outage.
if (failed === 0) {
  try {
    const folders = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const old of folders.slice(0, Math.max(0, folders.length - KEEP))) {
      rmSync(join(root, old), { recursive: true, force: true });
      console.log(`  pruned old backup ${old}`);
    }
  } catch (e) {
    console.error(`  prune skipped: ${e}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
