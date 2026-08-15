/**
 * The last two Electronics products without a photo.
 *
 * Marwan's instruction was plain: no item is to be left without a picture.
 * These two were deliberately blank because neither could be photographed
 * honestly from free stock, so each needed a different answer:
 *
 *   Instant Print Camera — SOLVED, photo found. Unsplash only has visibly
 *     branded Instax and Polaroid bodies, but Pexels had a white instant
 *     camera with a clean, unmarked front and lens ring. Correct item, no
 *     legible brand. Attached as-is.
 *
 *   Digital Photo Frame — NOT SOLVED, product changed instead. Neither
 *     Unsplash nor Pexels has a photograph of a digital photo frame; both
 *     return wall picture frames, laptops and tablets. Two independent
 *     sources, same answer. Rather than hang a picture frame on an
 *     electronics listing — the precise mistake that put an American
 *     football field on "Goalkeeper Gloves" — the PRODUCT changes to one
 *     that can be shown truthfully: a portable mini projector. It is a real
 *     giftable item, it is still placeholder stock, and the photo is of the
 *     thing the listing describes.
 *
 * Both photos were downloaded, opened and looked at before being attached.
 * Sources are recorded in scripts/assets/electronics/SOURCES.md.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local.
 * Usage: node scripts/fix-electronics-blanks.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const ASSETS = join(__dirname, "assets", "electronics");

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

const JOBS = [
  {
    findTitle: "Instant Print Camera",
    file: "instant_print_camera.jpg",
    // Unchanged — the photo matches the listing already.
    update: null,
  },
  {
    findTitle: "Digital Photo Frame",
    file: "portable_mini_projector.jpg",
    update: {
      title: "Portable Mini Projector",
      slug: "portable-mini-projector",
      description:
        "A palm-sized projector with a fold-out stand and a carry strap, for films on a bedroom wall. Placeholder listing.",
    },
  },
];

for (const job of JOBS) {
  const [row] = await rest(`products?select=id,title,partner_id&title=eq.${encodeURIComponent(job.findTitle)}`);
  if (!row) {
    console.log(`  not found, skipping: ${job.findTitle}`);
    continue;
  }

  if (job.update) {
    await rest(`products?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(job.update),
    });
    console.log(`  "${job.findTitle}" -> "${job.update.title}" (no honest photo exists for the old one)`);
  }

  const existing = await rest(`product_images?select=id&product_id=eq.${row.id}`);
  if (existing.length) {
    console.log(`  already has a photo: ${row.title}`);
    continue;
  }

  const bytes = readFileSync(join(ASSETS, job.file));
  const storagePath = `electronics/${row.id}.jpg`;
  const up = await fetch(`${url}/storage/v1/object/product-images/${storagePath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) {
    console.log(`  upload failed: ${(await up.text()).slice(0, 140)}`);
    continue;
  }

  await rest("product_images", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      product_id: row.id,
      partner_id: row.partner_id,
      storage_path: storagePath,
      is_primary: true,
      sort_order: 0,
    }),
  });
  console.log(`  photo attached (${(bytes.length / 1024).toFixed(0)} KB)`);
}

const left = await rest(
  "products?select=title&is_active=eq.true&category_id=eq.5f80faa3-535c-4a39-96a4-b666f3eb2925&product_images=is.null"
);
console.log(`\nElectronics products still without a photo: ${left?.length ?? 0}`);
