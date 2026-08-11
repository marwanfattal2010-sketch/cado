/**
 * Zahar Kids — TEMPORARY stand-in catalogue built from their public Instagram.
 *
 * READ THIS BEFORE TRUSTING ANY NUMBER IN THE STORE IT CREATES.
 *
 * Zahar (@zaharkids) is a real Lebanese kids' fashion chain owned by Marwan's
 * uncle, who authorised using their Instagram photos here. Instagram publishes
 * photos and captions — it does NOT publish product names, prices, SKUs, sizes,
 * materials or stock. So this import is part real and part invented, and the
 * split is deliberate and recorded per product below:
 *
 *   REAL  — the photograph, the caption it came from, the post date/permalink,
 *           the brand IF AND ONLY IF that post's caption names it, and anything
 *           plainly visible in the picture (it is a t-shirt; it is a cap).
 *   MADE UP — the price. Nothing else.
 *
 * Every product is therefore written with `price_is_placeholder = true`
 * (migration 0041). That flag is the whole safety mechanism: an order placed
 * against one of these prices is a real financial obligation on a family
 * member's business. Find them all with:
 *
 *   select p.title, p.price from products p
 *   join partners pa on pa.id = p.partner_id
 *   where pa.slug = 'zahar' and p.price_is_placeholder;
 *
 * Rules that were followed and must keep being followed:
 *   * A brand appears in a title ONLY if that post's own caption names it.
 *     Several photos visibly show an AIGNER or DKNY logo while their caption
 *     names no brand — those are titled with a plain descriptor instead. The
 *     caption is the source; the logo in the picture is not.
 *   * No invented SKUs, model numbers, materials, sizes, care instructions,
 *     origin, ratings or reviews. `sku` is left null on purpose.
 *   * No compare_at_price. One post advertised "up to 50%" off; that is a
 *     time-limited promotion we cannot verify is still running, so no product
 *     carries a strike-through price.
 *   * stock_quantity is a small invented number so the items are orderable.
 *     Zahar published no inventory data.
 *
 * REVERSIBLE. Every row is recorded in dashboard_seed_registry under the batch
 * below, and `--teardown` removes exactly those rows, deletes the uploaded
 * storage objects, and puts the partner back to the state it was in before
 * (captured in PARTNER_BEFORE). It touches nothing else.
 *
 * IMAGES. Downloaded from Instagram's CDN and re-uploaded to our own
 * `product-images` bucket — the fbcdn URLs are signed and expire, so hotlinking
 * would break within days. Best resolution the public profile serves without
 * logging in is 1081x1351 (one post 1536x1920); the grid thumbnails are 640px
 * and the CDN 403s any attempt to request a larger rendition than the URL
 * signature allows. Source URLs live in IMAGE_SOURCES for provenance.
 *
 * Run (from apps/dashboard):
 *   npx tsx scripts/import-zahar-instagram.ts --dry-run
 *   npx tsx scripts/import-zahar-instagram.ts --download   # refresh local jpgs
 *   npx tsx scripts/import-zahar-instagram.ts
 *   npx tsx scripts/import-zahar-instagram.ts --teardown
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
 * apps/dashboard/.env.local (gitignored). The key is never printed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const TEARDOWN = process.argv.includes("--teardown");
const DOWNLOAD = process.argv.includes("--download");

const PARTNER_SLUG = "zahar";
const BATCH = "zahar_instagram_import";
const PRODUCT_BUCKET = "product-images";
const LOGO_BUCKET = "partner-logos";
/** Downloaded jpgs live here. Not committed — they are Zahar's photographs. */
const IMG_DIR = resolve(__dirname, ".zahar-ig-images");

/** Zahar published no inventory. One small uniform number, invented by us. */
const PLACEHOLDER_STOCK = 6;

/**
 * The partner row exactly as it was before this script first ran (read from
 * production 2026-08-12). --teardown restores these values.
 */
const PARTNER_BEFORE = {
  description: null as string | null,
  logo_url: null as string | null,
  city: "Tripoli",
  is_live: false,
};

/**
 * Straight from the public Instagram bio, verbatim:
 *   "WHERE FASHION BEGINS."
 *   "📍ABC malls, Beirut Souks, Koura & Tripoli"
 * Nothing here is embellished. City is set to Beirut because that is where
 * most of the branches are; the full branch list is in the description so the
 * Tripoli and Koura stores are not lost.
 */
const PARTNER_AFTER = {
  description:
    "Where fashion begins. Zahar is a Lebanese kids' fashion chain carrying international " +
    "designer labels for children. Branches at ABC malls, Beirut Souks, Koura and Tripoli.",
  city: "Beirut",
  is_live: true,
  // offers_gift_wrap deliberately left as-is (false) — we have no evidence Zahar wraps gifts.
};

