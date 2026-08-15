/**
 * Electronics — a store, eight products, six photos and a hero.
 *
 * Before this ran, the Electronics category held ZERO products, had no
 * partner store and no sub-categories. Its banner said so, honestly:
 *
 *   "Electronics, coming soon" / "No CADO store stocks these yet."
 *
 * Stocking the category makes that copy false, so this script rewrites it in
 * the same breath. Never leave a "coming soon" line sitting above a full grid.
 *
 * WHAT IS INVENTED HERE, PLAINLY: the shop and every price. CADO is
 * pre-launch — nobody has the app but Marwan and every partner store is a
 * placeholder to be swapped for a real shop later — so a placeholder
 * electronics store is expected and correct. Every product row is flagged
 * `price_is_placeholder = true`, which is what makes the whole lot findable
 * and removable in one query:
 *
 *   select title, price from products where price_is_placeholder;
 *
 * NO BRAND NAMES in titles or descriptions. Migration 0054 set that rule and
 * it matters double here: reproducing a brand's name on stock that shop does
 * not actually carry is the one thing that could cause real trouble.
 *
 * No invented ratings, sold counts, viewer counts or urgency text — none of
 * those columns are touched.
 *
 * TWO PRODUCTS GET NO PHOTO ON PURPOSE. The instant camera and the digital
 * photo frame are listed without an image, because no correct AND unbranded
 * photograph of either exists on Unsplash. A missing photo reads as "not shot
 * yet", which is true; a near-enough photo is a promise about what arrives in
 * the box, and mismatched photos cause refunds. The reasoning for each is
 * written out in scripts/assets/electronics/SOURCES.md.
 *
 * Every photo that IS attached was downloaded and LOOKED AT first — several
 * of them again, zoomed in on the product, to catch a logo the full-size view
 * hid. One flat-lay was rejected only at that second look. Source URL for
 * each is in SOURCES.md.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. This script only
 * INSERTs and UPDATEs, so it needs no Supabase management token.
 *
 * Safe to re-run: every write checks for the row first, and the storage
 * upload upserts.
 *
 * Usage: node scripts/seed-electronics.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const ASSETS = process.env.ELECTRONICS_ASSETS || join(__dirname, "assets", "electronics");

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
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

/** Uploads bytes to the product-images bucket and returns the storage path. */
async function upload(storagePath, bytes) {
  const res = await fetch(`${url}/storage/v1/object/product-images/${storagePath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${storagePath}: ${(await res.text()).slice(0, 200)}`);
  return storagePath;
}

const ELECTRONICS_CATEGORY = "5f80faa3-535c-4a39-96a4-b666f3eb2925";
const ELECTRONICS_BANNER_BLOCK = "5116d218-05f8-458b-95b7-f5a0df266264";

/**
 * Eight giftable items — the kind of electronics somebody actually wraps.
 * No fridges, no laptops.
 *
 * `file: null` means the listing ships without a photo. That is a decision,
 * not an omission; see SOURCES.md.
 */
const PRODUCTS = [
  {
    file: "01_over_ear_headphones.jpg",
    title: "Over-Ear Wireless Headphones",
    price: 90,
    description:
      "Padded over-ear headphones with a folding headband, soft leatherette cushions and an on-cup control for calls and volume.",
  },
  {
    file: "02_wireless_earbuds.jpg",
    title: "Wireless Earbuds & Charging Case",
    price: 55,
    description:
      "A pair of in-ear buds in a pocket charging case that tops them up between uses, with a four-light battery gauge on the front.",
  },
  {
    file: "03_portable_speaker.jpg",
    title: "Portable Bluetooth Speaker",
    price: 45,
    description:
      "A palm-sized square speaker with a perforated front grille and a leather carry loop, small enough for a bag or a bedside table.",
  },
  {
    // No photo. Every free instant-camera photograph on Unsplash shows the
    // brand plainly on the front of the camera.
    file: null,
    title: "Instant Print Camera",
    price: 110,
    description:
      "A pocket camera that prints the picture straight away on credit-card sized film, with a built-in flash and a wrist strap. Film sold separately.",
  },
  {
    file: "05_smart_watch.jpg",
    title: "Round Smart Watch",
    price: 95,
    description:
      "A round-face smart watch with a soft silicone strap, showing time, steps, distance and heart rate, and buzzing for calls and messages.",
  },
  {
    file: "06_power_bank.jpg",
    title: "Compact Power Bank",
    price: 35,
    description:
      "A slim battery pack with a marbled shell, a fast USB port and a USB-C input, sized to charge a phone through a full day out.",
  },
  {
    file: "07_desk_lamp.jpg",
    title: "Adjustable Desk Lamp",
    price: 60,
    description:
      "A jointed metal desk lamp in polished chrome, with two hinged arms and a weighted round base so it stays put wherever it is aimed.",
  },
  {
    // No photo. Unsplash has no photograph of a digital photo frame; the
    // searches return ordinary picture frames, tablets and laptops.
    file: null,
    title: "Digital Photo Frame",
    price: 80,
    description:
      "A framed screen that cycles through a set of photographs, sitting on a shelf or a desk like an ordinary frame.",
  },
];

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ---------------------------------------------------------------- partner
 *
 * A placeholder electronics shop, named to match the register of the other
 * placeholder stores — cedar-street-fashion, little-explorers-toys,
 * solstice-studio, baseline-sports. Modelled on how 0054 created Baseline
 * Sports for the Sport category.
 */

