/**
 * Gives the seeded Gift Sets and Sport products a photo.
 *
 * Product images do NOT live in the repo — they are objects in the Supabase
 * Storage bucket `product-images`, and the app builds a public URL from
 * `product_images.storage_path`. So a photo has to be uploaded, not dropped
 * into public/.
 *
 * These are demo photos for a pre-launch preview. Each one is chosen to
 * actually match the product it sits on — a boot photo on the boots, a ball
 * on the ball — because a mismatched photo is a promise about what arrives.
 * Real partner photography replaces all of it later.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local, same as the
 * backup script. No management token needed.
 *
 * Usage: node scripts/seed-product-photos.mjs
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

/** Unsplash photo id per product title. Each matches its item. */
const PHOTOS = {
  "Teddy, Mug & Chocolates Box": "1513885535751-8b9238bd345a",
  "Big Hug Bear Box": "1530103862676-de8c9debad1d",
  "Coffee Lover Set": "1447933601403-0c6688de566e",
  "Secret Santa Box": "1512909006721-3d6018887383",
  "Movie Night In Box": "1512149177596-f817c7ef5d4c",
  "Sweet Dreams Set": "1549465220-1a8b9238cd48",
  "New Home Box": "1513201099705-a9746e1e201f",
  "Little One Gift Box": "1522771930-78848d9293e8",
  "Football Kit — Shirt, Shorts & Socks": "1517466787929-bc90951d0974",
  "Firm Ground Football Boots": "1511886929837-354d827aae26",
  "Indoor Football Trainers": "1542291026-7eec264c27ff",
  "Match Football": "1614632537190-23e4146777db",
  "Training Tracksuit": "1556906781-9a412961c28c",
  "Running Trainers": "1595950653106-6c9ebd614d3a",
  "Sports Holdall": "1553062407-98eeb64c6a62",
  "Training Tee & Shorts Set": "1571019613454-1cb2f99b2d8b",
  "Goalkeeper Gloves": "1550881111-7cfde14b8073",
  "Shin Pads": "1526232761682-d26e03ac148e",
};

const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}

const products = await rest(
  "products?select=id,title,partner_id&price_is_placeholder=eq.true&order=title"
);

let done = 0;
let skipped = 0;

for (const p of products) {
  const photoId = PHOTOS[p.title];
  if (!photoId) {
    console.log(`  skip (no photo chosen): ${p.title}`);
    skipped++;
    continue;
  }

  const existing = await rest(`product_images?select=id&product_id=eq.${p.id}`);
  if (existing.length) {
    skipped++;
    continue;
  }

  const img = await fetch(`https://images.unsplash.com/photo-${photoId}?w=1000&q=80`);
  if (!img.ok) {
    console.log(`  FAILED to fetch photo for ${p.title}`);
    continue;
  }
  const bytes = Buffer.from(await img.arrayBuffer());

  const path = `seed/${p.id}.jpg`;
  const up = await fetch(`${url}/storage/v1/object/product-images/${path}`, {
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
    body: JSON.stringify({ product_id: p.id, partner_id: p.partner_id, storage_path: path, is_primary: true, sort_order: 0 }),
  });

  console.log(`  ${p.title} -> ${(bytes.length / 1024).toFixed(0)} KB`);
  done++;
}

console.log(`\n${done} photos attached, ${skipped} skipped.`);
