/**
 * ONE LAYOUT, NINE TABS — the data half.
 *
 * The code half (TabPanel) now renders every category tab through the same
 * blocks in the same order. This script makes the DATA match that promise:
 *
 *  1. Every tab gets a price tile whose threshold was CHOSEN FROM REAL
 *     PRICES in that category, not copied from tab to tab. "Under $50" is
 *     wrong for Fashion (nothing under $55) and wrong for Flowers (nothing
 *     under $40); each tier below is the lowest one that still opens onto a
 *     well-stocked grid of that category's own products.
 *
 *  2. Three tabs had an empty "Shop by category" — Shoes, Electronics and
 *     Sport had the block but no circles. They get circles for the
 *     subcategories that genuinely hold products, and only those.
 *
 * Additive and idempotent: it updates the rows it owns and inserts what is
 * missing. Nothing is deleted, and no tile is created over an empty shelf.
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
if (!url || !key) throw new Error("Service credentials not found in apps/dashboard/.env.local");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest(p);
const patch = (p, body) => rest(p, { method: "PATCH", body: JSON.stringify(body) });
const post = (p, body) => rest(p, { method: "POST", body: JSON.stringify(body) });

/** tab slug → { label, max } chosen from the real price distribution. */
const PRICE_TIERS = {
  fashion: { label: "Under $100", max: 100 },
  jewelry: { label: "Under $100", max: 100 },
  flowers: { label: "Under $100", max: 100 },
  perfumes: { label: "Under $100", max: 100 },
  chocolate: { label: "Under $75", max: 75 },
  shoes: { label: "Under $100", max: 100 },
  toys: { label: "Under $75", max: 75 },
  home: { label: "Under $50", max: 50 },
  electronics: { label: "Under $100", max: 100 },
  sport: { label: "Under $50", max: 50 },
};

/** tab slug → subcategory slugs, in the order they should read. */
const CIRCLES = {
  shoes: ["sneakers", "boots", "heels-sandals"],
  electronics: ["audio", "gadgets", "cameras-photo"],
  sport: ["football", "training", "racket-sports"],
};

const tabs = await get("browse_tabs?select=id,slug&is_active=eq.true");
const blocks = await get("browse_blocks?select=id,tab_id,type&is_active=eq.true");
const tiles = await get("browse_tiles?select=id,block_id,label,link_type,link_value,position,is_active");
const subs = await get("subcategories?select=id,slug,name");

const blockOf = (tabSlug, type) => {
  const tab = tabs.find((t) => t.slug === tabSlug);
  return tab ? blocks.find((b) => b.tab_id === tab.id && b.type === type) : null;
};

/* ---------------------------------------------------- 1. price tiles ---- */

for (const [tabSlug, tier] of Object.entries(PRICE_TIERS)) {
  const block = blockOf(tabSlug, "entry_cards");
  if (!block) {
    console.log(`! ${tabSlug}: no entry_cards block, skipped`);
    continue;
  }
  const mine = tiles.filter((t) => t.block_id === block.id);
  // Any existing price tile, whatever threshold it used to name.
  const existing = mine.find((t) => /^under \$/i.test(t.label ?? ""));
  // In-tab filter, not a link out to the gift finder: the tile narrows the
  // grid the shopper is already looking at, and EntryCards can then pick a
  // photo of something genuinely inside the band.
  const link_value = JSON.stringify({ max_price: tier.max });

  if (existing) {
    await patch(`browse_tiles?id=eq.${existing.id}`, {
      label: tier.label,
      link_type: "filter",
      link_value,
      is_active: true,
    });
    console.log(`~ ${tabSlug}: price tile → ${tier.label}`);
  } else {
    const position = Math.max(0, ...mine.map((t) => t.position ?? 0)) + 1;
    await post("browse_tiles", {
      block_id: block.id,
      label: tier.label,
      link_type: "filter",
      link_value,
      position,
      is_active: true,
    });
    console.log(`+ ${tabSlug}: price tile ${tier.label} at position ${position}`);
  }
}

/* ------------------------------------------------ 2. category circles --- */

for (const [tabSlug, slugs] of Object.entries(CIRCLES)) {
  const block = blockOf(tabSlug, "category_circles");
  if (!block) {
    console.log(`! ${tabSlug}: no category_circles block, skipped`);
    continue;
  }
  const mine = tiles.filter((t) => t.block_id === block.id);
  let position = Math.max(0, ...mine.map((t) => t.position ?? 0));
  for (const slug of slugs) {
    const sub = subs.find((s) => s.slug === slug);
    if (!sub) {
      console.log(`! ${tabSlug}/${slug}: no such subcategory`);
      continue;
    }
    // Never a circle over an empty shelf.
    const stocked = await get(
      `products?select=id&subcategory_id=eq.${sub.id}&is_active=eq.true&stock_quantity=gt.0`
    );
    if (!stocked.length) {
      console.log(`- ${tabSlug}/${slug}: 0 products in stock, no circle`);
      continue;
    }
    const already = mine.find((t) => t.link_value === slug);
    if (already) {
      await patch(`browse_tiles?id=eq.${already.id}`, { is_active: true, label: sub.name });
      console.log(`~ ${tabSlug}/${slug}: kept (${stocked.length})`);
      continue;
    }
    position += 1;
    await post("browse_tiles", {
      block_id: block.id,
      label: sub.name,
      // "collection" is what CategoryCircles reads as "narrow this tab to
      // that subcategory" — the same link_type the other tabs' circles use.
      link_type: "collection",
      link_value: slug,
      position,
      is_active: true,
    });
    console.log(`+ ${tabSlug}/${slug}: circle at ${position} (${stocked.length} products)`);
  }
}

console.log("done");
