/**
 * Sport — bring the tab up to the standard of every other category.
 *
 * Four separate problems, all of them data:
 *
 *  1. THE TAB WAS EMPTY. A tab's contents are rows in `browse_blocks`, and
 *     Sport had none, so the panel rendered nothing at all — no hero, no
 *     circles, no store rail, no product grid. This creates the same four
 *     blocks Electronics has, which is the pattern for a recently added
 *     category (banner_carousel / category_circles / stores / product_feed).
 *
 *  2. NO HERO. A banner_carousel with no `browse_banners` row renders
 *     nothing, and every banner row in the database had `image_url = null`.
 *     Sport gets a row AND real artwork, uploaded to Supabase Storage so the
 *     hero does not depend on a third-party host staying up.
 *
 *  3. ONE STORE. `StoreStrip.tsx` has `MIN_ITEMS = 3` and hides itself below
 *     that, so Sport's single shop meant no rail. Two more placeholder shops
 *     are added here with stock of their own, which also widens Sport past
 *     football. Pre-launch placeholders are expected (see HANDOFF), and every
 *     invented price is flagged `price_is_placeholder = true` so the whole
 *     lot comes out in one query:
 *
 *       select title, price from products where price_is_placeholder;
 *
 *  4. ALL TEN PRODUCT PHOTOS WERE WRONG. seed-product-photos.mjs attached
 *     them from a hard-coded list of Unsplash ids that nobody looked at. The
 *     goalkeeper gloves were an empty American football field; the shin pads
 *     were a children's training session; the tracksuit was a pair of
 *     sneakers on a ledge; the holdall was a laptop backpack; four more
 *     carried large Nike or adidas logos on stock Baseline Sports does not
 *     carry. Every one of them is removed here.
 *
 * TWO RULES FOR THE PHOTOS, and they matter more than filling the grid:
 *
 *   - Every image below was DOWNLOADED AND LOOKED AT before being listed. A
 *     filename, an alt tag or a search query is not proof of what is in the
 *     file — that is exactly how the ten wrong ones got attached.
 *   - No visible third-party brand marks. Migration 0054 banned brand names
 *     in titles; a swoosh on a $130 listing from a shop that does not sell
 *     that brand is the same problem, only more visible. Unsplash sportswear
 *     is dominated by branded gear, so several products below get NO photo.
 *     That is deliberate. A missing photo reads as "not shot yet", which is
 *     true. A near-enough photo is a promise about what arrives in the box.
 *
 * Source URL for every image is recorded in scripts/assets/sport/SOURCES.md.
 * Images are fetched from images.unsplash.com at run time rather than
 * committed, the same way seed-product-photos.mjs works.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. INSERT/UPDATE/
 * DELETE only — no Supabase management token needed.
 *
 * Idempotent: safe to re-run. Nothing is created twice.
 *
 * Usage: node scripts/seed-sport-category.mjs
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
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

/** Fetch an Unsplash photo by id. The search pages 401 from Node, but this
 *  direct image host serves fine server-side. */
async function unsplash(id, width = 1400) {
  const res = await fetch(`https://images.unsplash.com/photo-${id}?w=${width}&q=80`);
  if (!res.ok) throw new Error(`unsplash ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(bucket, path, bytes) {
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${(await res.text()).slice(0, 200)}`);
}

const publicUrl = (bucket, path) => `${url}/storage/v1/object/public/${bucket}/${path}`;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SPORT_TAB = "bc04cf70-98d5-4943-a6e6-4b381dfd2b7e";
const SPORT_CATEGORY = "229bf43c-f4f5-4e15-bc99-ce09affbbfde";

/* =========================================================== 1. the blocks
 *
 * Exactly what the Electronics tab has, in the same positions. Electronics is
 * the most recently added category and is the established shape for one:
 * no entry_cards and no deal_pair, which the older nine tabs carry.
 *
 * The category_circles block is created EMPTY on purpose. Sport has no
 * sub-categories, and CategoryCircles renders nothing when it has no tiles —
 * Shoes and Electronics both sit like this. The block exists so that adding a
 * sub-category later is a tile row rather than a schema change.
 */
const BLOCKS = [
  { type: "banner_carousel", position: 1, title: null },
  { type: "category_circles", position: 3, title: "Shop by category" },
  { type: "stores", position: 5, title: "Stores" },
  { type: "product_feed", position: 6, title: null },
];

const existingBlocks = await rest(`browse_blocks?select=id,type,position&tab_id=eq.${SPORT_TAB}`);
const blockByType = new Map(existingBlocks.map((b) => [b.type, b]));

for (const b of BLOCKS) {
  if (blockByType.has(b.type)) continue;
  const [row] = await rest("browse_blocks", {
    method: "POST",
    body: JSON.stringify({ tab_id: SPORT_TAB, ...b, config: {}, is_active: true }),
  });
  blockByType.set(b.type, row);
  console.log(`block created: ${b.position} ${b.type}`);
}
console.log(`Sport tab now has ${blockByType.size} blocks.`);

