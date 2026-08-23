/**
 * "A gift marketplace, not a store" — the data half.
 *
 *  1. The All tab's hero: the gift photo, and copy that says what CADO is
 *     for rather than what it sells.
 *  2. Tab labels shortened, so five fit across a phone instead of three.
 *  3. Homepage order: occasions before categories, because the occasion is
 *     the thing a person actually arrives with.
 *
 * Additive and idempotent — it updates rows it owns and inserts nothing that
 * is not needed twice.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
function env() {
  let url, key;
  for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") key = v;
  }
  return { url, key };
}
const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest(p);
const patch = (p, body) => rest(p, { method: "PATCH", body: JSON.stringify(body) });

const tabs = await get("browse_tabs?select=id,slug,label&is_active=eq.true");
const blocks = await get("browse_blocks?select=id,tab_id,type,position&is_active=eq.true");
const banners = await get("browse_banners?select=id,block_id,headline");

/* ------------------------------------------------------- 1. the hero ---- */

const allTab = tabs.find((t) => t.slug === "all");
const heroBlock = blocks.find((b) => b.tab_id === allTab?.id && b.type === "banner_carousel");
const heroRows = banners.filter((b) => b.block_id === heroBlock?.id);

for (const row of heroRows) {
  await patch(`browse_banners?id=eq.${row.id}`, {
    image_url: "/hero-gift.jpg",
    headline: "Choose the gift. We'll do the rest.",
    subcopy: "From shops across Lebanon, delivered today.",
    cta_label: "SHOP NOW",
  });
  console.log(`~ hero → "Choose the gift. We'll do the rest."`);
}

/* ------------------------------------------------- 2. shorter tab names -- */

const RENAME = {
  jewelry: "Jewelry",
  perfumes: "Beauty",
  fashion: "Fashion",
};
for (const [slug, label] of Object.entries(RENAME)) {
  const tab = tabs.find((t) => t.slug === slug);
  if (!tab) continue;
  if (tab.label === label) {
    console.log(`= ${slug}: already "${label}"`);
    continue;
  }
  await patch(`browse_tabs?id=eq.${tab.id}`, { label });
  console.log(`~ ${slug}: "${tab.label}" → "${label}"`);
}

/* --------------------------------------------- 3. homepage block order --- */

/*
 * Occasions move above categories. A person opening CADO is not thinking
 * "jewelry", they are thinking "it's my mother's birthday on Thursday" —
 * so the question the page asks first should be the one they already have
 * an answer to.
 *
 * Positions are unique per tab, so the shuffle goes through a high offset
 * first rather than colliding on the way past.
 */
/* Occasions and categories come before the Stores / New on CADO / Under $50
   tiles now, so the page asks "what is the occasion?" before it asks
   "what department?". */
const ORDER = ["banner_carousel", "category_circles", "entry_cards", "deal_pair", "stores", "product_feed"];
const allBlocks = blocks.filter((b) => b.tab_id === allTab?.id);

for (const b of allBlocks) {
  await patch(`browse_blocks?id=eq.${b.id}`, { position: (b.position ?? 0) + 100 });
}
let pos = 0;
for (const type of ORDER) {
  const b = allBlocks.find((x) => x.type === type);
  if (!b) continue;
  pos += 1;
  await patch(`browse_blocks?id=eq.${b.id}`, { position: pos });
  console.log(`~ all/${type} → position ${pos}`);
}

console.log("done");
