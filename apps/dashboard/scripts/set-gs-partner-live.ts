/**
 * Fill in the GS partner row from GS's own site and take the store live.
 *
 * Companion to import-gs-catalogue.ts. Everything written here is either taken
 * from eshopgs.com/lb directly or supplied by the owner:
 *   - phone   961 70 35 30 35  — listed on their Contact Us page
 *   - email   we-care@eshopgs.com — listed on their Contact Us page
 *   - logo    their own GS wordmark (GS-LOGO-BIG.png)
 *   - cover   their own home-décor merchandising photo
 * Both images are GS's own branding, not a third-party brand's logo, and both
 * are re-hosted in our `partner-logos` bucket rather than hotlinked.
 *
 * NOT changed here:
 *   - city stays as it is. Their site only publishes a corporate Beirut
 *     address; the row says Tripoli. Which branch fulfils CADO orders is an
 *     operational fact we do not have, so this is left for the owner.
 *   - offers_gift_wrap stays false — GS does not wrap.
 *
 * Run (from apps/dashboard):
 *   npx tsx scripts/set-gs-partner-live.ts --dry-run
 *   npx tsx scripts/set-gs-partner-live.ts
 */
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
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const BUCKET = "partner-logos";

const ASSETS = [
  {
    field: "logo_url" as const,
    src: "https://eshopgs.com/lb/wp-content/uploads/sites/5/2025/05/GS-LOGO-BIG.png",
    path: "logos/gs.png",
  },
  {
    field: "cover_image_url" as const,
    src: "https://eshopgs.com/lb/wp-content/uploads/sites/5/2026/06/Home-Decor.webp",
    path: "covers/gs.webp",
  },
];

/** Brands named here were all verified present in GS's own site navigation. */
const DESCRIPTION =
  "Multi-brand retailer for fashion, footwear, accessories and home décor — BOSS, Timberland, Geox, Bugatti, Printworks and more.";
const PHONE = "961 70 35 30 35";
const EMAIL = "we-care@eshopgs.com";

async function main() {
  console.log(DRY ? "== DRY RUN ==\n" : "== LIVE ==\n");

  const { data: before, error } = await db.from("partners").select("*").eq("slug", "gs").single();
  if (error || !before) throw new Error(`GS partner not found: ${error?.message}`);
  console.log("before:", JSON.stringify({ is_live: before.is_live, city: before.city, phone: before.phone }, null, 0));

  const patch: Record<string, unknown> = {
    description: DESCRIPTION,
    phone: PHONE,
    email: EMAIL,
    is_live: true,
    // left deliberately untouched: city, offers_gift_wrap, commission_rate, status, slug
  };

  for (const a of ASSETS) {
    const r = await fetch(a.src, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`${a.src} -> ${r.status}`);
    const ct = r.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(`  ${a.field}: ${(buf.length / 1024).toFixed(0)} KB ${ct} -> ${BUCKET}/${a.path}`);
    if (!DRY) {
      const { error: sErr } = await db.storage.from(BUCKET).upload(a.path, buf, { contentType: ct, upsert: true });
      if (sErr) throw new Error(`upload ${a.path}: ${sErr.message}`);
    }
    patch[a.field] = db.storage.from(BUCKET).getPublicUrl(a.path).data.publicUrl;
    await new Promise((x) => setTimeout(x, 1200));
  }

  console.log("\npatch:", JSON.stringify(patch, null, 2));
  if (!DRY) {
    const { error: uErr } = await db.from("partners").update(patch).eq("slug", "gs");
    if (uErr) throw new Error(`partner update: ${uErr.message}`);
    console.log("\nGS partner updated and live.");
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