let [partner] = await rest("partners?select=id,name&slug=eq.bright-spark-electronics");
if (!partner) {
  [partner] = await rest("partners", {
    method: "POST",
    body: JSON.stringify({
      name: "Bright Spark Electronics",
      slug: "bright-spark-electronics",
      description: "Headphones, speakers, cameras and small gadgets worth wrapping.",
      status: "active",
      is_live: true,
      commission_rate: 0.15,
    }),
  });
  console.log(`partner created: ${partner.name}`);
} else {
  console.log(`partner already present: ${partner.name}`);
}

/* --------------------------------------------------------------- products */

let created = 0;
let photographed = 0;
let deliberatelyBlank = 0;

for (const p of PRODUCTS) {
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
        category_id: ELECTRONICS_CATEGORY,
        partner_id: partner.id,
        // Real stock, deliberately. The store strip filters on
        // stock_quantity > 0 and is_active = true, so a zero-stock product
        // makes the whole shop vanish from the strip.
        stock_quantity: 12,
        is_active: true,
        same_day: true,
        // Invented price. This flag is what makes it findable and removable.
        price_is_placeholder: true,
      }),
    });
    created++;
    console.log(`  created: ${p.title} — $${p.price} (placeholder price)`);
  }

  if (!p.file) {
    deliberatelyBlank++;
    console.log(`  ${p.title} — LEFT WITHOUT A PHOTO on purpose (see SOURCES.md)`);
    continue;
  }

  const existing = await rest(`product_images?select=id&product_id=eq.${row.id}`);
  if (existing.length) continue;

  const path = join(ASSETS, p.file);
  if (!existsSync(path)) {
    console.log(`  no image file for ${p.title} (${p.file}) — listing left without a photo`);
    continue;
  }
  const bytes = readFileSync(path);
  const storagePath = await upload(`electronics/${row.id}.jpg`, bytes);

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
  console.log(`  ${p.title} — photo ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(
  `\n${created} products created, ${photographed} photos attached, ${deliberatelyBlank} deliberately left blank.`
);

/* ------------------------------------------------------------ the banner
 *
 * The hero image first. Every browse_banners row in the whole database has
 * image_url = null today, so heroes fall back to a photo of some product in
 * that tab (see fallbackImage in TabPanel.tsx). This is the first row to get
 * artwork of its own.
 *
 * The file goes into the SAME Supabase Storage bucket as the product photos
 * rather than being linked from Unsplash, so the hero does not depend on a
 * third-party host staying up. banner.image_url is used directly as an
 * <img src>, so it wants a full public URL.
 *
 * The image is cropped 2:1 with the headphones pushed right of centre,
 * because BannerCarousel lays the tab's accent — navy, --tab-electronics —
 * over the left ~60% for the white headline to sit on.
 */
const heroFile = join(ASSETS, "hero_electronics.jpg");
let heroUrl = null;
if (existsSync(heroFile)) {
  const heroPath = await upload("electronics/hero-electronics.jpg", readFileSync(heroFile));
  heroUrl = `${url}/storage/v1/object/public/product-images/${heroPath}`;
  console.log(`hero uploaded: ${heroUrl}`);
} else {
  console.log("hero image file missing — banner image_url left as it was");
}

/* The copy. The old line was an honest empty state and it is now false:
 * a CADO store does stock these. Rewritten in the register of the other
 * tabs — Shoes reads "Step out today" / "Ordered this morning, worn
 * tonight." / "SHOP NOW" — short, concrete, about getting it today.
 *
 * link_type moves from 'url' (which sent people to the homepage, the right
 * thing to do when the category was empty) to 'filter' with an empty object,
 * matching every other seeded tab. TabPanel reads that as "no explicit
 * destination" and opens the gift finder, which is where SHOP NOW goes
 * everywhere else. */
const patch = {
  headline: "Unboxed tonight",
  subcopy: "Ordered this morning, plugged in by dinner.",
  cta_label: "SHOP NOW",
  link_type: "filter",
  link_value: "{}",
};
if (heroUrl) patch.image_url = heroUrl;

const [banner] = await rest(`browse_banners?block_id=eq.${ELECTRONICS_BANNER_BLOCK}`, {
  method: "PATCH",
  body: JSON.stringify(patch),
});
console.log(`banner updated: "${banner.headline}" / "${banner.subcopy}" / ${banner.cta_label}`);