type Item = {
  /** Instagram shortcode — also the local jpg filename and the id seed. */
  code: string;
  permalink: string;
  date: string;
  /** The post caption, verbatim. The ONLY source for a brand name in a title. */
  caption: string;
  title: string;
  /** One line, describing only what is visible in the photograph. */
  description: string;
  /** INVENTED. Plausible Lebanese retail for premium kids' fashion. */
  price: number;
  /** categories.slug — resolved to an id at run time, never hardcoded. */
  category: string;
  /** Why the title says what it says. Kept so the fabrication stays auditable. */
  note: string;
};

const ITEMS: Item[] = [
  {
    code: "Db2dL55Cho4",
    permalink: "https://www.instagram.com/zaharkids/p/Db2dL55Cho4/",
    date: "2026-08-10",
    caption: "Just a happy kid in his Aigner outfit from Zahar!",
    title: "Aigner Kids Logo T-Shirt",
    description: "White kids' t-shirt with an Aigner logo print.",
    price: 75,
    category: "fashion",
    note: "Caption names Aigner. Photo is plainly a white logo tee.",
  },
  {
    code: "DZfXcGHjDH4",
    permalink: "https://www.instagram.com/zaharkids/p/DZfXcGHjDH4/",
    date: "2026-06-12",
    caption: "The cutest tees from Aigner's SS 26 collection!",
    title: "Aigner Kids Summer Print T-Shirt",
    description: "White kids' t-shirt with a printed summer beach graphic.",
    price: 70,
    category: "fashion",
    note: "Caption names Aigner and says 'tees'.",
  },
  {
    code: "DZ2ijdLjovs",
    permalink: "https://www.instagram.com/zaharkids/p/DZ2ijdLjovs/",
    date: "2026-06-21",
    caption: "Minimal style, maximum attitude — DKNY Kids.🤘",
    title: "DKNY Kids Graphic T-Shirt",
    description: "White kids' t-shirt with a DKNY photo-strip graphic on the front.",
    price: 65,
    category: "fashion",
    note: "Caption names DKNY Kids.",
  },
  {
    code: "DZz9yDngZnv",
    permalink: "https://www.instagram.com/zaharkids/p/DZz9yDngZnv/",
    date: "2026-06-20",
    caption: "From city streets to sunny escapes — Zadig & Voltaire kids own the moment.",
    title: "Zadig & Voltaire Kids Wing Cap",
    description: "Cream kids' baseball cap with a studded wing motif.",
    price: 70,
    category: "fashion",
    note: "Caption names Zadig & Voltaire. Photo is a single cap, shot as a product.",
  },
  {
    code: "DZsPZJDAbdD",
    permalink: "https://www.instagram.com/zaharkids/p/DZsPZJDAbdD/",
    date: "2026-06-17",
    caption: "Poolside essentials, the Zadig & Voltaire way ☀️",
    title: "Zadig & Voltaire Kids Buckled Clogs",
    description: "Tan kids' slip-on clogs with an adjustable buckle strap.",
    price: 125,
    category: "shoes",
    note: "Caption names Zadig & Voltaire. Footwear, so 'shoes' not 'fashion'.",
  },
  {
    code: "DZ7sJrLjcQ0",
    permalink: "https://www.instagram.com/zaharkids/p/DZ7sJrLjcQ0/",
    date: "2026-06-23",
    caption: "Statement looks inspired by the spirit of New York.💄🗽",
    title: "Kids Pinstripe Pinafore Dress",
    description: "White pinstriped pinafore dress worn over a black top.",
    price: 110,
    category: "fashion",
    note: "Caption names NO brand — plain descriptor only, even though the shoot is DKNY's.",
  },
  {
    code: "DZ5HVwyiALU",
    permalink: "https://www.instagram.com/zaharkids/p/DZ5HVwyiALU/",
    date: "2026-06-22",
    caption: "Downtown energy meets everyday cool.💋🌈",
    title: "Kids Mesh Top and Denim Look",
    description: "Yellow mesh-layered top worn with light denim jeans.",
    price: 95,
    category: "fashion",
    note: "Caption names NO brand, though DKNY is visible on the cap and top. Descriptor only.",
  },
  {
    code: "DZxZAM5jTbd",
    permalink: "https://www.instagram.com/zaharkids/p/DZxZAM5jTbd/",
    date: "2026-06-19",
    caption: "Cool fits made for endless summer days.🥰💋",
    title: "Kids Floral Tee and Shorts Set",
    description: "White t-shirt with an appliqué flower print, worn with brown shorts.",
    price: 85,
    category: "fashion",
    note: "Caption names NO brand, though the tee reads Zadig & Voltaire. Descriptor only.",
  },
  {
    code: "DZmcmfKjYVN",
    permalink: "https://www.instagram.com/zaharkids/p/DZmcmfKjYVN/",
    date: "2026-06-15",
    caption: "Girls wanna have fun!",
    title: "Girls' Butterfly Print T-Shirt",
    description: "Kids' t-shirt with a butterfly print, shown in pink and in cream.",
    price: 60,
    category: "fashion",
    note: "Caption names NO brand, though AIGNER is printed on the tee. Descriptor only.",
  },
];

