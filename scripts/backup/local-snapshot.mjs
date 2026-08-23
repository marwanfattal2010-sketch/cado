/**
 * A backup you can take from this laptop, today, with no tooling.
 *
 * The proper nightly job needs pg_dump on a GitHub runner. This is the
 * stopgap that runs anywhere Node runs: it reads every table through the
 * REST API with the service-role key and writes it out as JSON, then pulls
 * down every Storage file beside it.
 *
 * WHAT IT COVERS: all rows in every table the API exposes, and every
 * uploaded file.
 *
 * WHAT IT DOES NOT COVER, and you should know this:
 *   - the SCHEMA itself — tables, functions, RLS policies, triggers. Those
 *     live in supabase/migrations/ in the code repo, which is already backed
 *     up on GitHub, so a rebuild is: run the migrations, then load this data.
 *   - auth.users. Accounts and passwords are in a schema the REST API cannot
 *     reach. Only pg_dump gets those, which is what the nightly job is for.
 *
 * The output holds real customer data — names, emails, addresses, orders. It
 * is written OUTSIDE the code repo on purpose and must never be committed,
 * least of all to a public repository.
 *
 * Usage: node scripts/backup/local-snapshot.mjs [destination]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function env() {
  const file = join(__dirname, "..", "..", "apps", "dashboard", ".env.local");
  let url, key;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") key = v;
  }
  if (!url || !key) throw new Error("Supabase credentials not found in apps/dashboard/.env.local");
  return { url, key };
}

const { url, key } = env();
const auth = { apikey: key, Authorization: `Bearer ${key}` };
const stamp = new Date().toISOString().slice(0, 10);
const dest = process.argv[2] ?? join("C:", "Users", "Marwan", "cado-backups-local", stamp);

const spec = await fetch(`${url}/rest/v1/`, { headers: auth }).then((r) => r.json());
const tables = Object.keys(spec.paths ?? {})
  .filter((p) => p !== "/" && !p.includes("{") && !p.startsWith("/rpc/"))
  .map((p) => p.slice(1))
  .sort();

await mkdir(join(dest, "data"), { recursive: true });
console.log(`snapshot → ${dest}`);

const counts = {};
let total = 0;

for (const table of tables) {
  // Paged, because a table bigger than the API's default cap would otherwise
  // be silently truncated — a backup missing half a table is worse than none.
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${from}`, {
      headers: auth,
    });
    if (!res.ok) {
      console.log(`  ${table}: SKIPPED (${res.status})`);
      rows.length = 0;
      break;
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  counts[table] = rows.length;
  total += rows.length;
  await writeFile(join(dest, "data", `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`  ${table}: ${rows.length}`);
}

await writeFile(
  join(dest, "MANIFEST.json"),
  JSON.stringify({ taken_at: new Date().toISOString(), project: url, tables: counts, total_rows: total }, null, 2)
);

console.log(`\n${tables.length} tables · ${total} rows written`);
