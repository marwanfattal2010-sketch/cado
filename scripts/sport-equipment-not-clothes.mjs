/**
 * Turns Sport from a clothing rail into an equipment shop.
 *
 * WHY. Ten of Sport's eighteen products had no photograph, and every one of
 * those ten was APPAREL — boots, kits, trainers, tracksuits, a tee-and-shorts
 * set. That is not a coincidence and it is not laziness: free sportswear
 * photography is almost entirely of branded gear. Seventeen candidates were
 * downloaded and opened on 2026-08-15 and seventeen were rejected — Nike ×2,
 * Sergio Tacchini ×2, Champion, Puma, Asics, Barker, Redtape, and one duffel
 * bag covered in Getty and Unsplash's own logos.
 *
 * Marwan's call, and it is the right one: "I don't mean sports clothes, I
 * mean balls, water bottles, dumbbells." Equipment photographs cleanly
 * because a dumbbell is a lump of iron and a bottle is a bottle.
 *
 * So the apparel steps aside and equipment takes its place. Sport's eight
 * already-photographed products are ALL equipment, which is the same finding
 * from the other direction.
 *
 * DEACTIVATED, NOT DELETED — one field, reversible in one update. If real
 * sportswear photography ever arrives, `is_active = true` brings it all back.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. UPDATE + INSERT.
 *
 * Usage: node scripts/sport-equipment-not-clothes.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const ASSETS = process.env.SPORT_ASSETS || join(__dirname, "assets", "sport");

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

const SPORT = "229bf43c-f4f5-4e15-bc99-ce09affbbfde";

/** Apparel that cannot be photographed without someone's logo on it. */
const RETIRE = [
  "Firm Ground Football Boots",
  "Football Kit — Shirt, Shorts & Socks",
  "Indoor Football Trainers",
  "Running Trainers",
  "Training Tee & Shorts Set",
  "Training Tracksuit",
  "Sports Holdall",
];

/**
 * Equipment to add. Each has a photograph that was opened and checked for
 * logos before it was written here.
 */
const ADD = [
  {
    file: "dumbbell-pair.jpg",
    title: "Hex Dumbbell Pair",
    price: 45,
    description:
      "A pair of rubber-coated hex dumbbells with a knurled chrome handle. The weight is moulded into the end so it never wears off.",
  },
  {
    file: "insulated-bottle.jpg",
    title: "Matte Insulated Bottle 750ml",
    price: 22,
    description:
      "A double-walled stainless bottle in a soft matte finish. Holds cold for twenty-four hours and hot for twelve.",
  },
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ------------------------------------------------- retire the apparel */

let retired = 0;
for (const title of RETIRE) {
  const rows = await rest(
    `products?select=id,title,is_active&category_id=eq.${SPORT}&title=eq.${encodeURIComponent(title)}`
  );
  if (!rows.length || !rows[0].is_active) {
    console.log(`  already off / not found: ${title}`);
    continue;
  }
  await rest(`products?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_active: false }),
  });
  console.log(`  retired (reversible): ${title}`);
  retired++;
}

/* ------------------------------------------------------ add equipment */

const [partner] = await rest("partners?select=id,name&slug=eq.baseline-sports");
if (!partner) throw new Error("Baseline Sports partner is missing");

let added = 0;
for (const p of ADD) {
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
        category_id: SPORT,
        partner_id: partner.id,
        stock_quantity: 12,
        is_active: true,
        same_day: true,
        price_is_placeholder: true,
      }),
    });
    added++;
  }

  const existing = await rest(`product_images?select=id&product_id=eq.${row.id}`);
  if (existing.length) continue;

  const path = join(ASSETS, p.file);
  if (!existsSync(path)) {
    console.log(`  no image file for ${p.title} — listed without a photo`);
    continue;
  }
  const bytes = readFileSync(path);
  const storagePath = `seed/${row.id}.jpg`;
  const up = await fetch(`${url}/storage/v1/object/product-images/${storagePath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) {
    console.log(`  upload failed for ${p.title}: ${(await up.text()).slice(0, 120)}`);
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
  console.log(`  added: ${p.title} — photo ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${retired} apparel retired, ${added} equipment added.`);

/* --------------------------------------------------------- where we landed */
const live = await rest(
  `products?select=title,product_images(storage_path)&is_active=eq.true&category_id=eq.${SPORT}&order=title`
);
const blank = live.filter((p) => !(p.product_images || []).length);
console.log(`\nSport now: ${live.length} live, ${blank.length} without a photo.`);
if (blank.length) console.log(`  still blank: ${blank.map((p) => p.title).join(", ")}`);
