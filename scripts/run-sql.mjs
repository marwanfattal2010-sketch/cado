/**
 * Run SQL against the CADO Supabase project via the Management API.
 *
 * Usage:
 *   node scripts/run-sql.mjs --sql "select 1"
 *   node scripts/run-sql.mjs --file supabase/migrations/0035_x.sql
 *
 * Reads the token from SUPABASE_ACCESS_TOKEN. Never hard-code it here and never
 * print it: it is a personal access token with full control of the account, and
 * it belongs in the shell env for one session only.
 */
import { readFileSync } from "node:fs";

const PROJECT_REF = "tzuntmerjhegkzsbfmnf";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is not set.");
  process.exit(1);
}

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const sqlIdx = args.indexOf("--sql");

let query;
let label;
if (fileIdx !== -1) {
  const path = args[fileIdx + 1];
  query = readFileSync(path, "utf8");
  label = path;
} else if (sqlIdx !== -1) {
  query = args[sqlIdx + 1];
  label = "inline";
} else {
  console.error("Pass --file <path> or --sql <statement>.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`FAILED (${res.status}) running ${label}`);
  console.error(text.slice(0, 2000));
  process.exit(1);
}

console.log(`OK — ran ${label}`);
try {
  const parsed = JSON.parse(text);
  console.log(JSON.stringify(parsed, null, 2).slice(0, 4000));
} catch {
  console.log(text.slice(0, 2000));
}
