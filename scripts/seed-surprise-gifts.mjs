/**
 * Surprise Gifts Shop — a REAL partner, with their own photographs.
 *
 * Marwan closed the deal by phone on 2026-08-15 and the shop said CADO can
 * use anything from their Instagram (@surprisegiftsshop). So unlike every
 * other store in the catalogue today, this one is not a placeholder: the shop
 * exists, the address and phone below are theirs, and every photo attached
 * here is a photograph of a box they actually sell.
 *
 * What is NOT real yet: the PRICES. The shop's Instagram captions do not
 * quote any, so the numbers here are invented and every row is flagged
 * `price_is_placeholder = true`. They come out in one query:
 *
 *   select title, price from products where price_is_placeholder;
 *
 * Ask the shop (03 128044) and replace them before any real traffic.
 *
 * Each photo was downloaded and LOOKED AT before being attached — not trusted
 * from a filename or an alt tag. That check is the whole point: the previous
 * batch of seed photos put an empty American football field on "Goalkeeper
 * Gloves" and a Nike Air Force 1 on "Running Trainers", and nobody noticed
 * because the filenames read fine.
 *
 * Source post for every image is recorded in scripts/assets/surprise/SOURCES.md.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. This script only
 * INSERTs and UPDATEs, so it needs no Supabase management token.
 *
 * Usage: node scripts/seed-surprise-gifts.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const ASSETS = process.env.SURPRISE_ASSETS || join(__dirname, "assets", "surprise");

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

const GIFT_SETS = "be569a26-53f9-410e-bbe3-2888ad9424d3";

/**
 * Eight boxes, each one described from its own photograph.
 *
 * NO BRAND NAMES in titles or descriptions, the same rule 0054 set. The
 * chocolate hamper genuinely contains branded bars — that is what the shop
 * sells and the photo shows it — but the listing says "boxed chocolate bars"
 * rather than reproducing a confectioner's trademark in CADO's own copy.
 */
const PRODUCTS = [
  {
    file: "01_pink_bunny_box.jpg",
    title: "Pink Bunny Gift Box",
    price: 55,
    description:
      "A large pink plush bunny boxed with patterned socks, a snow globe, a reed diffuser and an insulated water bottle, packed in a white gift box.",
  },
  {
    file: "02_birthday_wish_box.jpg",
    title: "Birthday Wish Box",
    price: 45,
    description:
      "A personalised glass tumbler with a bamboo lid and glass straw, boxed chocolates, a body mist and fresh gypsophila, finished with a wooden heart plaque.",
  },
  {
    file: "03_make_your_own_basket.jpg",
    title: "Make Your Own Gift Basket",
    price: 40,
    description:
      "A woven basket built around a name-printed glass tumbler and a wooden flower stand, filled with dried flowers. The name is printed to order.",
  },
  {
    file: "04_chocolate_hamper.jpg",
    title: "Chocolate Lovers Hamper",
    price: 50,
    description:
      "A ribboned tray packed with boxed chocolate bars, wrapped pralines, a printed pair of socks and a body mist.",
  },
  {
    file: "05_picnic_basket_set.jpg",
    title: "Picnic Basket & Blanket Set",
    price: 35,
    description:
      "A lined wicker picnic basket with a lace trim and a matching red gingham blanket.",
  },
  {
    file: "06_candle_diffuser_cage.jpg",
    title: "Candle & Diffuser Cage Set",
    price: 30,
    description:
      "A scented candle and a reed diffuser presented together inside a pastel wire cage with a ribboned lid. Two scents.",
  },
  {
    file: "07_birdcage_scent_set.jpg",
    title: "Birdcage Candle & Diffuser Set",
    price: 30,
    description:
      "A poured candle and a reed diffuser set inside a black wire birdcage with a printed floral wrap and a ribbon.",
  },
  {
    file: "08_executive_desk_set.jpg",
    title: "Executive Notebook & Pen Set",
    price: 40,
    description:
      "A white leather notebook, a matching pen, a power bank and a card holder, seated in a lined presentation box.",
  },
];

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ---------------------------------------------------------------- partner */

let [partner] = await rest("partners?select=id,name&slug=eq.surprise-gifts-shop");
if (!partner) {
  [partner] = await rest("partners", {
    method: "POST",
    body: JSON.stringify({
      name: "Surprise Gifts Shop",
      slug: "surprise-gifts-shop",
      description: "Curated gifts and décor for every celebration. Maarad Street, Tripoli.",
      status: "active",
      is_live: true,
      country: "LB",
      city: "Tripoli",
      phone: "03 128044",
      commission_rate: 0.15,
      offers_gift_wrap: true,
    }),
  });
  console.log(`partner created: ${partner.name}`);
} else {
  console.log(`partner already present: ${partner.name}`);
}

/* --------------------------------------------------------- their products */

let created = 0;
let photographed = 0;

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
        category_id: GIFT_SETS,
        partner_id: partner.id,
        stock_quantity: 10,
        is_active: true,
        same_day: true,
        // Invented price. This flag is what makes it findable and removable.
        price_is_placeholder: true,
      }),
    });
    created++;
  }

  const existing = await rest(`product_images?select=id&product_id=eq.${row.id}`);
  if (existing.length) continue;

  const path = join(ASSETS, p.file);
  if (!existsSync(path)) {
    console.log(`  no image file for ${p.title} (${p.file}) — listing left without a photo`);
    continue;
  }
  const bytes = readFileSync(path);

  const storagePath = `surprise/${row.id}.jpg`;
  const up = await fetch(`${url}/storage/v1/object/product-images/${storagePath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) {
    console.log(`  upload failed for ${p.title}: ${(await up.text()).slice(0, 140)}`);
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
  console.log(`  ${p.title} — photo ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${created} products created, ${photographed} photos attached.`);

/* ------------------------------------------- retire the invented stand-ins
 *
 * The eight "The Gift Atelier" boxes in Gift Sets were invented for 0054 so
 * the category would not be empty. Surprise is a real shop with real boxes,
 * so the stand-ins step aside.
 *
 * DEACTIVATED, NOT DELETED — one field, reversible with one update, the same
 * call that was made for GS's eleven Home & Gifts products.
 */
const [atelier] = await rest("partners?select=id&slug=eq.the-gift-atelier");
if (atelier) {
  const retired = await rest(
    `products?partner_id=eq.${atelier.id}&category_id=eq.${GIFT_SETS}&is_active=eq.true&price_is_placeholder=eq.true`,
    { method: "PATCH", body: JSON.stringify({ is_active: false }) }
  );
  console.log(`${retired.length} placeholder Gift Atelier boxes deactivated (reversible).`);
}
