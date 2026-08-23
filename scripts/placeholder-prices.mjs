/**
 * Read-only. Lists every LIVE product whose price was invented by us
 * (price_is_placeholder = true), grouped by store, so the real prices can be
 * collected from partners before launch. Writes nothing.
 */
import { readFileSync } from "node:fs";

const env = readFileSync("apps/dashboard/.env.local", "utf8");
const pick = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const URL_BASE = pick("NEXT_PUBLIC_SUPABASE_URL");
const KEY = pick("SUPABASE_SERVICE_ROLE_KEY");
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const res = await fetch(
  `${URL_BASE}/rest/v1/products?select=title,price,is_active,partner:partners(name)&price_is_placeholder=eq.true&limit=500`,
  { headers: h },
);
const rows = await res.json();
if (!Array.isArray(rows)) {
  console.error("query failed:", JSON.stringify(rows).slice(0, 300));
  process.exit(1);
}

const live = rows.filter((r) => r.is_active);
const byStore = {};
for (const r of live) {
  const n = r.partner?.name ?? "(no store)";
  (byStore[n] ??= []).push(r);
}

console.log(`\n${live.length} LIVE products have a price we invented (${rows.length - live.length} more are switched off)\n`);
for (const [store, items] of Object.entries(byStore).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${store} — ${items.length}`);
  for (const i of items) console.log(`    $${Number(i.price).toFixed(2).padStart(7)}  ${i.title}`);
}
console.log("");
