/**
 * Seeds the eight-shop store row on the Fashion tab.
 *
 * Run AFTER migration 0096 is applied — it writes the two columns 0096 creates
 * (partners.display_rank, partners.display_category_id).
 *
 *   SUPABASE_ACCESS_TOKEN=<token> node scripts/run-sql.mjs --file supabase/migrations/0096_partner_display_rank.sql
 *   node scripts/seed-fashion-store-row.mjs
 *
 * WHAT IT DOES
 *   1. Creates six partners that do not exist yet, with ZERO products:
 *      Adidas, Nike, Pull & Bear, Bershka, Mango, LC Waikiki.
 *   2. Pins all eight — the six above plus GS and Zahar, which already have
 *      Fashion products — to positions 1..8 of the Fashion store row.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 *   NO LOGOS. `logo_url` is left NULL on every store it creates, and a rerun
 *   never touches the column on a store that already exists. Marwan drops the
 *   real files in himself. This script must never generate, fetch or point at
 *   a brand mark, and nothing here writes a brand name into an image.
 *
 *   NO INVENTED FACTS. description, tagline, city, phone and email stay NULL.
 *   A tagline seeded by a script is a claim CADO is making about a company it
 *   does not speak for. `country` is not written either — the column is NOT
 *   NULL with a schema default of 'LB' (0001) and that default stands on its
 *   own; the script asserts nothing about it.
 *
 *   NO PRODUCTS. These six shops have empty shelves and the storefront says so
 *   in as many words. There is no placeholder listing, no count and no grid.
 *
 * RERUNNABLE. Existing stores are matched by slug and never overwritten; only
 * the two pin columns are rewritten, and every Fashion pin is cleared first so
 * a reordering cannot collide with the unique (category, rank) index.
 *
 * Auth: SERVICE ROLE key, read from apps/dashboard/.env.local.
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
  if (!url || !key) throw new Error(`Missing Supabase url/key in ${ENV}`);
  return { url, key };
}

const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, Prefer: "return=representation", ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} on ${path}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

const CATEGORY_SLUG = "fashion";

/**
 * The row, in order. `create: true` means this shop does not exist yet and is
 * created with an empty catalogue; the other two are already selling Fashion
 * and are only being given a position.
 *
 * Slugs follow the convention already in the table — "&" becomes "and", as in
 * `anchor-and-oak`.
 */
const ROW = [
  { rank: 1, slug: "gs", name: "GS", create: false },
  { rank: 2, slug: "zahar", name: "Zahar", create: false },
  { rank: 3, slug: "adidas", name: "Adidas", create: true },
  { rank: 4, slug: "nike", name: "Nike", create: true },
  { rank: 5, slug: "pull-and-bear", name: "Pull & Bear", create: true },
  { rank: 6, slug: "bershka", name: "Bershka", create: true },
  { rank: 7, slug: "mango", name: "Mango", create: true },
  { rank: 8, slug: "lc-waikiki", name: "LC Waikiki", create: true },
];

const [category] = await rest(`categories?select=id,name,slug&slug=eq.${CATEGORY_SLUG}`);
if (!category) throw new Error(`No category with slug "${CATEGORY_SLUG}"`);
console.log(`category: ${category.name} (${category.slug})`);

/* -------------------------------------------------- 1. create the missing -- */

const existing = await rest(
  `partners?select=id,slug,name,status,is_live,logo_url&slug=in.(${ROW.map((r) => r.slug).join(",")})`
);
const bySlug = new Map(existing.map((p) => [p.slug, p]));

for (const row of ROW) {
  if (bySlug.has(row.slug)) {
    console.log(`  exists: ${bySlug.get(row.slug).name} (${row.slug})`);
    continue;
  }
  if (!row.create) {
    console.log(`  MISSING and not creatable: ${row.slug} — check the slug`);
    continue;
  }
  const [made] = await rest("partners", {
    method: "POST",
    body: JSON.stringify({
      name: row.name,
      slug: row.slug,
      // Live and active so the shop is reachable and its circle is tappable.
      // It has no products, which every product-derived surface checks for
      // itself — see lib/browse.ts.
      status: "active",
      is_live: true,
      // Everything a person could mistake for a fact stays empty.
      description: null,
      tagline: null,
      logo_url: null,
      cover_image_url: null,
      city: null,
      phone: null,
      email: null,
    }),
  });
  bySlug.set(row.slug, made);
  console.log(`  created: ${made.name} (${made.slug}) — no logo, no products`);
}

/* ------------------------------------------------------ 2. pin the eight -- */

// Clear first: a rerun that moves a shop from 5 to 3 would otherwise fight the
// unique (display_category_id, display_rank) index halfway through.
const cleared = await rest(`partners?display_category_id=eq.${category.id}`, {
  method: "PATCH",
  body: JSON.stringify({ display_rank: null, display_category_id: null }),
});
if (cleared.length) console.log(`\ncleared ${cleared.length} existing ${category.slug} pin(s)`);

console.log("\npinning:");
for (const row of ROW) {
  const partner = bySlug.get(row.slug);
  if (!partner) {
    console.log(`  ${row.rank}. SKIPPED — no partner with slug ${row.slug}`);
    continue;
  }
  const [updated] = await rest(`partners?slug=eq.${row.slug}`, {
    method: "PATCH",
    body: JSON.stringify({ display_rank: row.rank, display_category_id: category.id }),
  });
  console.log(`  ${updated.display_rank}. ${updated.name} (${updated.slug})`);
}

/* --------------------------------------------------------- 3. read back --- */

const pinned = await rest(
  `partners?select=name,slug,display_rank&display_category_id=eq.${category.id}&order=display_rank`
);
console.log(`\n${pinned.length} shop(s) pinned to ${category.name}. Done.`);
