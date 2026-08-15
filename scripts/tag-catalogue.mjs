/**
 * Gives the catalogue its occasion and recipient tags.
 *
 * WHY: every occasion chip showed the same "72 gifts" and then "Nothing
 * tagged visiting someone yet", because 112 of 159 products carried no
 * occasion tag at all and three of the eight occasions CADO offers —
 * Visiting Someone, Get Well Soon, Engagement — were carried by nothing in
 * the catalogue. The chips were decoration.
 *
 * THE RULE THAT MATTERS: this does not scatter tags to hit a number. Each
 * rule below is an editorial judgement about what a gift is actually FOR, and
 * a product that genuinely does not suit an occasion stays untagged — that
 * occasion simply returns fewer results, which is a true answer. A football
 * boot is not a Get Well Soon gift and nothing here will claim it is.
 *
 * It is also additive: tags already on a product are kept and merged, never
 * overwritten, so any hand-curation already done survives.
 *
 * Auth: the SERVICE ROLE key from apps/dashboard/.env.local. UPDATE only.
 *
 * Usage:
 *   node scripts/tag-catalogue.mjs --dry    (report only, writes nothing)
 *   node scripts/tag-catalogue.mjs
 *   node scripts/tag-catalogue.mjs --rebuild <baseline.json>
 *
 * --rebuild exists because merge-only cannot take a tag away. The first run
 * of this script used looser rules (every fashion/shoes/jewelry item got
 * "birthday") and landed Birthday on 126 of 159 products — 79% of the shop,
 * which makes the chip useless as a filter. Merging tightened rules on top
 * changes nothing, because merge only adds.
 *
 * So --rebuild recomputes from scratch: final tags = the hand-curated tags in
 * the baseline file ∪ what the current rules derive. The baseline is the
 * nightly backup's products.json from BEFORE the first tagging run
 * (2026-08-15T00-00-02) — those 47 products' tags predate any script and are
 * kept verbatim. Products not in the baseline (added since) get rules only.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const DRY = process.argv.includes("--dry");

const rebuildIdx = process.argv.indexOf("--rebuild");
/** id -> {occasion_tags, recipient_tags} from before any script ran. */
const BASELINE = new Map(
  rebuildIdx !== -1
    ? JSON.parse(readFileSync(process.argv[rebuildIdx + 1], "utf8")).map((p) => [p.id, p])
    : []
);
const REBUILD = rebuildIdx !== -1;

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

const has = (s, ...words) => words.some((w) => s.includes(w));

/**
 * What a gift is for, by what it actually is.
 *
 * Read top-down: the category sets the baseline, then the title refines it.
 * Nothing here is random — if you disagree with a line, it is arguable in
 * words, which is the point.
 */
function tagsFor(title, categorySlug) {
  const t = title.toLowerCase();
  const occasions = new Set();
  const recipients = new Set();

  switch (categorySlug) {
    case "chocolate":
      // The default thing you carry into someone's house in Lebanon.
      occasions.add("visiting-someone").add("birthday");
      recipients.add("friend").add("colleague");
      break;

    case "flowers-gifts":
      occasions.add("visiting-someone").add("get-well").add("anniversary");
      recipients.add("her").add("mother");
      break;

    case "gift-sets":
      occasions.add("birthday").add("visiting-someone");
      recipients.add("her").add("friend");
      break;

    case "jewelry-accessories":
      // Deliberately NOT birthday. Jewellery is the romantic-occasion gift;
      // making it a birthday gift too would put it in a chip that already
      // holds most of the shop.
      occasions.add("anniversary").add("valentine");
      recipients.add("her").add("partner");
      break;

    case "perfumes":
      occasions.add("birthday").add("anniversary");
      recipients.add("her").add("partner");
      break;

    case "toys":
      occasions.add("birthday");
      recipients.add("child");
      break;

    case "electronics":
      // The classic graduation present, and a plausible birthday one.
      occasions.add("birthday").add("graduation");
      recipients.add("him");
      break;

    case "sport":
      occasions.add("birthday");
      recipients.add("him").add("child");
      break;

    case "fashion":
    case "shoes":
      // No occasion by default, and that is the honest answer: clothes and
      // shoes are overwhelmingly bought for oneself. A cap is not a
      // graduation present because it happens to be in the shop. The title
      // rules below still tag the ones that genuinely are gifts.
      break;
  }

  /* ---- title refinements, applied on top of the category baseline ---- */

  // Anything that goes into a home, rather than onto a person.
  if (has(t, "candle", "diffuser", "scent", "vase", "mug", "home", "frame", "lamp", "picnic", "blanket"))
    occasions.add("housewarming").add("visiting-someone");

  // Comfort objects. These are the honest Get Well Soon answers.
  if (has(t, "teddy", "plush", "bear", "bunny", "blanket", "candle", "basket", "hamper", "soap", "bath"))
    occasions.add("get-well");

  // A ring is the engagement gift; nothing else in the catalogue is.
  if (has(t, "ring", "solitaire", "engagement")) {
    occasions.add("engagement");
    recipients.add("partner");
  }

  if (has(t, "necklace", "bracelet", "earring", "pendant")) {
    occasions.add("valentine");
    recipients.add("her");
  }

  if (has(t, "baby", "newborn", "little one", "nursery", "infant", "twins")) {
    occasions.add("newborn");
    recipients.add("child");
    occasions.delete("graduation");
  }

  if (has(t, "notebook", "pen", "desk", "executive", "watch")) {
    occasions.add("graduation");
    recipients.add("colleague");
  }

  if (has(t, "wedding", "bride", "couple")) occasions.add("wedding");

  /* ---- who it is for, from the words on the product ---- */
  if (has(t, "kids", "kid", "boys", "girls", "child", "children", "baby", "toddler")) {
    recipients.add("child");
    recipients.delete("partner");
    recipients.delete("colleague");
    // A child's gift is not an anniversary or engagement present.
    occasions.delete("anniversary");
    occasions.delete("engagement");
    occasions.delete("valentine");
  }
  if (has(t, "men", "men's", "mens", "him", "male", "father", "dad", "boss")) {
    recipients.add("him");
    recipients.delete("her");
  }
  if (has(t, "women", "women's", "womens", "her", "ladies", "lady", "mom", "mother")) {
    recipients.add("her");
  }

  // Cap the breadth. A product that claims six occasions claims none.
  return {
    occasions: [...occasions].slice(0, 4),
    recipients: [...recipients].slice(0, 4),
  };
}

