/**
 * Home & Appliances — a new category, built to the same standard as the rest.
 *
 * There was no home category. `home-gifts` exists in the database but it is
 * the retired home-decor category: switched off, zero products, and its name
 * literally reads "Gift Sets (old home decor — switched off)". This creates a
 * real one rather than resurrecting that.
 *
 * WHAT IT CREATES, all idempotent — safe to re-run, nothing is made twice:
 *   1. the category row and four sub-categories
 *   2. one placeholder shop, Cedar & Clay
 *   3. eleven products with photos, plus one moved in from Electronics
 *   4. the browse tab and its blocks, so the tab renders
 *   5. recipient and occasion tags, so the filters and chips work on day one
 *
 * EVERY PRICE IS INVENTED and every one is flagged, so the whole lot comes
 * out in a single query when real pricing arrives:
 *
 *   select title, price from products where price_is_placeholder;
 *
 * THE PHOTO RULE, which matters more than filling the grid: every image below
 * was rendered and LOOKED AT before being listed here — not chosen from a
 * filename, an alt tag or a search result. Three candidates were rejected on
 * sight: a pair of hot-pink and turquoise towels that fight the brand, a bowls
 * shot too dark to read, and a moka pot with the maker's name across it.
 * Migration 0054 bans brand names in titles, and a legible third-party mark on
 * a listing from a shop that does not carry that brand is the same problem
 * with a picture attached.
 *
 * Sources are recorded in scripts/assets/home-appliances/SOURCES.md. Images
 * are fetched from images.unsplash.com at run time rather than committed, the
 * same way seed-sport-category.mjs works.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local.
 *
 * Usage: node scripts/seed-home-appliances.mjs
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

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ============================================================ 1. category */

let [cat] = await rest(`categories?slug=eq.home-appliances&select=id`);
if (!cat) {
  [cat] = await rest("categories", {
    method: "POST",
    body: JSON.stringify({
      name: "Home & Appliances",
      slug: "home-appliances",
      is_active: true,
      // Last of the eleven, after Sport.
      sort_order: 11,
    }),
  });
  console.log("category created");
} else {
  console.log("category exists");
}
const CATEGORY = cat.id;

/* ------------------------------------------------------- sub-categories */

const SUBS = [
  { name: "Coffee & Tea", sort: 1 },
  { name: "Kitchen", sort: 2 },
  { name: "Bedding & Towels", sort: 3 },
  { name: "Home Tech", sort: 4 },
];

const subId = {};
for (const s of SUBS) {
  const slug = slugify(s.name);
  let [row] = await rest(
    `subcategories?slug=eq.${slug}&category_id=eq.${CATEGORY}&select=id`
  );
  if (!row) {
    [row] = await rest("subcategories", {
      method: "POST",
      body: JSON.stringify({
        category_id: CATEGORY,
        name: s.name,
        slug,
        sort_order: s.sort,
        is_active: true,
      }),
    });
  }
  subId[s.name] = row.id;
}
console.log(`sub-categories ready: ${Object.keys(subId).join(", ")}`);

/* =============================================================== 2. shop
 *
 * A placeholder, and flagged as one in its description. No existing shop
 * sells homeware — the closest is The Basket House, which sells baskets —
 * so the category needs somewhere for its stock to live. Pre-launch
 * placeholder shops are the established pattern here (see
 * seed-sport-category.mjs, which added two).
 */
const SHOP = "Cedar & Clay";
let [shop] = await rest(`partners?name=eq.${encodeURIComponent(SHOP)}&select=id`);
if (!shop) {
  [shop] = await rest("partners", {
    method: "POST",
    body: JSON.stringify({
      name: SHOP,
      slug: "cedar-and-clay",
      tagline: "Kitchen and home, made to keep",
      description:
        "Placeholder shop for the Home & Appliances category, added before launch. Stock, prices and photography are stand-ins until a real homeware partner signs up.",
      city: "Beirut",
      country: "Lebanon",
      status: "active",
      is_live: true,
      offers_gift_wrap: true,
    }),
  });
  console.log("shop created");
} else {
  console.log("shop exists");
}
const PARTNER = shop.id;

/* ============================================================ 3. products
 *
 * `sub` picks the sub-category, `photo` is the Unsplash id, `tags` are the
 * recipient tags and `occasions` the occasion tags — set here rather than in
 * a later pass so the tab's Gift-for tiles and occasion chips work the first
 * time it is opened.
 */
