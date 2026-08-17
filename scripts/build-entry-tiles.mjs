/**
 * Replaces the repeating entry-tile row with a per-category one.
 *
 * RULE 1 OUTRANKS THE TILE COUNT. The brief lists six tiles per tab and also
 * says no tile may open a grid with fewer than four products. Where those two
 * collide, the second wins: a tab gets the tiles that lead somewhere real,
 * and the ones whose filter is still thin are left out and REPORTED rather
 * than shipped pointing at two products. A tile that opens an almost-empty
 * grid is worse than an absent tile — it reads as a broken shop.
 *
 * Every tile below was measured against the live catalogue before being
 * written here, and the script re-checks at run time and refuses any that has
 * fallen under four since.
 *
 * "Stores" and "New on CADO" appear only on All, per the brief.
 *
 * TWO TILES FROM THE BRIEF ARE DELIBERATELY ABSENT ACROSS EVERY TAB:
 *
 * "Best Sellers" is here, but it sorts on `is_trending` — an editorial flag a
 * human sets — NOT on order counts. The storefront cannot read order_items
 * under RLS, deliberately: one customer must not be able to count another's
 * purchases. The brief's fallback was to "seed a plausible sales spread",
 * which would be inventing sales that never happened, and the same brief's
 * hard rule forbids exactly that. So the tile is real and the ordering is
 * real; no number is claimed.
 *
 * Sport's "Top Brands" is NOT built. It called for Adidas/Nike-type seed
 * stores, and migration 0054 banned brand names in this catalogue precisely
 * because reproducing a brand on stock a shop does not carry is the one thing
 * that could cause real trouble. A partner STORE named after a brand is a
 * shopfront claiming to be them, which is worse. Sport gets a real tile in
 * its place.
 *
 * Auth: SERVICE ROLE key.
 * Usage: node scripts/build-entry-tiles.mjs
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
  const b = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${b.slice(0, 220)}`);
  return b ? JSON.parse(b) : null;
}

const cats = Object.fromEntries(
  (await rest("categories?select=id,slug&is_active=eq.true")).map((c) => [c.slug, c.id])
);
const subs = {};
for (const s of Object.keys(cats)) {
  subs[s] = Object.fromEntries(
    (await rest(`subcategories?select=id,slug&category_id=eq.${cats[s]}`)).map((x) => [x.slug, x.id])
  );
}

/**
 * A tile is a link into the EXISTING grid with filters pre-applied — no new
 * page type, exactly as the brief requires. `?tab=x&f.subcategory=y` is the
 * same query string the filter sheet writes, so the removable chips appear
 * already applied when you land.
 */
const sub = (cat, slug) => `&f.subcategory=${slug}`;

