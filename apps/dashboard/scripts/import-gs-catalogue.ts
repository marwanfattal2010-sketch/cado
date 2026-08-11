/**
 * Import the GS (eshopgs.com/lb) catalogue into CADO.
 *
 * GS is a real Lebanese multi-brand retailer. Their storefront is WooCommerce,
 * which exposes a public read-only Store API:
 *   https://eshopgs.com/lb/wp-json/wc/store/v1/products
 * We read from that rather than scraping HTML — it is one request per product
 * instead of a page render, and it gives us the price as structured data.
 *
 * CURRENCY: the Store API returns `prices.price` as an INTEGER IN MINOR UNITS
 * with `currency_minor_unit: 2`. "2175" means $21.75, NOT $2175. Getting this
 * wrong is a 100x money bug. `priceFromWoo()` below is the only place that
 * conversion happens, and the script refuses to import anything whose
 * currency_code is not USD (see assertUsd) so a future currency switch on
 * their side fails loudly instead of silently mispricing.
 *
 * IMAGES: the Store API returns an empty `images` array on this install, so the
 * product page HTML is fetched and the image whose filename begins with the
 * product SKU is taken (their uploads are named after the SKU). Images are
 * downloaded and re-uploaded to our own `product-images` bucket — we never
 * hotlink to eshopgs.com.
 *
 * Idempotent: product ids are derived deterministically from the GS SKU, so
 * re-running updates rather than duplicating.
 *
 * Run (from apps/dashboard):
 *   npx tsx scripts/import-gs-catalogue.ts --dry-run
 *   npx tsx scripts/import-gs-catalogue.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
 * apps/dashboard/.env.local (gitignored). The key is never printed.
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL_ || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/dashboard/.env.local");
  process.exit(1);
}
const db = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const DRY = process.argv.includes("--dry-run");
const PARTNER_SLUG = "gs";
const BUCKET = "product-images";
const SITE = "https://eshopgs.com/lb";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

/** Be polite to their server: one request at a time, with a gap. */
const POLITE_DELAY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The curated selection: gift-appropriate items only (home/tableware/decor,
 * candles, small accessories, jewellery), skipping bulk apparel.
 * `category` is a CADO categories.slug — resolved to an id at run time, never
 * hardcoded.
 */
const SELECTION: Array<{ sku: string; category: string }> = [
  // Home & Gifts
  { sku: "DHPNAYPK8NANA01", category: "home-gifts" }, // Printworks cocktail kit
  { sku: "DHPNAYPI4NANA01", category: "home-gifts" }, // Printworks cheese kit
  { sku: "DHPNAYPM3NANA01", category: "home-gifts" }, // Printworks matcha kit
  { sku: "DHPNAYPB2NANA02", category: "home-gifts" }, // Printworks backgammon
  { sku: "DHOEAYPNDNANA03", category: "home-gifts" }, // Cote Bougie scented candle
  { sku: "DHJJAYPNDNANA72", category: "home-gifts" }, // Atmosphera scented candle
  { sku: "DHOEAYPUSNANA02", category: "home-gifts" }, // Cote Bougie diffuser
  { sku: "DHJJAYPUSNANA60", category: "home-gifts" }, // Atmosphera diffuser
  { sku: "DHUNAYPEANANA02", category: "home-gifts" }, // Urban Nature Culture tea cup
  { sku: "DHUNAYPLYNANA01", category: "home-gifts" }, // Urban Nature Culture latte cup
  { sku: "DHZAAYPESNANA11", category: "home-gifts" }, // Zarina espresso cup set
  // Jewelry & Accessories
  { sku: "AWCFS26EGHMME03", category: "jewelry-accessories" }, // Cortefiel earrings
  { sku: "AWCFS26NEHMAC01", category: "jewelry-accessories" }, // Cortefiel necklace
  { sku: "AMBUS25SFNTCO01", category: "jewelry-accessories" }, // Bugatti men scarf
  { sku: "AMGXS26BTRVLE02", category: "jewelry-accessories" }, // Geox men belt
  { sku: "AMBUAYPBACSNY01", category: "jewelry-accessories" }, // Bugatti men bag
];