const PRODUCTS = [
  {
    title: "Pour-Over Coffee Set",
    sub: "Coffee & Tea",
    price: 38,
    photo: "1610874150308-a1e6f8c905d9",
    tags: ["him", "her", "friend", "colleague"],
    occasions: ["housewarming", "birthday", "visiting-someone", "graduation"],
  },
  {
    title: "Cast Iron Teapot",
    sub: "Coffee & Tea",
    price: 52,
    photo: "1578920181445-0a0b285b9757",
    tags: ["mother", "father", "friend"],
    occasions: ["housewarming", "mothers-day", "visiting-someone", "eid"],
  },
  {
    title: "Stovetop Espresso Maker",
    sub: "Coffee & Tea",
    price: 34,
    photo: "1638129284529-bed6d6f588e7",
    tags: ["him", "friend", "colleague"],
    occasions: ["housewarming", "birthday", "graduation"],
  },
  {
    title: "Gooseneck Electric Kettle",
    sub: "Coffee & Tea",
    price: 75,
    photo: "1571552879083-e93b6ea70d1d",
    tags: ["him", "her", "partner"],
    occasions: ["housewarming", "wedding", "anniversary"],
  },
  {
    title: "Stoneware Serving Bowl Set",
    sub: "Kitchen",
    price: 68,
    photo: "1764521727337-fe33394efc4f",
    tags: ["mother", "her", "partner", "friend"],
    occasions: ["housewarming", "wedding", "mothers-day", "visiting-someone"],
  },
  {
    title: "Olive Wood Board & Knife Set",
    sub: "Kitchen",
    price: 45,
    photo: "1690983322029-eee73c0afa14",
    tags: ["him", "father", "friend"],
    occasions: ["housewarming", "wedding", "eid", "visiting-someone"],
  },
  {
    title: "Striped Ceramic Storage Jars",
    sub: "Kitchen",
    price: 40,
    photo: "1561696434-f5c2f1176cb7",
    tags: ["mother", "her", "friend"],
    occasions: ["housewarming", "mothers-day", "visiting-someone"],
  },
  {
    title: "Glazed Ceramic Serving Bowl",
    sub: "Kitchen",
    price: 22,
    photo: "1603697227834-14e3694abc7b",
    tags: ["mother", "her", "friend", "colleague"],
    occasions: ["housewarming", "visiting-someone", "eid"],
  },
  {
    title: "Turkish Cotton Towel Set",
    sub: "Bedding & Towels",
    price: 55,
    photo: "1760722974657-f64bce2f9cc5",
    tags: ["mother", "her", "partner"],
    occasions: ["housewarming", "wedding", "mothers-day", "get-well"],
  },
  {
    title: "Linen Bedding Set",
    sub: "Bedding & Towels",
    price: 120,
    photo: "1617325247661-675ab4b64ae2",
    tags: ["partner", "her", "him"],
    occasions: ["wedding", "housewarming", "anniversary", "engagement"],
  },
  {
    title: "Washed Linen Throw",
    sub: "Bedding & Towels",
    price: 65,
    photo: "1518019671582-55004f1bc9ab",
    tags: ["mother", "her", "friend"],
    occasions: ["housewarming", "get-well", "mothers-day", "visiting-someone"],
  },
];

for (const p of PRODUCTS) {
  const slug = slugify(p.title);
  let [row] = await rest(`products?slug=eq.${slug}&select=id`);
  if (row) {
    console.log(`  product exists: ${p.title}`);
    continue;
  }
  [row] = await rest("products", {
    method: "POST",
    body: JSON.stringify({
      partner_id: PARTNER,
      category_id: CATEGORY,
      subcategory_id: subId[p.sub],
      title: p.title,
      slug,
      price: p.price,
      // Every one of these is a guess. Flagged so they can all be found.
      price_is_placeholder: true,
      currency: "USD",
      stock_quantity: 12,
      is_active: true,
      same_day: true,
      gift_wrap_available: true,
      recipient_tags: p.tags,
      occasion_tags: p.occasions,
      review_status: "approved",
    }),
  });

  const path = `seed/${row.id}.jpg`;
  await upload("product-images", path, await unsplash(p.photo));
  await rest("product_images", {
    method: "POST",
    // partner_id is NOT NULL on product_images — it is denormalised there so
      // the storage RLS policy can check ownership without a join.
      body: JSON.stringify({ product_id: row.id, partner_id: PARTNER, storage_path: path, is_primary: true }),
  });
  console.log(`  created + photo: ${p.title}`);
}

/* ------------------------------- move the desk lamp out of Electronics ---
 *
 * It is a desk lamp. It sat in Electronics because that was the closest tab
 * that existed at the time; Home Tech is where it belongs, and it gives that
 * sub-category something real in it rather than a seeded stand-in.
 */
const [lamp] = await rest(`products?title=eq.Adjustable%20Desk%20Lamp&select=id,category_id`);
if (lamp && lamp.category_id !== CATEGORY) {
  await rest(`products?id=eq.${lamp.id}`, {
    method: "PATCH",
    body: JSON.stringify({ category_id: CATEGORY, subcategory_id: subId["Home Tech"] }),
  });
  console.log("moved Adjustable Desk Lamp into Home Tech");
}

/* ============================================================== 4. the tab
 *
 * A tab with no `browse_blocks` rows renders an empty panel. The category
 * tabs no longer read those rows for their sections — they derive everything
 * from the category's products — but the tab still needs to EXIST in
 * browse_tabs to appear in the tab bar at all.
 */
let [tab] = await rest(`browse_tabs?slug=eq.home-appliances&select=id`);
if (!tab) {
  [tab] = await rest("browse_tabs", {
    method: "POST",
    body: JSON.stringify({
      slug: "home-appliances",
      label: "Home & Appliances",
      position: 12,
      accent_token: "tab-home",
      filter: { category_slug: "home-appliances" },
      is_active: true,
    }),
  });
  console.log("browse tab created");
} else {
  console.log("browse tab exists");
}

/* One product_feed block, which is what the panel needs to exist. */
const blocks = await rest(`browse_blocks?tab_id=eq.${tab.id}&select=id,type`);
if (!blocks.some((b) => b.type === "product_feed")) {
  await rest("browse_blocks", {
    method: "POST",
    body: JSON.stringify({
      tab_id: tab.id,
      type: "product_feed",
      position: 1,
      title: null,
      config: {},
      is_active: true,
    }),
  });
  console.log("product_feed block created");
}

const count = await rest(
  `products?category_id=eq.${CATEGORY}&is_active=eq.true&select=id`
);
console.log(`\nDone. Home & Appliances has ${count.length} live products.`);