const TILES = {
  fashion: [
    ["Women", `/?tab=fashion${sub("fashion", "women")}`, "&subcategory_id=eq." + subs.fashion?.women],
    ["Men", `/?tab=fashion${sub("fashion", "men")}`, "&subcategory_id=eq." + subs.fashion?.men],
    ["New In", "/?tab=fashion&sort=new", ""],
    ["Best Sellers", "/?tab=fashion&sort=popular", "&is_trending=eq.true"],
  ],
  "jewelry-accessories": [
    ["For Her", "/?tab=jewelry&f.audience=her", "&recipient_tags=cs.{her}"],
    ["For Him", "/?tab=jewelry&f.audience=him", "&recipient_tags=cs.{him}"],
    ["Necklaces", "/?tab=jewelry&f.subcategory=necklaces", "&subcategory_id=eq." + subs["jewelry-accessories"]?.necklaces],
    ["Best Sellers", "/?tab=jewelry&sort=popular", "&is_trending=eq.true"],
    ["Under $50", "/?tab=jewelry&f.budget=under-50", "&price=lt.50"],
  ],
  "flowers-gifts": [
    ["Anniversary", "/?tab=flowers&f.occasion=anniversary", "&occasion_tags=cs.{anniversary}"],
    ["Get Well", "/?tab=flowers&f.occasion=get-well", "&occasion_tags=cs.{get-well}"],
    ["Under $50", "/?tab=flowers&f.budget=under-50", "&price=lt.50"],
  ],
  perfumes: [["For Her", "/?tab=perfumes&f.audience=her", "&recipient_tags=cs.{her}"]],
  chocolate: [
    ["Birthday", "/?tab=chocolate&f.occasion=birthday", "&occasion_tags=cs.{birthday}"],
    ["Best Sellers", "/?tab=chocolate&sort=popular", "&is_trending=eq.true"],
  ],
  shoes: [
    ["New In", "/?tab=shoes&sort=new", ""],
    ["Best Sellers", "/?tab=shoes&sort=popular", "&is_trending=eq.true"],
  ],
  sport: [
    ["Training", "/?tab=sport&f.subcategory=training", "&subcategory_id=eq." + subs.sport?.training],
    ["New In", "/?tab=sport&sort=new", ""],
    ["Best Sellers", "/?tab=sport&sort=popular", "&is_trending=eq.true"],
    ["Under $50", "/?tab=sport&f.budget=under-50", "&price=lt.50"],
  ],
  toys: [
    ["Ages 9+", "/?tab=toys&f.subcategory=toys", "&subcategory_id=eq." + subs.toys?.toys],
    ["Best Sellers", "/?tab=toys&sort=popular", "&is_trending=eq.true"],
    ["New In", "/?tab=toys&sort=new", ""],
    ["Under $50", "/?tab=toys&f.budget=under-50", "&price=lt.50"],
  ],
  electronics: [
    ["For Him", "/?tab=electronics&f.audience=him", "&recipient_tags=cs.{him}"],
    ["Best Sellers", "/?tab=electronics&sort=popular", "&is_trending=eq.true"],
    ["New In", "/?tab=electronics&sort=new", ""],
  ],
  "gift-sets": [
    ["Best Sellers", "/?tab=home&sort=popular", "&is_trending=eq.true"],
    ["New In", "/?tab=home&sort=new", ""],
    ["For Her", "/?tab=home&f.audience=her", "&recipient_tags=cs.{her}"],
    ["Under $50", "/?tab=home&f.budget=under-50", "&price=lt.50"],
  ],
};

/** Tab slug differs from category slug in two places. */
const TAB_OF = { "jewelry-accessories": "jewelry", "flowers-gifts": "flowers", "gift-sets": "home" };

const tabs = Object.fromEntries(
  (await rest("browse_tabs?select=id,slug&is_active=eq.true")).map((t) => [t.slug, t.id])
);

let written = 0;
let refused = 0;

for (const [catSlug, list] of Object.entries(TILES)) {
  const tabSlug = TAB_OF[catSlug] ?? catSlug;
  const [block] = await rest(
    `browse_blocks?select=id&tab_id=eq.${tabs[tabSlug]}&type=eq.entry_cards`
  );
  if (!block) {
    console.log(`no entry_cards block on ${tabSlug}`);
    continue;
  }

  // Re-check every tile against the live catalogue before writing it.
  const keep = [];
  for (const [label, href, probe] of list) {
    const n = probe.includes("undefined")
      ? 0
      : (
          await rest(
            `products?select=id&is_active=eq.true&stock_quantity=gt.0&category_id=eq.${cats[catSlug]}${probe}`
          )
        ).length;
    if (n < 4) {
      console.log(`  refused ${tabSlug}/${label} — only ${n} products`);
      refused++;
      continue;
    }
    keep.push([label, href]);
  }
  if (!keep.length) continue;

  // Replace the tab's tiles wholesale so no stale repeat survives.
  await rest(`browse_tiles?block_id=eq.${block.id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  let pos = 1;
  for (const [label, href] of keep) {
    await rest("browse_tiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        block_id: block.id,
        label,
        link_type: "url",
        link_value: href,
        position: pos++,
        is_active: true,
      }),
    });
    written++;
  }
  console.log(`${tabSlug.padEnd(12)} ${keep.map((k) => k[0]).join(" · ")}`);
}

console.log(`\n${written} tiles written, ${refused} refused for having under four products.`);
