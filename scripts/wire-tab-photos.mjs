/**
 * The photos for the unified category tabs.
 *
 * Every file named here lives in apps/web/public (tiles/ and heroes/) and is
 * recorded with its Unsplash id in public/tiles/SOURCES.txt. Each one was
 * opened and looked at before being chosen, and anything carrying a real
 * brand mark was rejected — that rule threw out most of the obvious search
 * results for chocolate gift boxes and football boots.
 *
 * A tile whose photo is NOT set here keeps the existing behaviour: a real
 * product from this category that genuinely satisfies the tile's own filter.
 * That is deliberate. A stock photo is only worth using where it beats a real
 * product shot at saying what the tile means.
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
  return { url, key };
}
const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest(p);
const patch = (p, body) => rest(p, { method: "PATCH", body: JSON.stringify(body) });

/** [tab slug, block type, tile label] → image path. */
const TILE_PHOTOS = [
  // Fashion — clothing only, no bags anywhere. Editorial, big-brand energy.
  ["fashion", "entry_cards", "Women", "/tiles/fashion-women.jpg"],
  ["fashion", "entry_cards", "Men", "/tiles/fashion-men.jpg"],
  ["fashion", "entry_cards", "Best Sellers", "/tiles/fashion-bestsellers.jpg"],
  // The circles get their OWN photos. Sharing a file with the entry tile
  // above put the same picture twice on one screen, which reads as a bug:
  // tile = someone wearing it, circle = the rail it hangs on.
  ["fashion", "category_circles", "Kids", "/tiles/fashion-kids.jpg"],
  ["fashion", "category_circles", "Men", "/tiles/fashion-men-circle.jpg"],
  ["fashion", "category_circles", "Women", "/tiles/fashion-women-circle.jpg"],
  // Jewelry — jewellery only. The old For Her was a bag; this one is a chain
  // on a woman, and For Him is a watch rather than a belt.
  ["jewelry", "entry_cards", "For Her", "/tiles/jewelry-for-her.jpg"],
  ["jewelry", "entry_cards", "For Him", "/tiles/jewelry-for-him.jpg"],
  ["jewelry", "entry_cards", "Necklaces", "/tiles/jewelry-necklaces.jpg"],
  ["jewelry", "entry_cards", "Under $100", "/tiles/jewelry-price.jpg"],
  // Chocolate — a gift you carry to someone's house, not a candy bar.
  ["chocolate", "entry_cards", "Best Sellers", "/tiles/chocolate-bestsellers.jpg"],
  ["chocolate", "entry_cards", "Birthday", "/tiles/chocolate-birthday.jpg"],
  // Gift sets — wrapped, ribboned, ready to hand over.
  ["home", "entry_cards", "For Her", "/tiles/giftsets-for-her.jpg"],
  ["home", "entry_cards", "New In", "/tiles/giftsets-new-in.jpg"],
  // Sport.
  ["sport", "entry_cards", "Training", "/tiles/sport-training.jpg"],
];

/** tab slug → hero photo for the first carousel slide. */
const HERO_PHOTOS = {
  fashion: "/heroes/fashion.jpg",
  chocolate: "/heroes/chocolate.jpg",
  home: "/heroes/gift-sets.jpg",
  sport: "/heroes/sport.jpg",
};

const tabs = await get("browse_tabs?select=id,slug&is_active=eq.true");
const blocks = await get("browse_blocks?select=id,tab_id,type&is_active=eq.true");
const tiles = await get("browse_tiles?select=id,block_id,label");
const banners = await get("browse_banners?select=id,block_id,headline");

const blockOf = (tabSlug, type) => {
  const tab = tabs.find((t) => t.slug === tabSlug);
  return tab ? blocks.find((b) => b.tab_id === tab.id && b.type === type) : null;
};

for (const [tabSlug, type, label, image] of TILE_PHOTOS) {
  const block = blockOf(tabSlug, type);
  const tile = block ? tiles.find((t) => t.block_id === block.id && t.label === label) : null;
  if (!tile) {
    console.log(`! ${tabSlug}/${label}: tile not found`);
    continue;
  }
  await patch(`browse_tiles?id=eq.${tile.id}`, { image_url: image });
  console.log(`~ ${tabSlug}/${label} → ${image}`);
}

for (const [tabSlug, image] of Object.entries(HERO_PHOTOS)) {
  const block = blockOf(tabSlug, "banner_carousel");
  const rows = block ? banners.filter((b) => b.block_id === block.id) : [];
  if (!rows.length) {
    console.log(`! ${tabSlug}: no banner row`);
    continue;
  }
  for (const r of rows) {
    await patch(`browse_banners?id=eq.${r.id}`, { image_url: image });
    console.log(`~ ${tabSlug} hero "${r.headline}" → ${image}`);
  }
}

/*
 * Fashion is clothing. The hero's second slide is whatever product in the
 * category is flagged is_featured, and one of those was a Leather Weekend
 * Bag — the bag Marwan called out. Unfeaturing it takes it off the hero
 * without deleting anything; it still sits in the grid where it was
 * catalogued.
 */
const bag = await get("products?select=id,title&title=eq.Leather%20Weekend%20Bag");
for (const p of bag) {
  await patch(`products?id=eq.${p.id}`, { is_featured: false });
  console.log(`~ unfeatured "${p.title}" (no bags on the Fashion hero)`);
}

console.log("done");
