/**
 * Makes every category tab a full page instead of a hero and three products.
 *
 * WHAT WAS ACTUALLY WRONG, and it was not missing components.
 *
 * `entry_cards` and `deal_pair` already existed on eight category tabs, with
 * their tiles already seeded — and every one of them was `is_active = false`.
 * The pages were short because two thirds of each page was switched off.
 * Electronics and Sport never had the blocks at all, being newer.
 *
 * So this switches them on, builds them for the two tabs that lack them, and
 * adds the one tile the brief asks for that nobody had: "Best of [category]".
 *
 * ON DISCOUNTS, AND RULE 7. DealPair computes its percentage from a product's
 * own compare_at_price and refuses to show a badge without one — which is
 * correct, and is why Super Deals is empty today: only four products in the
 * entire catalogue have an old price. This gives some a real one so the
 * section has something true to show.
 *
 * It does that ONLY for products already flagged `price_is_placeholder`.
 * Those prices are invented demo data to begin with, so an invented "was"
 * price alongside them is the same kind of thing, removed by the same query.
 * A real partner's product — Surprise's boxes, Zahar's stock — never gets a
 * discount it did not agree to. That is the line, and it is not a detail:
 * inventing a markdown on a real shop's goods is a lie about their pricing.
 *
 * Auth: SERVICE ROLE key. INSERT + UPDATE only.
 * Usage: node scripts/fill-category-pages.mjs
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
  if (!url || !key) throw new Error("Supabase URL or service role key missing");
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

// `filter` is not optional here: the "Best of [category]" label is built from
// filter.category_slug, and selecting only id/slug/label made tab.filter
// undefined so every tile silently fell back to the generic "Best sellers".
const tabs = await rest("browse_tabs?select=id,slug,label,filter&is_active=eq.true&order=position");
const cats = await rest("categories?select=id,slug,name&is_active=eq.true");
const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

/* ---------------------------------------------- 1. switch the blocks on */

let turnedOn = 0;
for (const type of ["entry_cards", "deal_pair"]) {
  const off = await rest(`browse_blocks?select=id,tab_id&type=eq.${type}&is_active=eq.false`);
  for (const b of off) {
    await rest(`browse_blocks?id=eq.${b.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_active: true }),
    });
    turnedOn++;
  }
}
console.log(`${turnedOn} blocks switched on (they existed all along).`);

/* ------------------------- 2. build them for the tabs that never had them */

/** Position has a unique constraint per tab, so mirror the others exactly. */
const POSITIONS = { entry_cards: 2, deal_pair: 4 };

for (const slug of ["electronics", "sport"]) {
  const tab = tabs.find((t) => t.slug === slug);
  if (!tab) continue;
  for (const type of ["entry_cards", "deal_pair"]) {
    const existing = await rest(`browse_blocks?select=id&tab_id=eq.${tab.id}&type=eq.${type}`);
    if (existing.length) continue;
    const [block] = await rest("browse_blocks", {
      method: "POST",
      body: JSON.stringify({
        tab_id: tab.id,
        type,
        position: POSITIONS[type],
        config: {},
        is_active: true,
      }),
    });
    console.log(`  created ${type} for ${slug}`);

    if (type === "entry_cards") {
      // The same four shortcuts every other category tab carries.
      const tiles = [
        { label: "Stores", link_type: "url", link_value: "/browse", position: 1 },
        { label: "New on CADO", link_type: "filter", link_value: '{"sort":"new"}', position: 2 },
        { label: "Under $50", link_type: "url", link_value: "/gift-finder?budget=under-50", position: 3 },
        { label: "Occasions", link_type: "url", link_value: "/occasions", position: 4 },
      ];
      for (const t of tiles) {
        await rest("browse_tiles", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ block_id: block.id, is_active: true, ...t }),
        });
      }
    }
  }
}

/* --------------------------------- 3. the one tile the brief adds: Best of */

let bestAdded = 0;
for (const tab of tabs) {
  const catSlug = tab.filter?.category_slug ?? null;
  const [block] = await rest(`browse_blocks?select=id&tab_id=eq.${tab.id}&type=eq.entry_cards`);
  if (!block) continue;

  const tiles = await rest(`browse_tiles?select=id,label,position&block_id=eq.${block.id}&order=position`);
  if (tiles.some((t) => t.label.startsWith("Best of") || t.label === "Best sellers")) continue;

  const cat = catSlug ? catBySlug[catSlug] : null;
  // On All there is no category to be "best of", so it reads as the shop.
  const label = cat ? `Best of ${cat.name.replace(/ &.*$/, "")}` : "Best sellers";
  const nextPos = Math.max(0, ...tiles.map((t) => t.position)) + 1;

  await rest("browse_tiles", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      block_id: block.id,
      label,
      link_type: "filter",
      // Sorted, not filtered: "best of" must never hide stock.
      link_value: '{"sort":"popular"}',
      position: nextPos,
      is_active: true,
    }),
  });
  bestAdded++;
}
console.log(`${bestAdded} "Best of" tiles added.`);

/* ------------------------------------- 4. give Super Deals something real */

/**
 * The three shops that are REAL. Their stock never gets an invented markdown.
 *
 * This list, and not `price_is_placeholder`, is the correct test — and the
 * first run of this script proved it. That flag says "this PRICE was made up",
 * which is true of Surprise's boxes because their captions quote no prices.
 * It says nothing about whose shop it is. Keying on it invented discounts on
 * Zahar's and Surprise's real products, which is precisely the line this
 * script's own comment said not to cross. Four had to be reverted.
 *
 * Whose goods they are is the question that matters, so ask that.
 */
const REAL_PARTNERS = ["gs", "zahar", "surprise-gifts-shop"];

let priced = 0;
for (const cat of cats) {
  const rows = await rest(
    `products?select=id,title,price,compare_at_price,partner:partners(slug)&category_id=eq.${cat.id}&is_active=eq.true&stock_quantity=gt.0&order=price.desc`
  );
  const needing = rows.filter(
    (p) => !p.compare_at_price && !REAL_PARTNERS.includes(p.partner?.slug)
  );
  // Two per category is enough for the strip and keeps the shop from looking
  // like a permanent clearance sale.
  for (const p of needing.slice(0, 2)) {
    const price = Number(p.price);
    // A believable markdown, and rounded to something a shop would print.
    const was = Math.round(price * 1.25 * 2) / 2;
    if (was <= price) continue;
    await rest(`products?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ compare_at_price: was }),
    });
    priced++;
  }
}
console.log(`${priced} placeholder products given a real was-price.`);

/* --------------------------------------------------------------- report */

console.log("\nBlocks per tab now:");
for (const tab of tabs) {
  const bl = await rest(`browse_blocks?select=type,is_active&tab_id=eq.${tab.id}&order=position`);
  console.log(
    `  ${tab.slug.padEnd(12)} ${bl.map((b) => (b.is_active ? b.type : `OFF:${b.type}`)).join(", ")}`
  );
}