/**
 * GS publishes availability ("in stock") but never a unit count, so there is no
 * real number to import. Rather than invent per-product inventory we set one
 * uniform placeholder so the items are orderable, and record it here so it is
 * obvious this came from us and not from GS.
 */
const PLACEHOLDER_STOCK = 5;

/** Deterministic UUID so re-runs update instead of duplicating. */
function uid(label: string): string {
  const h = createHash("sha1").update(`cado-gs-import::${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#0?36;/g, "$")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(s: string): string {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

/**
 * GS appends the SKU to every product name ("Bugatti Men Scarf AMBUS25SFNTCO01").
 * Drop that trailing token only — the brand and product words are left exactly
 * as the retailer states them.
 */
function cleanTitle(name: string, sku: string): string {
  return decodeEntities(name).replace(new RegExp(`\\s*${sku}\\s*$`, "i"), "").replace(/\s+/g, " ").trim();
}

/** Minor units -> major. "2175" with minor_unit 2 => 21.75. */
function priceFromWoo(raw: string, minorUnit: number): number {
  return Number(raw) / 10 ** minorUnit;
}

function assertUsd(p: any, sku: string) {
  const code = p?.prices?.currency_code;
  if (code !== "USD") {
    throw new Error(
      `${sku}: GS is quoting ${code}, not USD. Every price in CADO is USD — refusing to import rather than guess a conversion.`,
    );
  }
}

async function get(url: string): Promise<Response> {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  return r;
}

/** Look a product up by SKU through the Store API search. */
async function fetchProduct(sku: string): Promise<any> {
  const r = await get(`${SITE}/wp-json/wc/store/v1/products?per_page=20&search=${encodeURIComponent(sku)}`);
  const list = await r.json();
  if (!Array.isArray(list)) throw new Error(`${sku}: unexpected Store API response`);
  const hit = list.find((p: any) => (p.sku || "").toUpperCase() === sku.toUpperCase());
  if (!hit) throw new Error(`${sku}: not found in Store API search`);
  return hit;
}

/**
 * Their uploads are named after the SKU (AMBUS25SFNTCO01-80.webp). Pick the
 * full-size file — the one with no -WIDTHxHEIGHT suffix — from the product page.
 */
async function findImageUrl(permalink: string, sku: string): Promise<string | null> {
  const html = await (await get(permalink)).text();
  const all = [
    ...new Set(
      [...html.matchAll(/https:\/\/eshopgs\.com\/lb\/wp-content\/uploads\/[^"'\s\\)]+?\.(?:webp|jpe?g|png)/gi)].map(
        (m) => m[0],
      ),
    ),
  ];
  const mine = all.filter((u) => {
    const base = u.split("/").pop()!;
    return base.toUpperCase().startsWith(sku.toUpperCase());
  });
  if (mine.length === 0) return null;
  const fullSize = mine.filter((u) => !/-\d+x\d+\.(webp|jpe?g|png)$/i.test(u));
  return (fullSize[0] ?? mine[0]) ?? null;
}

function extFor(contentType: string, url: string): string {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const m = url.match(/\.(webp|jpe?g|png)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function main() {
  console.log(DRY ? "== DRY RUN — nothing will be written ==\n" : "== LIVE IMPORT ==\n");

  const { data: partner, error: pErr } = await db
    .from("partners")
    .select("id, name, slug, is_live, offers_gift_wrap")
    .eq("slug", PARTNER_SLUG)
    .single();
  if (pErr || !partner) throw new Error(`Partner '${PARTNER_SLUG}' not found: ${pErr?.message}`);
  console.log(`Partner: ${partner.name} (${partner.id})`);

  const { data: cats, error: cErr } = await db.from("categories").select("id, slug");
  if (cErr) throw cErr;
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  for (const s of new Set(SELECTION.map((x) => x.category))) {
    if (!catId.has(s)) throw new Error(`Category slug '${s}' does not exist in CADO`);
  }

  const report: any[] = [];
  const skipped: Array<{ sku: string; why: string }> = [];

  for (const { sku, category } of SELECTION) {
    try {
      const p = await fetchProduct(sku);
      assertUsd(p, sku);

      const minor = p.prices.currency_minor_unit ?? 2;
      const price = priceFromWoo(p.prices.price, minor);
      const regular = p.prices.regular_price ? priceFromWoo(p.prices.regular_price, minor) : null;
      if (!Number.isFinite(price) || price <= 0) {
        skipped.push({ sku, why: "no determinable price" });
        await sleep(POLITE_DELAY_MS);
        continue;
      }

      const brand = p.brands?.[0]?.name ? decodeEntities(p.brands[0].name) : null;
      const title = cleanTitle(p.name, sku);
      const description = stripHtml(p.description || p.short_description || "");
      const colorTerms = p.attributes?.find((a: any) => a.taxonomy === "pa_color")?.terms ?? [];
      const color = colorTerms.length === 1 ? decodeEntities(colorTerms[0].name) : null;

      await sleep(POLITE_DELAY_MS);
      const imgUrl = await findImageUrl(p.permalink, sku);
      if (!imgUrl) {
        skipped.push({ sku, why: "no product image found on their page" });
        await sleep(POLITE_DELAY_MS);
        continue;
      }

      const productId = uid(sku);
      const row = {
        id: productId,
        partner_id: partner.id,
        category_id: catId.get(category)!,
        title,
        slug: p.slug,
        description: description || null,
        price,
        // Only record a compare-at when GS is actually showing a strike-through.
        compare_at_price: regular && regular > price ? regular : null,
        currency: "USD",
        sku,
        stock_quantity: PLACEHOLDER_STOCK,
        is_active: true,
        // GS does not offer gift wrap.
        gift_wrap_available: false,
        gift_wrap_price: 0,
        // No evidence GS delivers same-day; Marwan can flip this per store.
        same_day: false,
        color,
        country: "LB",
      };

      report.push({ ...row, brand, category, imgUrl, permalink: p.permalink });
      console.log(
        `  ${DRY ? "[dry] " : ""}${title}\n      $${price.toFixed(2)} USD${
          row.compare_at_price ? ` (was $${row.compare_at_price.toFixed(2)})` : ""
        } | brand=${brand ?? "-"} | color=${color ?? "-"} | ${category}`,
      );

      if (!DRY) {
        const { error: upErr } = await db.from("products").upsert(row, { onConflict: "id" });
        if (upErr) throw new Error(`product upsert: ${upErr.message}`);

        const imgRes = await get(imgUrl);
        const ct = imgRes.headers.get("content-type") ?? "";
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ext = extFor(ct, imgUrl);
        const storagePath = `${partner.id}/${productId}/real.${ext}`;
        const { error: sErr } = await db.storage
          .from(BUCKET)
          .upload(storagePath, buf, { contentType: ct || `image/${ext}`, upsert: true });
        if (sErr) throw new Error(`storage upload: ${sErr.message}`);

        const { error: iErr } = await db.from("product_images").upsert(
          {
            id: uid(`${sku}::img0`),
            product_id: productId,
            partner_id: partner.id,
            storage_path: storagePath,
            sort_order: 0,
            is_primary: true,
          },
          { onConflict: "id" },
        );
        if (iErr) throw new Error(`product_images upsert: ${iErr.message}`);
        console.log(`      -> ${storagePath} (${(buf.length / 1024).toFixed(0)} KB, ${ct})`);
      }
    } catch (e: any) {
      skipped.push({ sku, why: e.message });
      console.log(`  SKIP ${sku}: ${e.message}`);
    }
    await sleep(POLITE_DELAY_MS);
  }

  console.log(`\nImported ${report.length}, skipped ${skipped.length}`);
  skipped.forEach((s) => console.log(`  skipped ${s.sku}: ${s.why}`));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
