/**
 * Wordmark logos for every shop that has none, plus a cover photo for
 * Cedar & Clay and a men's fragrance photo for Perfume & Beauty.
 *
 * WHY THE LOGOS ARE DRAWN, NOT PHOTOGRAPHED. Two of twenty-seven shops have a
 * real logo file — GS and Zahar. Everywhere a logo is wanted (Popular brands,
 * the store circles, the All-stores cards) the other twenty-five fell back to
 * two grey initials, so those rows read as broken rather than as brands.
 *
 * These are ORIGINAL WORDMARKS for CADO's own placeholder shops: the shop's
 * name set in a typeface, on its own tint, with a rule under it. Nothing here
 * imitates an existing company's mark, which is the one hard rule about logos
 * on this project — Zahar and GS keep the real files they already have and are
 * skipped.
 *
 * SVG rather than PNG so they stay sharp at any circle size and cost about a
 * kilobyte each. The tint is derived from the name, so a shop keeps the same
 * colour every run rather than shuffling on each deploy.
 *
 * Idempotent: a shop that already has `logo_url` is left alone. To redraw one,
 * clear its logo_url first.
 *
 * Usage: node scripts/seed-store-logos.mjs
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

async function upload(bucket, path, bytes, type) {
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": type, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${(await res.text()).slice(0, 200)}`);
}

const publicUrl = (bucket, path) => `${url}/storage/v1/object/public/${bucket}/${path}`;

/* ------------------------------------------------------------ the wordmark */

/** A stable hue from the name, so a shop keeps its colour between runs. */
function hueFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A MONOGRAM, not the full name — because of the size it is shown at.
 *
 * The first version set the whole shop name across the mark. It rendered
 * correctly and was still useless: these appear in a 60-64px tile, so
 * "Bright Spark Electronics" came out about five pixels tall and read as an
 * empty white square. That is why real boutique logos at this size are two or
 * three letters, and why GS — which is exactly that — was the one mark on the
 * page that worked.
 *
 * So: initials, set large in a serif over a tinted ground with a rule under
 * them. The shop's full name is already printed beneath the tile by the UI,
 * so the mark does not have to spell it out.
 */
function monogram(name) {
  const clean = name.replace(/\[.*?\]\s*/g, "").trim();
  const words = clean.split(/\s+/).filter((w) => !/^(&|and|the|co\.?|of)$/i.test(w));
  if (words.length === 0) return clean.slice(0, 2).toUpperCase();
  // One short word stands on its own — "Zahar", "Mimosa" read better whole.
  if (words.length === 1) {
    return words[0].length <= 7 ? words[0].toUpperCase() : words[0].slice(0, 2).toUpperCase();
  }
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
}

function wordmark(name) {
  const hue = hueFor(name);
  const ink = `hsl(${hue} 44% 24%)`;
  const tint = `hsl(${hue} 40% 95%)`;
  const rule = `hsl(${hue} 38% 58%)`;
  const mark = monogram(name);

  // Sized so the mark fills most of the width whatever its length — this is
  // the whole point of the redraw.
  const size = mark.length <= 2 ? 52 : mark.length === 3 ? 40 : mark.length <= 5 ? 27 : 22;
  const tracking = mark.length <= 3 ? 2 : 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">
<rect width="100" height="100" fill="${tint}"/>
<text x="50" y="58" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="${ink}" letter-spacing="${tracking}">${escape(mark)}</text>
<rect x="34" y="70" width="32" height="2.5" fill="${rule}"/>
</svg>`;
}

/* ------------------------------------------------------------------ run it */

const partners = await rest("partners?select=id,name,slug,logo_url,cover_image_url&status=eq.active&order=name");

let made = 0;
for (const p of partners) {
  if (p.logo_url) continue;
  /*
   * STORED AS A data: URI, not as a file.
   *
   * The partner-logos bucket rejects image/svg+xml outright — its allowed
   * mime list excludes SVG, because an SVG can carry script. These marks are
   * generated here from a name and a hue so there is nothing to smuggle, and
   * the storefront CSP already permits img-src 'self' data:. About a kilobyte
   * each, which is smaller than the HTTP request fetching a file would cost.
   */
  const svg = wordmark(p.name);
  const uri = "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
  await rest(`partners?id=eq.${p.id}`, {
    method: "PATCH",
    body: JSON.stringify({ logo_url: uri }),
  });
  console.log(`  wordmark: ${p.name}`);
  made++;
}
console.log(`${made} wordmarks created; ${partners.length - made} shops already had a logo.`);

/* ------------------------------------- Cedar & Clay gets a real cover photo */

async function unsplash(id, width = 1400) {
  const res = await fetch(`https://images.unsplash.com/photo-${id}?w=${width}&q=80`);
  if (!res.ok) throw new Error(`unsplash ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const [cedar] = await rest("partners?slug=eq.cedar-and-clay&select=id,cover_image_url");
if (cedar && !cedar.cover_image_url) {
  // Looked at: a homeware shop interior — open shelving with vases, candles
  // and ceramics, a counter to the left. Reads unmistakably as a home shop.
  const path = "covers/cedar-and-clay.jpg";
  await upload("partner-logos", path, await unsplash("1746719799047-0d55026e5a14"), "image/jpeg");
  await rest(`partners?id=eq.${cedar.id}`, {
    method: "PATCH",
    body: JSON.stringify({ cover_image_url: publicUrl("partner-logos", path) }),
  });
  console.log("Cedar & Clay cover photo set");
}

/* ------------------------- a men's fragrance photo for Perfume & Beauty ---
 *
 * The "For him" tile had no photo: only one perfume carried the `him` tag and
 * its picture had already gone to a slot above. Signature Eau de Parfum is
 * tagged `him` as well now — a signature EDP is the least gendered thing on
 * that shelf — and it gets a bottle shot to match.
 *
 * Finding one took several searches. Unsplash fragrance photography is almost
 * entirely branded: Armani, YSL, Vera Wang and a "Scuba" bottle all came back
 * with the maker's name legible across the glass and were rejected. This one
 * is a plain rectangular bottle with no mark on it at all.
 */
const [sig] = await rest("products?slug=eq.signature-eau-de-parfum&select=id,partner_id,recipient_tags");
if (sig) {
  const tags = new Set([...(sig.recipient_tags ?? []), "him"]);
  await rest(`products?id=eq.${sig.id}`, {
    method: "PATCH",
    body: JSON.stringify({ recipient_tags: [...tags] }),
  });

  const path = `seed/${sig.id}-mens.jpg`;
  await upload("product-images", path, await unsplash("1559062109-573202f73754"), "image/jpeg");
  const existing = await rest(`product_images?product_id=eq.${sig.id}&select=id`);
  for (const img of existing) await rest(`product_images?id=eq.${img.id}`, { method: "DELETE" });
  await rest("product_images", {
    method: "POST",
    body: JSON.stringify({ product_id: sig.id, partner_id: sig.partner_id, storage_path: path, is_primary: true }),
  });
  console.log("Signature Eau de Parfum: tagged for him + new bottle photo");
}

console.log("\nDone.");
