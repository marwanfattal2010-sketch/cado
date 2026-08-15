/**
 * Gift Sets — two more placeholder stores, their stock, and the page itself.
 *
 * WHAT THIS IS. Gift Sets is the category closest to what CADO actually is,
 * and until tonight the tab rendered as a hero plus eight product cards and
 * nothing else. Two of its blocks were switched on but had nothing behind
 * them, so they drew nothing:
 *
 *   - "Shop by category" had ZERO tiles, because Gift Sets had no
 *     sub-categories at all. Every other category tab has three or four.
 *   - The store strip never appeared, for two reasons at once: only ONE
 *     partner had active Gift Sets stock and StoreStrip's MIN_ITEMS is 3, and
 *     ProductFeed only renders its `renderAfter` slot once there are MORE
 *     than eight products — and there were exactly eight.
 *
 * So this script does not touch a single component. It fills in the rows the
 * components were already asking for.
 *
 * WHAT IS REAL AND WHAT IS NOT.
 *
 *   REAL: Surprise Gifts Shop and its eight boxes (see seed-surprise-gifts.mjs)
 *         — a real shop in Tripoli with its own photographs. NOTHING here
 *         touches those eight rows except to file each one under a
 *         sub-category, which changes nothing a shopper sees except that the
 *         circles above the grid now filter.
 *
 *   NOT REAL: the two stores below and their five products. They are
 *         placeholders, exactly like `the-gift-atelier`, `the-basket-house`
 *         and `baseline-sports` before them. CADO is pre-launch: nobody has
 *         the app but Marwan and every partner store is a stand-in to be
 *         swapped for a real shop later.
 *
 *   NOT REAL: every price. All five are invented and flagged
 *         `price_is_placeholder = true`, which is what makes the whole lot
 *         findable and removable in one query:
 *
 *           select title, price from products where price_is_placeholder;
 *
 * RULES FOLLOWED, all inherited from 0054:
 *   - NO BRAND NAMES in any title or description. Reproducing a brand's name
 *     on stock a shop does not carry is the one thing that could cause real
 *     trouble. This is also why most stock "gift hamper" photography was
 *     unusable — see scripts/assets/gift-sets/SOURCES.md.
 *   - A gift set is genuinely SEVERAL THINGS IN ONE BOX. A lone candle under
 *     a "Gift Sets" label reads wrong.
 *   - No invented ratings, sold counts, viewer counts or urgency text. None
 *     of those columns is touched. No `compare_at_price` either — a discount
 *     nobody ever offered is a lie, and it is the only thing that would make
 *     the Super Deals card appear.
 *   - Every photo was DOWNLOADED AND LOOKED AT before being attached, and the
 *     listing text was written from the photograph rather than from the search
 *     query that found it. Sources in scripts/assets/gift-sets/SOURCES.md.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. This script only
 * INSERTs and UPDATEs, so it needs no Supabase management token.
 *
 * Re-running is safe: every step looks before it writes.
 *
 * Usage: node scripts/seed-gift-sets-page.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const ASSETS = process.env.GIFT_SETS_ASSETS || join(__dirname, "assets", "gift-sets");

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
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

/** Upload a local file to a public bucket and hand back its public URL. */
async function upload(bucket, path, file) {
  const full = join(ASSETS, file);
  if (!existsSync(full)) {
    console.log(`  no file ${file} — skipped`);
    return null;
  }
  const bytes = readFileSync(full);
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) {
    console.log(`  upload failed for ${file}: ${(await res.text()).slice(0, 140)}`);
    return null;
  }
  console.log(`  uploaded ${bucket}/${path} (${(bytes.length / 1024).toFixed(0)} KB)`);
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

const GIFT_SETS = "be569a26-53f9-410e-bbe3-2888ad9424d3";
/** The Gift Sets TAB. Its slug is `home`, not `gift-sets` — a known trap in
 *  this repo, and the reason 0053's insert landed on the wrong tab. */
const CIRCLES_BLOCK = "a351d07b-38e1-478d-87a6-73853971ffd9";
const BANNER = "242c5dba-5876-48e9-b67a-8d1730fa03b1";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* --------------------------------------------------------- sub-categories
 *
 * Three, which is exactly what Flowers, Chocolate and Toys have. Every one of
 * the thirteen active products falls into exactly one, and none of the three
 * has fewer than four behind it — a circle that opens onto one product is
 * worse than no circle.
 *
 * The tiles carry no `image_url`: useTileImages() gives each circle the photo
 * of a product genuinely inside it, which is better than artwork because it
 * cannot drift from the catalogue.
 */
const SUBCATEGORIES = [
  { name: "Hampers & Baskets", slug: "hampers-and-baskets", sort_order: 1 },
  { name: "Boxed Sets", slug: "boxed-sets", sort_order: 2 },
  { name: "Candles & Scents", slug: "candles-and-scents", sort_order: 3 },
];

/** Which sub-category each product belongs in, by exact title. The eight
 *  Surprise titles are included: filing them is the only change made to that
 *  shop's rows, and it is reversible with one update. */
