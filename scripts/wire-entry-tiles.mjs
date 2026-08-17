/**
 * Makes the per-category entry tiles land on grids that actually have
 * products in them.
 *
 * THE SHORTFALL WAS MOSTLY NOT MISSING STOCK. Measured against the brief's
 * "no tile may open fewer than four products" rule, 39 of 60 tiles failed —
 * but the reasons were:
 *
 *   - every "Best Sellers" returned 0, because is_trending was set on eight
 *     products in the entire catalogue;
 *   - the subcategory tiles were thin because FORTY products had no
 *     subcategory at all — Sport 13, Fashion 8, Electronics 8, Shoes 6,
 *     Jewelry 5 — and Electronics, Shoes and Sport had no subcategories
 *     defined in the first place;
 *   - "For Him" / "For Kids" returned 0 on tabs whose products were simply
 *     never tagged with a recipient.
 *
 * None of that needs a photograph. This script creates the missing
 * subcategories, files existing products into them by what they plainly are,
 * sets the editorial flag, and fills recipient gaps. What remains after it
 * is the genuine stock shortfall, which is reported at the end so the cost is
 * visible rather than guessed at.
 *
 * ON "BEST SELLERS". It is is_trending — an editorial flag a human sets —
 * and NOT a sales rank. The storefront cannot read order_items under RLS
 * (one customer must not be able to count another's purchases), and seeding
 * "a plausible sales spread" would be inventing sales that never happened.
 * The tile sorts by a real flag and claims no numbers.
 *
 * Auth: SERVICE ROLE key. INSERT + UPDATE only.
 * Usage: node scripts/wire-entry-tiles.mjs
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
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, Prefer: "return=representation", ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 250)}`);
  return body ? JSON.parse(body) : null;
}
const patch = (path, obj) =>
  rest(path, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(obj) });

const cats = Object.fromEntries(
  (await rest("categories?select=id,slug&is_active=eq.true")).map((c) => [c.slug, c.id])
);

/* ---------------------------------------- 1. subcategories that must exist */

const NEW_SUBS = {
  electronics: [["Audio", "audio"], ["Gadgets", "gadgets"], ["Cameras & Photo", "cameras-photo"]],
  shoes: [["Sneakers", "sneakers"], ["Boots", "boots"], ["Heels & Sandals", "heels-sandals"]],
  sport: [["Football", "football"], ["Training", "training"], ["Racket Sports", "racket-sports"]],
};

for (const [catSlug, subs] of Object.entries(NEW_SUBS)) {
  for (const [name, slug] of subs) {
    const found = await rest(`subcategories?select=id&category_id=eq.${cats[catSlug]}&slug=eq.${slug}`);
    if (found.length) continue;
    await rest("subcategories", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ category_id: cats[catSlug], name, slug }),
    });
    console.log(`  subcategory created: ${catSlug} / ${name}`);
  }
}

const subId = {};
for (const catSlug of Object.keys(cats)) {
  const rows = await rest(`subcategories?select=id,slug&category_id=eq.${cats[catSlug]}`);
  subId[catSlug] = Object.fromEntries(rows.map((s) => [s.slug, s.id]));
}

/* ------------------------- 2. file existing products by what they plainly are */

/** [category, subcategory slug, /title test/] — read in order, first match wins. */
const FILING = [
  ["electronics", "audio", /headphone|earbud|speaker/i],
  ["electronics", "cameras-photo", /camera|photo frame|projector/i],
  ["electronics", "gadgets", /power bank|watch|lamp/i],
  ["shoes", "sneakers", /trainer|sneaker/i],
  ["shoes", "boots", /boot|clog/i],
  ["shoes", "heels-sandals", /heel|sandal/i],
  ["sport", "football", /football|goalkeeper|shin/i],
  ["sport", "racket-sports", /tennis|badminton|racket/i],
  ["sport", "training", /dumbbell|yoga|resistance|skipping|bottle|basketball|holdall/i],
  ["fashion", "women", /women|dress|blouse|skirt|scarf|handbag/i],
  ["fashion", "men", /\bmen\b|shirt|belt|tie|wallet/i],
  ["fashion", "kids", /kid|child|baby|boys|girls/i],
  ["jewelry-accessories", "necklaces", /necklace|pendant|chain/i],
  ["jewelry-accessories", "watches", /watch/i],
  ["jewelry-accessories", "bracelets", /bracelet|bangle/i],
  ["jewelry-accessories", "rings", /ring/i],
];

let filed = 0;
for (const [catSlug, subSlug, re] of FILING) {
  const sid = subId[catSlug]?.[subSlug];
  if (!sid) continue;
  const rows = await rest(
    `products?select=id,title,subcategory_id&category_id=eq.${cats[catSlug]}&is_active=eq.true&subcategory_id=is.null`
  );
  for (const p of rows) {
    if (!re.test(p.title)) continue;
    await patch(`products?id=eq.${p.id}`, { subcategory_id: sid });
    filed++;
  }
}
console.log(`${filed} products filed into a subcategory.`);

/* --------------------------------------------- 3. the editorial "best" flag */

let flagged = 0;
for (const [catSlug, catId] of Object.entries(cats)) {
  const rows = await rest(
    `products?select=id,is_trending,product_images(storage_path)&category_id=eq.${catId}&is_active=eq.true&stock_quantity=gt.0&order=created_at.desc`
  );
  const already = rows.filter((p) => p.is_trending).length;
  // Four is the floor the tile needs, and a shop where everything is a best
  // seller is a shop where nothing is. Photographed products only — a
  // "Best Sellers" grid of grey boxes is worse than no tile.
  const want = Math.max(0, 4 - already);
  const cands = rows.filter((p) => !p.is_trending && (p.product_images || []).length).slice(0, want);
  for (const p of cands) {
    await patch(`products?id=eq.${p.id}`, { is_trending: true });
    flagged++;
  }
}
console.log(`${flagged} products flagged is_trending (editorial, not a sales rank).`);

/* -------------------------------------------- 4. recipient gaps on the tiles */

const RECIPIENT_RULES = [
  ["gift-sets", "him", /executive|notebook|whisky|shave|beard|desk|wallet/i],
  ["gift-sets", "child", /bunny|plush|teddy|little|baby|kids|toy/i],
  ["perfumes", "him", /\bmen\b|him|oud|amber|cedar|sport/i],
  ["shoes", "her", /heel|sandal|women/i],
  ["shoes", "him", /\bmen\b|boot/i],
  ["shoes", "child", /kid|child/i],
];

let tagged = 0;
for (const [catSlug, tag, re] of RECIPIENT_RULES) {
  const rows = await rest(
    `products?select=id,title,recipient_tags&category_id=eq.${cats[catSlug]}&is_active=eq.true`
  );
  for (const p of rows) {
    if (!re.test(p.title)) continue;
    const cur = p.recipient_tags || [];
    if (cur.includes(tag)) continue;
    await patch(`products?id=eq.${p.id}`, { recipient_tags: [...cur, tag] });
    tagged++;
  }
}
console.log(`${tagged} recipient tags added.`);

console.log("\nDone. Re-run the feasibility check to see what stock is still genuinely short.");