/* ------------------------------------------------------------------ run */

const products = await rest(
  "products?select=id,title,occasion_tags,recipient_tags,category:categories(slug)&limit=2000&order=title"
);

const before = { occ: {}, rec: {}, noOcc: 0, noRec: 0 };
const after = { occ: {}, rec: {}, noOcc: 0, noRec: 0 };
const count = (bucket, list) => list.forEach((v) => (bucket[v] = (bucket[v] || 0) + 1));

let changed = 0;
const untouched = [];

for (const p of products) {
  const curOcc = p.occasion_tags || [];
  const curRec = p.recipient_tags || [];
  count(before.occ, curOcc);
  count(before.rec, curRec);
  if (!curOcc.length) before.noOcc++;
  if (!curRec.length) before.noRec++;

  const slug = p.category?.slug ?? "";
  const derived = tagsFor(p.title, slug);

  // Normal mode merges onto what is live. Rebuild merges onto the BASELINE —
  // the hand-curated tags from before any script — so a tag the old loose
  // rules scattered simply doesn't come back. Hand curation survives both.
  const base = REBUILD ? (BASELINE.get(p.id) ?? { occasion_tags: [], recipient_tags: [] }) : p;
  const baseOcc = base.occasion_tags || [];
  const baseRec = base.recipient_tags || [];
  const nextOcc = [...new Set([...baseOcc, ...derived.occasions])];
  const nextRec = [...new Set([...baseRec, ...derived.recipients])];

  count(after.occ, nextOcc);
  count(after.rec, nextRec);
  if (!nextOcc.length) after.noOcc++;
  if (!nextRec.length) after.noRec++;
  if (!nextOcc.length && !nextRec.length) untouched.push(`${p.title} [${slug || "no category"}]`);

  const same =
    nextOcc.length === curOcc.length &&
    nextRec.length === curRec.length &&
    nextOcc.every((v) => curOcc.includes(v)) &&
    nextRec.every((v) => curRec.includes(v));
  if (same) continue;

  if (!DRY) {
    await rest(`products?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ occasion_tags: nextOcc, recipient_tags: nextRec }),
    });
  }
  changed++;
}

const table = (label, b, a) => {
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  console.log(`\n${label}`);
  for (const k of keys) console.log(`  ${k.padEnd(18)} ${String(b[k] ?? 0).padStart(4)}  ->  ${String(a[k] ?? 0).padStart(4)}`);
};

console.log(`${products.length} products, ${changed} ${DRY ? "would change" : "updated"}${DRY ? "  (DRY RUN)" : ""}`);
table("OCCASIONS", before.occ, after.occ);
table("RECIPIENTS", before.rec, after.rec);
console.log(`\nno occasion tag: ${before.noOcc} -> ${after.noOcc}`);
console.log(`no recipient tag: ${before.noRec} -> ${after.noRec}`);

if (untouched.length) {
  console.log(`\nDeliberately left with NO tags (${untouched.length}) — nothing here honestly fits an occasion:`);
  for (const u of untouched.slice(0, 25)) console.log(`  ${u}`);
  if (untouched.length > 25) console.log(`  ...and ${untouched.length - 25} more`);
}
