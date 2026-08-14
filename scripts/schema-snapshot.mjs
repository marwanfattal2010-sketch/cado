/**
 * A snapshot of the LIVE database schema, taken through the Management API.
 *
 * Why this exists: `supabase db dump` shells out to pg_dump inside a Docker
 * container, and this machine has neither Docker nor the Postgres client
 * tools. Rather than leave the schema unrecorded, this pulls the same
 * information over HTTPS with the access token — every function body, every
 * RLS policy, every table, column, constraint, index and trigger.
 *
 * It is NOT a pg_dump and does not pretend to be: there is no single file you
 * can pipe back into psql. It is a faithful record of what the database
 * actually looked like at a moment in time, which is what you need to see
 * what a migration changed, or to rebuild by hand if one goes wrong. The row
 * data is covered separately and completely by backup-database.mjs.
 *
 * Usage:  SUPABASE_ACCESS_TOKEN=... node scripts/schema-snapshot.mjs
 * Output: C:\Users\Marwan\cado-backups\schema\<timestamp>\*.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_REF = "tzuntmerjhegkzsbfmnf";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const OUT_ROOT = "C:\\Users\\Marwan\\cado-backups\\schema";

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is not set. Nothing was read.");
  process.exit(1);
}

const QUERIES = {
  functions: `
    select p.proname as name,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname`,
  policies: `
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies where schemaname = 'public'
    order by tablename, policyname`,
  columns: `
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns where table_schema = 'public'
    order by table_name, ordinal_position`,
  constraints: `
    select conrelid::regclass::text as table_name, conname as name,
           pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by 1, 2`,
  indexes: `
    select tablename, indexname, indexdef from pg_indexes
    where schemaname = 'public' order by tablename, indexname`,
  triggers: `
    select c.relname as table_name, t.tgname as name, pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
    order by 1, 2`,
  rls_enabled: `
    select relname as table_name, relrowsecurity as rls_enabled
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by 1`,
};

async function run(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(OUT_ROOT, stamp);
mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const [name, query] of Object.entries(QUERIES)) {
  process.stdout.write(`  ${name}... `);
  try {
    const rows = await run(query);
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(rows, null, 2), "utf8");
    console.log(`${Array.isArray(rows) ? rows.length : "?"} rows`);
  } catch (e) {
    failed++;
    console.log(`FAILED — ${String(e.message).slice(0, 120)}`);
  }
}

console.log(`\n${failed ? `${failed} query/queries failed. ` : ""}Written to ${outDir}`);
process.exit(failed ? 1 : 0);
