/**
 * Adds the catalogue that two tabs were missing, and fixes one photo.
 *
 * WHY THIS IS A SEED SCRIPT AND NOT A MIGRATION
 *
 * Migrations 0089 and 0090 could only move products that already existed. They
 * left two honest holes that no amount of re-filing can close:
 *
 *   - Fashion had NO menswear at all. Both products under "Men" were
 *     photographed on women, so the Men circle came off the page entirely.
 *   - Chocolate was down to six products once the two baskets containing no
 *     chocolate went to Gift Sets, where they belonged.
 *
 * A hole in the catalogue is filled with catalogue, and catalogue means rows
 * plus real photographs in the bucket, which is a script rather than SQL.
 *
 * THE PHOTOS
 *
 * Every image below was downloaded and looked at before it was chosen, and the
 * Unsplash id is recorded beside each product so any of them can be traced
 * back. Six candidates were rejected on sight and are listed at the bottom of
 * this comment so nobody re-picks them:
 *
 *   1626753846051  polo      — "BLUE TYGA" readable on the collar label
 *   1585412459272  blazer    — "SITUATION CONTROL" printed on the hanger
 *   1620799139507  t-shirt   — a Kodak camera and two pages of body text
 *   1602515931029  denim     — shop posters with large lettering either side
 *   1602810318383  shirts    — usable, but warmer and busier than the one kept
 *   1491245257527  knit      — a single flat knit, too close to a blanket
 *
 * The rule they were tested against: the image shows the thing the label says,
 * it is a gift item rather than a lifestyle scene, and it carries no baked-in
 * text, price, watermark or real brand mark.
 *
 * Usage:  node scripts/seed-menswear-and-chocolate.mjs [--dry]
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";

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
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function upload(path, buf) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

/** Unsplash serves the file itself; nothing here needs an API key. */
async function photo(id) {
  const res = await fetch(`https://images.unsplash.com/photo-${id}?w=1400&q=80&fm=jpg`);
  if (!res.ok) throw new Error(`unsplash ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/* -------------------------------------------------------------------------- */
/* What gets added                                                            */
/* -------------------------------------------------------------------------- */

/*
 * Prices are in USD and sit inside the spread the rest of the catalogue
 * already uses, so the "Under $50" and "Under $100" tiles keep working and no
 * tile suddenly opens on an empty grid. Nothing is marked a staff pick, gift
 * ready or on sale: those flags are claims, and a brand new product has not
 * earned any of them.
 */
const PRODUCTS = [
  /* --- Fashion > Men, Anchor & Oak ------------------------------------- */
  {
    title: "Poplin Cotton Dress Shirt",
    slug: "poplin-cotton-dress-shirt",
    price: 58,
    store: "anchor-and-oak",
    category: "fashion",
    subcategory: "men",
    photo: "1602810316693-3667c854239a", // four folded shirts, white marble
    description:
      "A crisp poplin shirt with a soft collar, cut for everyday wear. Shown in the four colours we stock.",
    recipient: ["him", "dad", "partner"],
    occasion: ["birthday", "graduation", "anniversary"],
  },
  {
    title: "Piqué Cotton Polo",
    slug: "pique-cotton-polo",
    price: 42,
    store: "anchor-and-oak",
    category: "fashion",
    subcategory: "men",
    photo: "1671438118097-479e63198629", // white polo on a hanger
    description: "A ribbed-collar piqué polo in breathable cotton.",
    recipient: ["him", "dad", "friend"],
    occasion: ["birthday", "graduation"],
  },
  {
    title: "Heavyweight Cotton Tee",
    slug: "heavyweight-cotton-tee",
    price: 28,
    store: "anchor-and-oak",
    category: "fashion",
    subcategory: "men",
    photo: "1651761179569-4ba2aa054997", // single plain tee, grey ground
    description: "A heavier cotton tee that holds its shape through the wash.",
    recipient: ["him", "friend", "partner"],
    occasion: ["birthday"],
  },
  /* --- Fashion > Men, Cedar Street Fashion ------------------------------ */
  {
    title: "Tan Leather Jacket",
    slug: "tan-leather-jacket",
    price: 180,
    store: "cedar-street-fashion",
    category: "fashion",
    subcategory: "men",
    photo: "1623854156816-4c4fc355ffc7", // tan leather jacket on a wall hook
    description: "A soft tan leather jacket with a stand collar and snap front.",
    recipient: ["him", "partner", "dad"],
    occasion: ["birthday", "anniversary"],
  },

  /* --- Chocolate > Chocolate Boxes, Cocoa & Co. ------------------------- */
  {
    title: "Praline Selection Box",
    slug: "praline-selection-box",
    price: 38,
    store: "cocoa-and-co",
    category: "chocolate",
    subcategory: "chocolate-boxes",
    photo: "1687795097254-f019f9d7fd17", // open praline box, gold tray
    description: "Milk, dark and white pralines in a gold-lined box.",
    recipient: ["her", "mom", "friend", "partner"],
    occasion: ["birthday", "anniversary", "valentine", "mothers-day", "visiting-someone"],
  },
  {
    title: "Ribboned Chocolate Gift Box",
    slug: "ribboned-chocolate-gift-box",
    price: 45,
    store: "cocoa-and-co",
    category: "chocolate",
    subcategory: "chocolate-boxes",
    photo: "1481391319762-47dff72954d9", // wrapped chocolates, ribbon
    description: "Wrapped chocolates in a tin, tied and ready to hand over.",
    recipient: ["her", "him", "mom", "friend"],
    occasion: ["birthday", "anniversary", "valentine", "visiting-someone", "get-well"],
  },
  {
    title: "Assorted Truffle Box",
    slug: "assorted-truffle-box",
    price: 34,
    store: "cocoa-and-co",
    category: "chocolate",
    subcategory: "chocolate-boxes",
    photo: "1526081715791-7c538f86060e", // twenty-piece truffle tray
    description: "Twenty truffles across milk and dark, no two the same.",
    recipient: ["her", "him", "mom", "dad", "friend"],
    occasion: ["birthday", "visiting-someone", "get-well"],
  },
  /* --- Chocolate > Chocolate Boxes, Sucré Bakehouse --------------------- */
  {
    title: "Chocolatier's Signature Box",
    slug: "chocolatiers-signature-box",
    price: 52,
    store: "sucre-bakehouse",
    category: "chocolate",
    subcategory: "chocolate-boxes",
    photo: "1614631016624-cb89bceec02c", // hand-finished box, tissue lining
    description: "Hand-finished chocolates under tissue in a hinged box.",
    recipient: ["her", "him", "partner", "mom"],
    occasion: ["anniversary", "valentine", "engagement", "wedding"],
  },
  {
    title: "Nine-Piece Milk Praline Tray",
    slug: "nine-piece-milk-praline-tray",
    price: 26,
    store: "sucre-bakehouse",
    category: "chocolate",
    subcategory: "chocolate-boxes",
    photo: "1734692928513-351516b38869", // nine moulded pralines on kraft
    description: "Nine moulded milk pralines, one of each shape.",
    recipient: ["her", "friend", "kids", "mom"],
    occasion: ["birthday", "visiting-someone"],
  },
];

/*
 * The Merino Crewneck keeps its title, price and store; only its photograph
 * and its bucket change.
 *
 * Its picture was a flat-lay of several knits scattered on autumn leaves — a
 * mood shot, not a product you could point at, and with no reason in it to
 * call the garment men's or women's. 0090 read that as grounds to move it to
 * Women, which was wrong. It is a crewneck, so it goes back to Men with a
 * photograph of folded knitwear on a plain ground.
 */
const REPHOTO = {
  title: "Merino Crewneck",
  photo: "1601379327928-bedfaf9da2d0", // folded knits, white ground
  subcategory: "men",
  description: "A fine-gauge merino crewneck. Shown with the rest of the knit range.",
};

/* -------------------------------------------------------------------------- */

const [cats, subs, partners] = await Promise.all([
  rest("categories?select=id,slug"),
  rest("subcategories?select=id,slug,category_id"),
  rest("partners?select=id,slug"),
]);
const catId = (slug) => cats.find((c) => c.slug === slug)?.id;
const subId = (cat, slug) =>
  subs.find((s) => s.slug === slug && s.category_id === catId(cat))?.id;
const partnerId = (slug) => partners.find((p) => p.slug === slug)?.id;

for (const p of PRODUCTS) {
  const partner = partnerId(p.store);
  const category = catId(p.category);
  const subcategory = subId(p.category, p.subcategory);
  if (!partner || !category || !subcategory) {
    throw new Error(`${p.title}: store/category/subcategory not found — nothing was written`);
  }

  const existing = await rest(`products?select=id&slug=eq.${p.slug}`);
  if (existing.length) {
    console.log(`  = ${p.title} already exists, skipped`);
    continue;
  }
  if (DRY) {
    console.log(`  + ${p.title} (${p.store}) $${p.price} — dry run`);
    continue;
  }

  const [row] = await rest("products", {
    method: "POST",
    body: JSON.stringify({
      partner_id: partner,
      category_id: category,
      subcategory_id: subcategory,
      title: p.title,
      slug: p.slug,
      description: p.description,
      price: p.price,
      currency: "USD",
      stock_quantity: 20,
      recipient_tags: p.recipient,
      occasion_tags: p.occasion,
      is_active: true,
    }),
  });

  const path = `${partner}/${row.id}/real.jpg`;
  await upload(path, await photo(p.photo));
  await rest("product_images", {
    method: "POST",
    body: JSON.stringify({
      product_id: row.id,
      partner_id: partner,
      storage_path: path,
      is_primary: true,
    }),
  });
  console.log(`  + ${p.title} (${p.store}) $${p.price}`);
}

/* --- the re-photograph ---------------------------------------------------- */

const [crew] = await rest(
  `products?select=id,partner_id&title=eq.${encodeURIComponent(REPHOTO.title)}`
);
if (!crew) {
  console.log(`  ! ${REPHOTO.title} not found — its photo was left alone`);
} else if (DRY) {
  console.log(`  ~ ${REPHOTO.title} would be re-photographed and moved to Men — dry run`);
} else {
  // A NEW path, so the original stays in the bucket and the CDN cannot serve a
  // stale copy of the old one.
  const path = `${crew.partner_id}/${crew.id}/knit.jpg`;
  await upload(path, await photo(REPHOTO.photo));
  await rest(`product_images?product_id=eq.${crew.id}&is_primary=is.true`, {
    method: "PATCH",
    body: JSON.stringify({ storage_path: path }),
  });
  await rest(`products?id=eq.${crew.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      subcategory_id: subId("fashion", REPHOTO.subcategory),
      description: REPHOTO.description,
    }),
  });
  console.log(`  ~ ${REPHOTO.title} re-photographed and moved back to Men`);
}

console.log("\nDone.");
