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

/* ------------------------------------------------------------------
 * STORAGE — the photographs themselves.
 *
 * The tables above only record a storage_path. The actual JPEGs live in
 * Supabase Storage, which is a separate service, so a database-only backup
 * restores every product's name, price and store with a broken image where
 * the photo used to be.
 *
 * That is survivable today because GS's and Zahar's photos came from their
 * own websites and could be re-imported. It stops being survivable the first
 * time a partner uploads a photo that exists nowhere else.
 *
 * Files are written under files/<bucket>/<the exact storage path>, so a
 * restore is a straight re-upload with the same key and every storage_path
 * in the database still resolves.
 * ------------------------------------------------------------------ */
/** The same service-role credentials the table dump uses. */
const authHeaders = { apikey: key, Authorization: `Bearer ${key}` };

/**
 * Retry a request a few times before giving up.
 *
 * Storage is 163 separate requests in a row, and a home connection drops one
 * now and then — the first run of this lost two photos and two whole bucket
 * listings to "fetch failed". A backup that abandons a file because the wifi
 * blinked is not a backup, and the failure is exactly the kind you only
 * discover when you need the file.
 */
async function tryFetch(input, init, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastError = e;
      // 400ms, 800ms, 1600ms — long enough for a blip to pass, short enough
      // that a genuinely dead connection still fails the run quickly.
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw lastError;
}

let fileCount = 0;
let fileBytes = 0;
let fileFailures = 0;

async function listBucket(bucket, prefix = "") {
  const res = await tryFetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  const rows = await res.json();
  const out = [];
  for (const o of rows) {
    const path = prefix ? `${prefix}/${o.name}` : o.name;
    // A folder comes back with a null id; anything else is a real object.
    if (o.id === null) out.push(...(await listBucket(bucket, path)));
    else out.push(path);
  }
  return out;
}

try {
  const bucketsRes = await tryFetch(`${url}/storage/v1/bucket`, { headers: authHeaders });
  const buckets = await bucketsRes.json();
  for (const bucket of buckets) {
    let paths = [];
    try {
      paths = await listBucket(bucket.name);
    } catch (e) {
      console.error(`  ${bucket.name.padEnd(26)} LIST FAILED: ${e}`);
      fileFailures++;
      continue;
    }
    for (const path of paths) {
      try {
        const r = await tryFetch(`${url}/storage/v1/object/${bucket.name}/${path}`, { headers: authHeaders });
        const buf = Buffer.from(await r.arrayBuffer());
        const dest = join(outDir, "files", bucket.name, ...path.split("/"));
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, buf);
        fileCount++;
        fileBytes += buf.length;
      } catch (e) {
        console.error(`  ${bucket.name}/${path} FAILED: ${e}`);
        fileFailures++;
      }
    }
    console.log(`  ${bucket.name.padEnd(26)} ${paths.length} files`);
  }
} catch (e) {
  console.error(`  storage FAILED: ${e}`);
  fileFailures++;
}

const mb = (fileBytes / 1024 / 1024).toFixed(1);
console.log(`Storage: ${fileCount} files, ${mb} MB, ${fileFailures} failed.`);

writeFileSync(
  join(outDir, "_manifest.json"),
  JSON.stringify(
    {
      takenAt: new Date().toISOString(),
      rows: total,
      failed,
      tables: summary,
      files: fileCount,
      fileBytes,
      fileFailures,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Done: ${total} rows, ${TABLES.length - failed} tables OK, ${failed} failed.`);

/* ------------------------------------------------------------------
 * A backup that fails silently is not a backup.
 *
 * The 3am run on 2026-08-14 failed every table with "fetch failed" — the
 * machine was asleep or offline — and nothing said so; the only trace was a
 * line deep in a log nobody opens. This writes one file at the top of the
 * backup folder that says, in words, whether the last run worked and when.
 * ------------------------------------------------------------------ */
const ok = failed === 0 && fileFailures === 0;
try {
  writeFileSync(
    join(root, "LAST-BACKUP-STATUS.txt"),
    [
      ok ? "STATUS: OK" : "STATUS: ***FAILED***",
      `When:   ${new Date().toString()}`,
      `Data:   ${total} rows across ${TABLES.length - failed} tables (${failed} failed)`,
      `Photos: ${fileCount} files, ${mb} MB (${fileFailures} failed)`,
      `Folder: ${outDir}`,
      "",
      ok
        ? "Nothing to do."
        : "A run failed. The most common cause is the PC being asleep or offline at 3am.\n" +
          "Fix: open a terminal and run  node scripts/backup-database.mjs",
      "",
    ].join("\n"),
    "utf8"
  );
} catch (e) {
  console.error(`  status file skipped: ${e}`);
}

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