/**
 * Where each jpg came from. Instagram's fbcdn URLs are signed and expire within
 * days, so these are provenance, not a durable source — `--download` only works
 * while they are still valid. The bytes themselves are already in our bucket.
 */
const IMAGE_SOURCES: Record<string, { w: number; h: number; url: string }> = JSON.parse(
  existsSync(resolve(__dirname, "zahar-instagram-sources.json"))
    ? readFileSync(resolve(__dirname, "zahar-instagram-sources.json"), "utf8")
    : "{}",
);

/** Deterministic UUID so re-runs update instead of duplicating. */
function uid(label: string): string {
  const h = createHash("sha1").update(`cado-zahar-ig-import::${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const registry: Array<{ table_name: string; record_id: string }> = [];
function track(table_name: string, record_id: string) {
  registry.push({ table_name, record_id });
}

function must<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res;
}

async function download() {
  mkdirSync(IMG_DIR, { recursive: true });
  for (const [code, src] of Object.entries(IMAGE_SOURCES)) {
    const r = await fetch(src.url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.instagram.com/" },
    });
    if (!r.ok) {
      console.log(`  ${code}: HTTP ${r.status} — signed URL has probably expired`);
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(resolve(IMG_DIR, `${code}.jpg`), buf);
    console.log(`  ${code}: ${(buf.length / 1024).toFixed(0)} KB -> ${IMG_DIR}`);
  }
}

async function teardown() {
  console.log("Tearing down:", BATCH);
  const partner = await db.from("partners").select("id").eq("slug", PARTNER_SLUG).single();
  if (partner.error) throw partner.error;
  const partnerId = partner.data.id;

  const { data: rows, error } = await db
    .from("dashboard_seed_registry")
    .select("table_name, record_id")
    .eq("batch", BATCH);
  if (error) throw error;

  const byTable = new Map<string, string[]>();
  for (const r of rows ?? []) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name)!.push(r.record_id);
  }

  // Children before parents.
  for (const table of ["product_images", "products"]) {
    const ids = byTable.get(table);
    if (!ids?.length) continue;
    const { error: delErr } = await db.from(table).delete().in("id", ids);
    if (delErr) console.warn(`  ${table}: ${delErr.message}`);
    else console.log(`  deleted ${ids.length} from ${table}`);
  }

  // Storage objects we uploaded.
  const paths = (byTable.get("storage:product-images") ?? []) as string[];
  if (paths.length) {
    const { error: sErr } = await db.storage.from(PRODUCT_BUCKET).remove(paths);
    if (sErr) console.warn(`  storage ${PRODUCT_BUCKET}: ${sErr.message}`);
    else console.log(`  deleted ${paths.length} objects from ${PRODUCT_BUCKET}`);
  }
  const logoPaths = (byTable.get("storage:partner-logos") ?? []) as string[];
  if (logoPaths.length) {
    const { error: lErr } = await db.storage.from(LOGO_BUCKET).remove(logoPaths);
    if (lErr) console.warn(`  storage ${LOGO_BUCKET}: ${lErr.message}`);
    else console.log(`  deleted ${logoPaths.length} objects from ${LOGO_BUCKET}`);
  }

  must(await db.from("partners").update(PARTNER_BEFORE).eq("id", partnerId), "restore partner");
  console.log("  partner restored to:", JSON.stringify(PARTNER_BEFORE));

  await db.from("dashboard_seed_registry").delete().eq("batch", BATCH);
  console.log("Teardown complete.");
}

async function main() {
  if (DOWNLOAD) {
    console.log("== DOWNLOAD ==");
    await download();
    return;
  }
  if (TEARDOWN) return teardown();

  console.log(DRY ? "== DRY RUN — nothing will be written ==\n" : "== LIVE IMPORT ==\n");

  const { data: partner, error: pErr } = await db
    .from("partners")
    .select("id, name, slug, is_live, offers_gift_wrap, city, description")
    .eq("slug", PARTNER_SLUG)
    .single();
  if (pErr || !partner) throw new Error(`Partner '${PARTNER_SLUG}' not found: ${pErr?.message}`);
  console.log(`Partner: ${partner.name} (${partner.id})`);

  const { data: cats, error: cErr } = await db.from("categories").select("id, slug");
  if (cErr) throw cErr;
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  for (const s of new Set(ITEMS.map((i) => i.category))) {
    if (!catId.has(s)) throw new Error(`Category slug '${s}' does not exist in CADO`);
  }

  let imported = 0;
  const skipped: Array<{ code: string; why: string }> = [];

  for (const item of ITEMS) {
    const file = resolve(IMG_DIR, `${item.code}.jpg`);
    const productId = uid(item.code);
    const storagePath = `${partner.id}/${productId}/real.jpg`;

    const row = {
      id: productId,
      partner_id: partner.id,
      category_id: catId.get(item.category)!,
      title: item.title,
      slug: `zahar-${slugify(item.title)}`,
      description: item.description,
      price: item.price,
      // THE POINT OF THIS WHOLE SCRIPT. Never flip this to false without a
      // price confirmed by Zahar itself.
      price_is_placeholder: true,
      compare_at_price: null,
      currency: "USD",
      // No invented SKUs. Instagram publishes none.
      sku: null,
      stock_quantity: PLACEHOLDER_STOCK,
      is_active: true,
      // Partner does not offer gift wrap.
      gift_wrap_available: false,
      gift_wrap_price: 0,
      // We know nothing about Zahar's fulfilment.
      same_day: false,
      // Real: these are all children's items.
      recipient_tags: ["child"],
      country: "LB",
    };

    console.log(
      `  ${DRY ? "[dry] " : ""}${item.title}\n` +
        `      $${item.price.toFixed(2)} USD (PLACEHOLDER) | ${item.category} | ${item.code}\n` +
        `      caption: "${item.caption.replace(/\n/g, " ")}"`,
    );

    if (DRY) {
      imported++;
      continue;
    }

    if (!existsSync(file)) {
      skipped.push({ code: item.code, why: `no local image at ${file} — run --download` });
      console.log(`      SKIP: local image missing`);
      continue;
    }

    must(await db.from("products").upsert(row, { onConflict: "id" }), `product upsert ${item.code}`);
    track("products", productId);

    const buf = readFileSync(file);
    const { error: sErr } = await db.storage
      .from(PRODUCT_BUCKET)
      .upload(storagePath, buf, { contentType: "image/jpeg", upsert: true });
    if (sErr) throw new Error(`storage upload ${item.code}: ${sErr.message}`);
    track("storage:product-images", storagePath);

    const imageId = uid(`${item.code}::img0`);
    must(
      await db.from("product_images").upsert(
        {
          id: imageId,
          product_id: productId,
          partner_id: partner.id,
          storage_path: storagePath,
          sort_order: 0,
          is_primary: true,
        },
        { onConflict: "id" },
      ),
      `product_images upsert ${item.code}`,
    );
    track("product_images", imageId);
    console.log(`      -> ${storagePath} (${(buf.length / 1024).toFixed(0)} KB)`);
    imported++;
  }

  // --- partner: logo + real details from the Instagram bio ---------------
  let logoUrl: string | null = null;
  const logoFile = resolve(IMG_DIR, "profilepic.jpg");
  if (!DRY && existsSync(logoFile)) {
    const logoPath = `${partner.id}/logo.jpg`;
    const { error: lErr } = await db.storage
      .from(LOGO_BUCKET)
      .upload(logoPath, readFileSync(logoFile), { contentType: "image/jpeg", upsert: true });
    if (lErr) console.warn(`  logo upload: ${lErr.message}`);
    else {
      track("storage:partner-logos", logoPath);
      logoUrl = db.storage.from(LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl;
      console.log(`  logo -> ${logoPath}`);
    }
  }

  if (!DRY) {
    must(
      await db
        .from("partners")
        .update({ ...PARTNER_AFTER, ...(logoUrl ? { logo_url: logoUrl } : {}) })
        .eq("id", partner.id),
      "partner update",
    );
    console.log(`  partner set live, city=${PARTNER_AFTER.city}, gift wrap left off`);

    for (let i = 0; i < registry.length; i += 500) {
      const chunk = registry.slice(i, i + 500).map((r) => ({ batch: BATCH, ...r }));
      const { error } = await db
        .from("dashboard_seed_registry")
        .upsert(chunk, { onConflict: "table_name,record_id" });
      if (error) throw error;
    }
  }

  console.log(`\n${DRY ? "Would import" : "Imported"} ${imported}, skipped ${skipped.length}`);
  skipped.forEach((s) => console.log(`  skipped ${s.code}: ${s.why}`));
  console.log("EVERY price above is a placeholder and is flagged price_is_placeholder = true.");
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