const FILED_UNDER = {
  // Surprise Gifts Shop — real shop, real photographs, untouched otherwise.
  "Make Your Own Gift Basket": "hampers-and-baskets",
  "Chocolate Lovers Hamper": "hampers-and-baskets",
  "Picnic Basket & Blanket Set": "hampers-and-baskets",
  "Pink Bunny Gift Box": "boxed-sets",
  "Birthday Wish Box": "boxed-sets",
  "Executive Notebook & Pen Set": "boxed-sets",
  "Candle & Diffuser Cage Set": "candles-and-scents",
  "Birdcage Candle & Diffuser Set": "candles-and-scents",
  // The five placeholder listings created below.
  "Ribboned Gift Box Set with Candle": "boxed-sets",
  "Tea & Candle Evening Box": "candles-and-scents",
  "Candle & Towel Calm Set": "candles-and-scents",
  "Notebook & Candle Keepsake Basket": "hampers-and-baskets",
  "New Baby Keepsake Crate": "hampers-and-baskets",
};

/* ---------------------------------------------------- the two placeholders
 *
 * Named to sit alongside the-gift-atelier, the-basket-house, cocoa-and-co and
 * sucre-bakehouse rather than next to them looking like a different project.
 *
 * Each description says what the shop makes, because that line is what the
 * store page leads with.
 */
const STORES = [
  {
    name: "Wrap & Co.",
    slug: "wrap-and-co",
    city: "Beirut",
    description: "Ready-wrapped gift boxes, made up and ribboned to order.",
    cover: "cover_wrap_and_co.jpg",
    products: [
      {
        file: "01_wrapped_box_pair_candle.jpg",
        title: "Ribboned Gift Box Set with Candle",
        price: 45,
        description:
          "Two kraft gift boxes stacked and tied together with red ribbon under a printed floral card, sent with a scented candle in a glass jar.",
      },
      {
        file: "02_tea_and_candle_box.jpg",
        title: "Tea & Candle Evening Box",
        price: 40,
        description:
          "A glazed stoneware teapot and a matching wide cup, boxed with a scented candle and wrapped in floral paper tied with garden twine.",
      },
      {
        file: "03_candle_and_towel_set.jpg",
        title: "Candle & Towel Calm Set",
        price: 35,
        description:
          "A scented candle in an amber glass jar with two rolled cotton hand towels and a bunch of dried flowers, presented on a turned wooden dish.",
      },
    ],
  },
  {
    name: "The Keepsake Room",
    slug: "the-keepsake-room",
    city: "Jounieh",
    description: "Keepsake baskets for new babies, new homes and thank-yous.",
    cover: "cover_the_keepsake_room.jpg",
    products: [
      {
        file: "04_notebook_candle_basket.jpg",
        title: "Notebook & Candle Keepsake Basket",
        price: 55,
        description:
          "A hardback notebook, a scented candle and two small keepsake boxes packed into a woven tray on wood-wool, tied across with a wide cream ribbon.",
      },
      {
        file: "05_new_baby_crate.jpg",
        title: "New Baby Keepsake Crate",
        price: 50,
        description:
          "A small wooden crate lined with a spotted muslin wrap, holding cotton scratch-free mittens, folded washcloths, a natural bath sponge, a drawstring pouch and a giraffe teether.",
      },
    ],
  },
];

/* ================================================================ run it */

let createdStores = 0;
let createdProducts = 0;
let photographed = 0;

/* ------------------------------------------------------- sub-categories */

const subIdBySlug = new Map();
for (const s of SUBCATEGORIES) {
  let [row] = await rest(
    `subcategories?select=id,slug&slug=eq.${s.slug}&category_id=eq.${GIFT_SETS}`
  );
  if (!row) {
    [row] = await rest("subcategories", {
      method: "POST",
      body: JSON.stringify({ ...s, category_id: GIFT_SETS, is_active: true }),
    });
    console.log(`sub-category created: ${s.name}`);
  }
  subIdBySlug.set(s.slug, row.id);
}

/* ------------------------------------------- the circles that filter them */

for (const s of SUBCATEGORIES) {
  const [existing] = await rest(
    `browse_tiles?select=id&block_id=eq.${CIRCLES_BLOCK}&link_value=eq.${s.slug}`
  );
  if (existing) continue;
  await rest("browse_tiles", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      block_id: CIRCLES_BLOCK,
      label: s.name,
      link_type: "collection",
      link_value: s.slug,
      position: s.sort_order,
      is_active: true,
    }),
  });
  console.log(`circle added: ${s.name}`);
}

/* ---------------------------------------------------- stores and stock */

