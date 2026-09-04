/**
 * Gives clothing, shoes and the sports kit that has a size, a size.
 *
 * WHY VARIANTS AND NOT A NEW COLUMN
 *
 * `product_variants` already exists, with `name`, `sku`, `price_delta`,
 * `stock_quantity`, `is_active` and `sort_order`. It is the size mechanism this
 * schema already has — the only reason it looked unused is that the twelve
 * rows in it all belong to [TEST] products. So nothing is invented here: real
 * products get rows in the table that was built for them.
 *
 * WHAT DOES NOT GET A SIZE
 *
 * A dumbbell pair has a weight, a water bottle has a volume and a skipping
 * rope has a length. None of those is a size, and putting them in a Size
 * filter would make the filter mean nothing. Sport therefore ends up with four
 * products that have sizes — gloves, shin pads and two balls — and that is the
 * honest number, not a shortfall to pad.
 *
 * Stock is split evenly across a product's sizes out of its existing
 * stock_quantity, so the totals still add up to what the store said it has.
 *
 * Usage:  node scripts/seed-sizes.mjs [--dry]
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const DRY = process.argv.includes("--dry");

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
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/* -------------------------------------------------------------------------- */

/** Womenswear and menswear run the usual five; kids run by age. */
const ADULT = ["XS", "S", "M", "L", "XL"];
const KIDS = ["4Y", "6Y", "8Y", "10Y"];
/** Women's EU shoe sizes; the unisex trainers run wider. */
const HEELS = ["36", "37", "38", "39", "40", "41"];
const TRAINERS = ["39", "40", "41", "42", "43", "44", "45"];
const KIDS_SHOES = ["28", "30", "32", "34"];

const SIZES = {
  /* --- Fashion, adult clothing ---------------------------------------- */
  "Silk Wrap Dress": ADULT,
  "Tailored Blazer": ADULT,
  "Everyday Hoodie": ADULT,
  "Poplin Cotton Dress Shirt": ADULT,
  "Piqué Cotton Polo": ADULT,
  "Heavyweight Cotton Tee": ADULT,
  "Merino Crewneck": ADULT,
  "Tan Leather Jacket": ADULT,

  /* --- Fashion, kids clothing ------------------------------------------ */
  "Kids Denim Jacket": KIDS,
  "Kids Floral Tee and Shorts Set": KIDS,
  "Kids Mesh Top and Denim Look": KIDS,
  "Kids Pinstripe Pinafore Dress": KIDS,
  "Girls' Butterfly Print T-Shirt": KIDS,
  "Aigner Kids Logo T-Shirt": KIDS,
  "Aigner Kids Summer Print T-Shirt": KIDS,
  "DKNY Kids Graphic T-Shirt": KIDS,
  "Zadig & Voltaire Kids Wing Cap": ["One size"],

  /* --- Fashion, accessories -------------------------------------------- */
  // A belt has a real waist size. A bag and a scarf do not, and "One size" is
  // the honest answer rather than leaving the row blank.
  "Geox Men Belt": ["S", "M", "L"],
  "Bugatti Men Bag": ["One size"],
  "Leather Weekend Bag": ["One size"],
  "Bugatti Men Scarf": ["One size"],
  "Cashmere Wrap Scarf": ["One size"],

  /* --- Shoes ------------------------------------------------------------ */
  "Black Peep-Toe Heels": HEELS,
  "Nude Ankle-Strap Heels": HEELS,
  "Patent Platform Heels": HEELS,
  "Strappy Flat Sandals": HEELS,
  "Zip-Side Leather Ankle Boot": HEELS,
  "Classic Runner Sneakers": TRAINERS,
  "Colour-Block Court Trainers": TRAINERS,
  "Zadig & Voltaire Kids Buckled Clogs": KIDS_SHOES,

  /* --- Sport, only where a size is a real thing ------------------------- */
  "Goalkeeper Gloves": ["7", "8", "9", "10"],
  "Shin Pads": ["S", "M", "L"],
  "Match Football": ["Size 4", "Size 5"],
  "Outdoor Basketball": ["Size 6", "Size 7"],
};

const titles = Object.keys(SIZES);
// encodeURIComponent, because "Zadig & Voltaire" ends the query string at the
// ampersand and PostgREST then sees a filter with no closing bracket.
const inList = encodeURIComponent(titles.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(","));
const rows = await rest(
  `products?select=id,title,stock_quantity&is_active=is.true&title=in.(${inList})`
);

const missing = titles.filter((t) => !rows.some((r) => r.title === t));
if (missing.length) console.log(`  ! not in the catalogue, skipped: ${missing.join(", ")}`);

let added = 0;
for (const row of rows) {
  const names = SIZES[row.title];
  const existing = await rest(`product_variants?select=id,name&product_id=eq.${row.id}`);
  const want = names.filter((n) => !existing.some((e) => e.name === n));
  if (!want.length) {
    console.log(`  = ${row.title} already sized`);
    continue;
  }
  if (DRY) {
    console.log(`  + ${row.title}: ${want.join(", ")} — dry run`);
    continue;
  }
  const per = Math.max(1, Math.floor((row.stock_quantity ?? names.length) / names.length));
  await rest("product_variants", {
    method: "POST",
    body: JSON.stringify(
      want.map((name, i) => ({
        product_id: row.id,
        name,
        price_delta: 0,
        stock_quantity: per,
        is_active: true,
        sort_order: names.indexOf(name) + i * 0,
      }))
    ),
  });
  added += want.length;
  console.log(`  + ${row.title}: ${want.join(", ")}`);
}

console.log(`\n${DRY ? "Would add" : "Added"} ${added} size rows across ${rows.length} products.`);
