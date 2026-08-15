/**
 * Chooses which product fronts each category's hero carousel.
 *
 * Marwan reviewed the live carousels on 2026-08-15 and every fault he found
 * had the same cause: the hero slide took whatever product was added LAST.
 * "Most recent" is not curation, and it showed:
 *
 *   Flowers    -> "The Housewarming Box"          (a box, in Flowers)
 *   Jewelry    -> "Bugatti Men Bag", then a belt  (not jewelry)
 *   Shoes      -> "Zadig & Voltaire Kids Clogs"   (a kids' clog fronting Shoes)
 *   Gift Sets  -> "New Baby Keepsake Crate"
 *   Toys       -> the same photo on slides 1 and 2
 *
 * useCategorySlides now orders by `products.is_featured` first — a column that
 * already existed and that the storefront was never reading. This script sets
 * that flag. Editorial judgement therefore lives in the database and can be
 * changed without a deploy.
 *
 * NOTHING HERE INVENTS ANYTHING. Every title below is a real product already
 * in the catalogue with a real photograph already attached; this only decides
 * which of them goes first.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. UPDATE only.
 *
 * Usage: node scripts/curate-hero-products.mjs
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
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

/** Titles to promote to hero. Two per category so slide 1 and 2 can differ. */
const PROMOTE = [
  // Gift Sets had nothing flagged. These two are Surprise Gifts Shop's OWN
  // photographs of boxes they really sell — the best pictures in the whole
  // catalogue, and far better than the baby crate that was leading.
  "Pink Bunny Gift Box",
  "Picnic Basket & Blanket Set",

  // Shoes had nothing flagged, and only two photographed products exist. The
  // other is a branded kids' clog, so the grown-up sneaker leads.
  "Classic Runner Sneakers",

  // Sport and Electronics had nothing either. Unbranded, on-category, and
  // photographed — the criteria that matter for a hero.
  "Outdoor Basketball",
  "Yoga Mat & Cork Blocks Set",
  "Over-Ear Wireless Headphones",
  "Portable Bluetooth Speaker",
];

/**
 * Titles to DEMOTE. Not deletions and not judgements on the product — they
 * simply should not be the face of that category.
 */
const DEMOTE = [
  // A gift box fronting Flowers was Marwan's clearest complaint. Unflagging it
  // leaves "Peony Garden Bouquet" and "Signature Rose Bouquet" — actual
  // bouquets — to lead, which is what a Flowers hero should be.
  "New Beginnings Box",
];

let promoted = 0;
let demoted = 0;

for (const title of PROMOTE) {
  const rows = await rest(`products?select=id,title,is_featured&title=eq.${encodeURIComponent(title)}`);
  if (!rows.length) {
    console.log(`  NOT FOUND, skipped: ${title}`);
    continue;
  }
  if (rows[0].is_featured) {
    console.log(`  already featured: ${title}`);
    continue;
  }
  await rest(`products?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_featured: true }),
  });
  console.log(`  promoted: ${title}`);
  promoted++;
}

for (const title of DEMOTE) {
  const rows = await rest(`products?select=id,title,is_featured&title=eq.${encodeURIComponent(title)}`);
  if (!rows.length || !rows[0].is_featured) {
    console.log(`  nothing to demote: ${title}`);
    continue;
  }
  await rest(`products?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_featured: false }),
  });
  console.log(`  demoted: ${title}`);
  demoted++;
}

console.log(`\n${promoted} promoted, ${demoted} demoted.`);

/* ------------------------------------------------- what each hero now shows */
const cats = await rest("categories?select=id,slug&is_active=eq.true&order=slug");
console.log("\nHero product per category (featured first, newest as fallback):");
for (const c of cats) {
  const ps = await rest(
    `products?select=title,is_featured,product_images(storage_path)&is_active=eq.true&category_id=eq.${c.id}&stock_quantity=gt.0&order=is_featured.desc,created_at.desc&limit=12`
  );
  const withPhoto = ps.filter((p) => (p.product_images || []).length);
  const first = withPhoto[0];
  const second = withPhoto[1];
  console.log(
    `  ${c.slug.padEnd(22)} ${first ? first.title : "— no photographed product —"}` +
      (second ? `  /  ${second.title}` : "")
  );
}