for (const store of STORES) {
  let [partner] = await rest(`partners?select=id,name,cover_image_url&slug=eq.${store.slug}`);
  if (!partner) {
    [partner] = await rest("partners", {
      method: "POST",
      body: JSON.stringify({
        name: store.name,
        slug: store.slug,
        description: store.description,
        status: "active",
        is_live: true,
        country: "LB",
        city: store.city,
        commission_rate: 0.15,
        offers_gift_wrap: true,
      }),
    });
    createdStores++;
    console.log(`store created: ${store.name}`);
  }

  // The strip draws the store as a 160x110 card with the cover behind it, so
  // a store with no cover is a grey rectangle with a name on it.
  if (!partner.cover_image_url) {
    const url = await upload("partner-logos", `covers/${store.slug}.jpg`, store.cover);
    if (url) {
      await rest(`partners?id=eq.${partner.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ cover_image_url: url }),
      });
    }
  }

  for (const p of store.products) {
    const slug = slugify(p.title);
    let [row] = await rest(`products?select=id,title&slug=eq.${slug}`);

    if (!row) {
      [row] = await rest("products", {
        method: "POST",
        body: JSON.stringify({
          title: p.title,
          slug,
          description: p.description,
          price: p.price,
          currency: "USD",
          category_id: GIFT_SETS,
          subcategory_id: subIdBySlug.get(FILED_UNDER[p.title]) ?? null,
          partner_id: partner.id,
          stock_quantity: 10,
          is_active: true,
          same_day: true,
          // Invented price. This flag is what makes it removable in one query.
          price_is_placeholder: true,
        }),
      });
      createdProducts++;
    }

    const existing = await rest(`product_images?select=id&product_id=eq.${row.id}`);
    if (existing.length) continue;

    const storagePath = `gift-sets/${row.id}.jpg`;
    const publicUrl = await upload("product-images", storagePath, p.file);
    if (!publicUrl) {
      console.log(`  ${p.title} — left WITHOUT a photo`);
      continue;
    }
    await rest("product_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: row.id,
        partner_id: partner.id,
        storage_path: storagePath,
        is_primary: true,
        sort_order: 0,
      }),
    });
    photographed++;
  }
}

/* ------------------------------------ a cover for the one REAL shop, too
 *
 * Surprise Gifts Shop leads the store strip (it has the most stock), and the
 * strip draws each shop as a photo card — so with no cover it was leading
 * with a grey rectangle. The image used is one of the shop's OWN photographs,
 * already in the repo at scripts/assets/surprise/, which is the only kind of
 * picture that may stand for them: Marwan closed the deal by phone on
 * 2026-08-15 and the shop said CADO can use anything from their Instagram.
 *
 * Nothing else about that partner or its eight listings is touched here.
 */
const [surprise] = await rest("partners?select=id,cover_image_url&slug=eq.surprise-gifts-shop");
if (surprise && !surprise.cover_image_url) {
  const bytes = readFileSync(join(__dirname, "assets", "surprise", "01_pink_bunny_box.jpg"));
  const res = await fetch(
    `${url}/storage/v1/object/partner-logos/covers/surprise-gifts-shop.jpg`,
    { method: "POST", headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: bytes }
  );
  if (res.ok) {
    await rest(`partners?id=eq.${surprise.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        cover_image_url: `${url}/storage/v1/object/public/partner-logos/covers/surprise-gifts-shop.jpg`,
      }),
    });
    console.log("Surprise Gifts Shop cover set from their own photograph");
  } else {
    console.log(`  Surprise cover upload failed: ${(await res.text()).slice(0, 140)}`);
  }
}

/* ------------------------------------------- file everything else in place */

let filed = 0;
for (const [title, sub] of Object.entries(FILED_UNDER)) {
  const rows = await rest(
    `products?select=id,subcategory_id&category_id=eq.${GIFT_SETS}&is_active=eq.true&title=eq.${encodeURIComponent(
      title
    )}`
  );
  for (const r of rows) {
    if (r.subcategory_id) continue;
    await rest(`products?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ subcategory_id: subIdBySlug.get(sub) }),
    });
    filed++;
  }
}

/* ------------------------------------------------------------ the hero
 *
 * Every browse_banners row in the database had `image_url = null`, so this
 * banner was falling through to TabPanel's `fallbackImage` and borrowing a
 * square product photo, stretched to 2:1. Now it has artwork of its own.
 *
 * The subcopy also had to change: it read "Teddies, mugs and chocolates, made
 * up as one gift", which described the Gift Atelier stock that was retired
 * when Surprise came on. It now describes what is actually in the tab.
 */
const [banner] = await rest(`browse_banners?select=id,image_url&id=eq.${BANNER}`);
if (banner) {
  const heroUrl = banner.image_url ?? (await upload("product-images", "banners/gift-sets-hero.jpg", "hero_gift_boxes.jpg"));
  await rest(`browse_banners?id=eq.${BANNER}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      image_url: heroUrl,
      headline: "Boxed up, ready to give",
      subcopy: "Hampers, candle sets and ready-made boxes from Lebanese shops.",
    }),
  });
  console.log("hero banner updated");
}

console.log(
  `\n${createdStores} stores, ${createdProducts} products, ${photographed} photos, ${filed} products filed under a sub-category.`
);