/* ============================================================ 2. the hero
 *
 * A floodlit pitch shot straight down: deep greens, white lines, no crowd, no
 * advertising hoardings, no kit and therefore no brand marks. It reads as
 * "sport" at a glance and it holds up under the accent gradient the banner
 * lays over the left two-thirds for the headline.
 *
 * Copy tone follows the other nine banner rows — short, concrete, and a
 * delivery promise CADO actually makes. Shoes is the model: "Step out today"
 * / "Ordered this morning, worn tonight."
 */
const HERO_UNSPLASH_ID = "1556056504-5c7696c4c28d";

const bannerBlock = blockByType.get("banner_carousel");
const heroPath = "banners/sport-hero.jpg";
await upload("product-images", heroPath, await unsplash(HERO_UNSPLASH_ID, 1600));

const existingBanners = await rest(`browse_banners?select=id&block_id=eq.${bannerBlock.id}`);
const banner = {
  image_url: publicUrl("product-images", heroPath),
  headline: "Ready for kick-off",
  subcopy: "Boots, balls and training kit, delivered today.",
  cta_label: "SHOP NOW",
  link_type: "filter",
  link_value: "{}",
  position: 1,
};
if (existingBanners.length) {
  await rest(`browse_banners?id=eq.${existingBanners[0].id}`, {
    method: "PATCH",
    body: JSON.stringify(banner),
  });
  console.log("hero banner updated");
} else {
  await rest("browse_banners", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ block_id: bannerBlock.id, ...banner }),
  });
  console.log("hero banner created");
}

/* ========================================================== 3. the stores
 *
 * Baseline Sports already exists (0054) but has no cover, so its card in the
 * rail was a blank rectangle. Two more shops join it, because StoreStrip
 * hides itself below three.
 *
 * Cover images are scenes, not products — a pitch, a track, a court. They set
 * a shop's character without promising any particular item is in stock, which
 * is the right register for a placeholder partner.
 */
const STORES = [
  {
    slug: "baseline-sports",
    name: "Baseline Sports",
    description: "Football, training and everyday sportswear.",
    city: "Beirut",
    cover: "1546717003-caee5f93a9db",
    products: [], // already stocked by 0054
  },
  {
    slug: "pace-athletics",
    name: "Pace Athletics",
    description: "Running, fitness and everything for the gym bag.",
    city: "Beirut",
    cover: "1601121853354-e6e866bd2bac",
    products: [
      {
        title: "Insulated Sports Water Bottle",
        price: 20,
        description:
          "A double-walled steel bottle with a screw cap, matte finish. Keeps cold drinks cold through a full session.",
        photo: "1602143407151-7111542de6e8",
      },
      {
        title: "Yoga Mat & Cork Blocks Set",
        price: 45,
        description: "A ribbed non-slip mat with a pair of solid cork blocks.",
        photo: "1646239646963-b0b9be56d6b5",
      },
      {
        title: "Skipping Rope",
        price: 15,
        description: "An adjustable speed rope with weighted handles and a ball-bearing swivel.",
        photo: null,
      },
      {
        title: "Resistance Band Set",
        price: 25,
        description: "Five looped bands in graded strengths, with a carry pouch.",
        photo: null,
      },
    ],
  },
  {
    slug: "courtside-sports",
    name: "Courtside Sports",
    description: "Basketball, tennis and racket sports.",
    city: "Beirut",
    cover: "1697746900540-ad490645f667",
    products: [
      {
        title: "Outdoor Basketball",
        price: 35,
        description: "A size 7 rubber ball with a deep-channel grip, built for outdoor courts.",
        photo: "1595795279832-13f0df36fbb9",
      },
      {
        title: "Tennis Racket & Balls",
        price: 90,
        description: "A strung aluminium racket with a leather grip, boxed with three balls.",
        photo: "1684443726782-1d5bb1aecbd5",
      },
      {
        title: "Badminton Set — Two Rackets & Shuttles",
        price: 30,
        description: "Two lightweight steel-shaft rackets with a pair of nylon shuttlecocks.",
        photo: "1559309106-ed14040fd35d",
      },
      {
        title: "Tube of Tennis Balls",
        price: 12,
        description: "Three pressurised felt balls in a sealed tube.",
        photo: null,
      },
    ],
  },
];

const partnerIds = new Map();

