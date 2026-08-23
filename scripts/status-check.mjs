/**
 * Read-only snapshot of what is actually live, so a stale HANDOFF.md never
 * decides what gets worked on next. Writes nothing, ever.
 *
 *   node scripts/status-check.mjs
 */
import { readFileSync } from "node:fs";

function env(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const e = env("apps/dashboard/.env.local");
const URL_BASE = e.NEXT_PUBLIC_SUPABASE_URL;
const KEY = e.SUPABASE_SERVICE_ROLE_KEY;

async function q(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
  });
  const count = res.headers.get("content-range")?.split("/")[1];
  const body = await res.json().catch(() => null);
  return { count, body, ok: res.ok };
}

const line = (label, v) => console.log(`  ${label.padEnd(42)} ${v}`);

console.log("\n=== CATALOGUE ===");
for (const [label, path] of [
  ["products (total)", "products?select=id"],
  ["products active", "products?select=id&is_active=eq.true"],
  ["products with a photo", "product_images?select=product_id"],
  ["prices still invented (placeholder)", "products?select=id&price_is_placeholder=eq.true"],
  ["partners (stores)", "partners?select=id"],
  ["categories", "categories?select=id"],
]) {
  const r = await q(path);
  line(label, r.ok ? r.count : `ERROR ${JSON.stringify(r.body)?.slice(0, 120)}`);
}

console.log("\n=== OCCASION / RECIPIENT TAGGING (TASK B 1.5) ===");
for (const [label, path] of [
  ["products with >=1 occasion tag", "products?select=id&occasion_tags=not.is.null&occasion_tags=neq.{}"],
  ["products with >=1 recipient tag", "products?select=id&recipient_tags=not.is.null&recipient_tags=neq.{}"],
]) {
  const r = await q(path);
  line(label, r.ok ? r.count : `n/a (${JSON.stringify(r.body)?.slice(0, 90)})`);
}

console.log("\n=== ORDERS / MONEY ===");
for (const [label, path] of [
  ["orders", "orders?select=id"],
  ["sub_orders", "sub_orders?select=id"],
  ["gift_cards", "gift_cards?select=id"],
  ["gift card pools", "gift_card_pools?select=id"],
  ["wallet rows", "wallets?select=id"],
]) {
  const r = await q(path);
  line(label, r.ok ? r.count : `n/a`);
}

console.log("\n=== PER-CATEGORY STOCK (thin tabs show as empty) ===");
const cats = await q("categories?select=id,name,slug&order=name");
if (cats.ok && Array.isArray(cats.body)) {
  for (const c of cats.body) {
    const r = await q(`products?select=id&category_id=eq.${c.id}&is_active=eq.true`);
    line(`${c.name} (${c.slug})`, `${r.count} active`);
  }
}

console.log("\n=== SURPRISE GIFTS SHOP (TASK C) ===");
const sp = await q("partners?select=id,name,is_active&name=ilike.*surprise*");
console.log("  ", sp.ok ? JSON.stringify(sp.body) : "n/a");

console.log("");