for (const s of STORES) {
  let [partner] = await rest(`partners?select=id,name,cover_image_url&slug=eq.${s.slug}`);
  if (!partner) {
    [partner] = await rest("partners", {
      method: "POST",
      body: JSON.stringify({
        name: s.name,
        slug: s.slug,
        description: s.description,
        status: "active",
        is_live: true,
        country: "LB",
        city: s.city,
        commission_rate: 0.15,
        offers_gift_wrap: true,
      }),
    });
    console.log(`partner created: ${partner.name}`);
  }
  partnerIds.set(s.slug, partner.id);

  if (!partner.cover_image_url) {
    const path = `covers/${s.slug}.jpg`;
    await upload("partner-logos", path, await unsplash(s.cover, 1200));
    await rest(`partners?id=eq.${partner.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cover_image_url: publicUrl("partner-logos", path) }),
    });
    console.log(`  cover uploaded for ${s.name}`);
  }
}

/* ================================================= 4. the new stores' stock */

const newProducts = [];

for (const s of STORES) {
  for (const p of s.products) {
    const slug = slugify(p.title);
    let [row] = await rest(`products?select=id,title,partner_id&slug=eq.${slug}`);
    if (!row) {
      [row] = await rest("products", {
        method: "POST",
        body: JSON.stringify({
          title: p.title,
          slug,
          description: p.description,
          price: p.price,
          currency: "USD",
          category_id: SPORT_CATEGORY,
          partner_id: partnerIds.get(s.slug),
          stock_quantity: 15,
          is_active: true,
          same_day: true,
          // Invented price. This flag is what makes it removable in one query.
          price_is_placeholder: true,
        }),
      });
      console.log(`product created: ${p.title} ($${p.price}, ${s.name})`);
    }
    newProducts.push({ ...p, id: row.id, partner_id: row.partner_id });
  }
}

/* ======================================== 5. throw out the ten wrong photos
 *
 * Both halves: the `product_images` row AND the object in Storage, so the
 * bucket does not keep paying for a picture of a laptop backpack.
 */
const sportProducts = await rest(
  `products?select=id,title,partner_id,product_images(id,storage_path)&category_id=eq.${SPORT_CATEGORY}&order=title`
);

let removed = 0;
for (const p of sportProducts) {
  for (const img of p.product_images ?? []) {
    if (!img.storage_path.startsWith("seed/")) continue;
    await rest(`product_images?id=eq.${img.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await fetch(`${url}/storage/v1/object/product-images/${img.storage_path}`, {
      method: "DELETE",
      headers,
    });
    removed++;
    console.log(`  wrong photo removed: ${p.title}`);
  }
}
console.log(`${removed} mismatched photos removed.`);

/* ============================================= 6. the photos that are right
 *
 * Only two of the ten original Sport products could be given a clean,
 * correct, unbranded photograph. The other eight are listed here with the
 * reason, and are left with no photo on purpose:
 *
 *   Firm Ground Football Boots  — every studio boot shot on Unsplash carries
 *                                 three stripes or a swoosh.
 *   Football Kit                — apparel results are all worn kit with club
 *                                 badges and maker's marks.
 *   Indoor Football Trainers    — nothing that is actually a flat-soled
 *                                 indoor shoe rather than a lifestyle sneaker.
 *   Running Trainers            — every clean studio shot is a named brand.
 *   Shin Pads                   — no product shot exists; the results are
 *                                 kickboxing sessions and cricket pads.
 *   Sports Holdall              — the duffels found are leather weekend bags,
 *                                 not a gym bag with a boot compartment.
 *   Training Tee & Shorts Set   — same apparel problem.
 *   Training Tracksuit          — same, plus visible brand wordmarks.
 */
const REPLACEMENTS = {
  "Match Football": "1660926655800-3d11219f390d",
  "Goalkeeper Gloves": "1632072820781-79f3a064f640",
};

const toPhotograph = [
  ...sportProducts
    .filter((p) => REPLACEMENTS[p.title])
    .map((p) => ({ id: p.id, title: p.title, partner_id: p.partner_id, photo: REPLACEMENTS[p.title] })),
  ...newProducts.filter((p) => p.photo),
];

let attached = 0;
for (const p of toPhotograph) {
  const existing = await rest(`product_images?select=id&product_id=eq.${p.id}`);
  if (existing.length) continue;

  const path = `sport/${p.id}.jpg`;
  const bytes = await unsplash(p.photo);
  await upload("product-images", path, bytes);
  await rest("product_images", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      product_id: p.id,
      partner_id: p.partner_id,
      storage_path: path,
      is_primary: true,
      sort_order: 0,
    }),
  });
  attached++;
  console.log(`  photo attached: ${p.title} (${(bytes.length / 1024).toFixed(0)} KB)`);
}

console.log(`\n${attached} photos attached.`);

/* ================================================================ summary */

const after = await rest(
  `products?select=id,title,is_active,stock_quantity,partner:partners(name),product_images(id)&category_id=eq.${SPORT_CATEGORY}&order=title`
);
console.log("\nSport catalogue:");
for (const p of after) {
  console.log(
    `  ${(p.product_images?.length ? "[photo]" : "[     ]").padEnd(8)} ${p.title.padEnd(42)} ${p.partner?.name ?? "?"}`
  );
}
