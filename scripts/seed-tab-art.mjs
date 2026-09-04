/**
 * Uploads the curated artwork the category tabs use for their recipient
 * circles and entry tiles.
 *
 * WHY THESE SLOTS NEED ARTWORK AT ALL
 *
 * Until now every decorative image on a tab was borrowed from whichever
 * product happened to match the label. For a "Rings" circle that is exactly
 * right — the picture is of a ring. For a RECIPIENT circle it is not: "For
 * Him" on the Fashion tab picked the first product tagged `him`, which was a
 * girls' t-shirt, and on Perfume & Beauty nothing was tagged `father` at all,
 * so the Dad circle rendered empty. A row of seven recipients also has to read
 * as seven different people at a glance, and seven photographs chosen by seven
 * independent queries never will.
 *
 * So recipients and tiles are curated: one deliberate image per slot, the same
 * on every tab, chosen against the house rules — the image shows the labelled
 * thing, it is a gift item rather than a lifestyle scene, and it carries no
 * baked-in text, price, watermark or real brand mark.
 *
 * WHAT WAS REJECTED, so nobody re-picks it:
 *   1787074634411  mom     — brand labels across every bottle in the set
 *   1643122941450  mom     — "Scented Candle Jar" printed on each lid
 *   1681183183805  partner — a "Pralines" box, brand name front and centre
 *   1687471603664  partner — Arabic lettering moulded into the chocolates
 *   1777768785267  friend  — labelled honey jars
 *   1773450970959  ready   — "VERO" branded crate
 *   1773450970981  best    — same brand on the ribbon
 *   1781263538938  best    — Kit Kat, Dairy Milk and Galaxy wrappers
 *   1598634222670  dad     — legible brand on the bottle
 *
 * Usage:  node scripts/seed-tab-art.mjs [--dry]
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const DRY = process.argv.includes("--dry");
const BUCKET = "product-images";

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

/**
 * Recipient art. Each one has to be unmistakably a different person's gift
 * from the other six — that is the whole job of the row.
 *
 * Her is jewellery and Mom is a spa set, so they cannot be confused; Him is a
 * modern watch on black and Dad is classic leather and a dial, which is the
 * age-and-style cue the brief asked for. Partner is the bouquet you hand over,
 * Friend is a candle set, Kids is wooden toys.
 */
const RECIPIENTS = {
  her: "1705326454924-f6777522b030", // gold pendant on a cream display bust
  him: "1617265860230-7794d7c2bcaa", // black-strap watch and card holder, dark ground
  mother: "1540555700478-4be289fbecef", // pump bottle, rolled towel, tea light, tulips
  father: "1628483212179-49f29440423e", // tan leather goods and a classic dial watch
  partner: "1660675865775-15b4a15d1a68", // deep red roses, black wrap, gold ribbon
  friend: "1603905179139-db12ab535ca9", // three candles on a wooden board
  child: "1560859251-d563a49c5e4a", // wooden toy boats on a warm table
};

/**
 * Tile art. A tile is a saved view rather than an object, so these are the
 * idea of the view — but each is still a real photograph of a real gift, and
 * the five that actually render on a tab are visually distinct from each
 * other so the row does not read as five pictures of the same box.
 */
const TILES = {
  "new-in": "1751450236048-aa1981f7bc2d", // kraft parcels, white ribbon
  "arrives-today": "1758523670564-d1d6a734dc0b", // a box handed over at the door
  "gift-wrapped": "1664826078798-92049ba4c6fb", // small white box, peach ribbon, in hand
  "ready-to-gift": "1769286145156-70a40fff80ec", // wicker basket, ribboned book and candle
  deals: "1737093389586-5c56ecf9683a", // stacked boxes with a red ribbon
  "most-gifted": "1625552187571-7ee60ac43d2b", // a wrapped box handed between two people
  "under-75": "1638981091476-271167fbc510", // small wrapped parcels, gold paper
  // Neither of these renders today — there is no order history and `is_pick`
  // is false on every product — but the constant must be complete or the
  // dev-time assertion in tabArt.ts fires the moment one of them comes back.
  "best-sellers": "1737093384332-1f240882b6d6", // brown paper stack
  "store-picks": "1577217534079-41d6bb68ac50", // patterned paper and a red ribbon
};

/**
 * Per-category tile art, where the generic gift photography would be wrong.
 *
 * On a flowers tab every tile has to be flowers. The shared "Under $100" tile
 * is a stack of wrapped parcels, which is a perfectly good picture of a gift
 * and a bad picture of a bouquet — and the tab was showing a candle box and a
 * linen basket for exactly that reason. Four different flowers, so no image
 * repeats in the row.
 */
const CATEGORY_TILES = {
  fashion: {
    // Clothing, not gift wrap. The shared tile art is ribboned parcels, which
    // says nothing about what is behind a Fashion tile.
    "new-in": "1603400521630-9f2de124b33b",      // neutral rail, new season
    "most-gifted": "1763719161790-1e8edf704820", // woman in pink, on model
    "under-75": "1490481651871-ab68de25d43d",    // light wooden hangers
    deals: "1612423284934-2850a4ea6b0f",          // colourful blouse rail
  },
  "flowers-gifts": {
    "under-50": "1544249804-78bcb97b5e65", // a small mixed posy
    "under-100": "1602136303098-f5aa2b9c9df9", // wrapped bouquet in peach paper
    "best-picks": "1680563899402-26c3a712831f", // pink roses, wrapped
    "new-in": "1587235442308-8980bb6e0f17", // tulips in white jugs
  },
};

/**
 * Hero slides, per tab. Fashion only for now — the other ten still take their
 * hero from a product photo, and this is the template that will replace that.
 */
/**
 * "Shop for" circle art, per category and value. A circle names a kind of
 * product, so it shows that product — never a photo borrowed from the grid.
 */
/**
 * Occasion circles on Flowers. Each one says its occasion IN FLOWERS — a
 * bright gerbera mix for Birthday, calm white lilies for Get well, pale pink
 * for New baby. No balloons, no cards, no props.
 */
const OCCASIONS = {
  "flowers-gifts": {
    birthday: "1589100534833-475e31a17b4e",
    "visiting-someone": "1558879860-45f24b366ea1",
    "get-well": "1631407779166-86952be9dbd7",
    newborn: "1622296885520-bf2121072ca0",
    anniversary: "1780948317866-d857dad38d5c",
    wedding: "1484676681417-64a0ea3475fd",
    engagement: "1521520368710-3ab197656d60",
    graduation: "1779738193027-c8a3ec1633ca",
  },
};

/** Flower-type pills. */
const FLOWERS = {
  roses: "1563371448-8b1acb3a3036",
  tulips: "1586554978186-deffc54a0a5c",
  peonies: "1499842790329-14db82033291",
  orchids: "1618080578815-335456280012",
  lilies: "1785037572750-e84fa501dc63",
  mixed: "1688241964978-be062de84537",
};

const CIRCLES = {
  "flowers-gifts": {
    bouquets: "1660549076676-51bbe42a74d1",
    // Flowers arranged IN a box — not a wrapped present. The tab used to show
    // a white gift box here, which is the exact confusion the brief calls out.
    "flower-boxes": "1660885900184-fe13ca69392c",
    plants: "1583846712268-a77d97b7fd68",
    "vase-arrangements": "1686125616977-34f6d5979eb1",
  },
  fashion: {
    women: "1768460608433-d3af5148832c",
    men: "1555689502-c4b22d76c56f",
    "kids-fashion": "1604303768345-038b79a8c47a",
    bags: "1691480150204-66dd1eb77391",
    caps: "1521369909029-2afed882baee",
  },
};

const HEROES = {
  "fashion-1": "1668952135120-7d997b1b3778", // tan coat and trousers, warm studio
  "fashion-2": "1709004915865-38bc70f4cb78", // man in a cream shirt, deep teal ground
  "fashion-3": "1780566758158-86894dcae8e8", // white oversized tee, orange trousers
};

async function upload(path, buf) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

async function photo(id, w = 900) {
  // 900px: these are shown at 62px in a circle and 124px on a tile, so the
  // source only has to survive a 3x screen, and a 2MB hero would be waste.
  const res = await fetch(`https://images.unsplash.com/photo-${id}?w=${w}&q=80&fm=jpg`);
  if (!res.ok) throw new Error(`unsplash ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const jobs = [
  ...Object.entries(RECIPIENTS).map(([k, id]) => ({ path: `art/recipient/${k}.jpg`, id })),
  ...Object.entries(TILES).map(([k, id]) => ({ path: `art/tile/${k}.jpg`, id })),
  // Heroes are full-bleed, so they get a wider source than a 62px circle needs.
  ...Object.entries(CATEGORY_TILES).flatMap(([cat, tiles]) =>
    Object.entries(tiles).map(([k, id]) => ({ path: `art/tile/${cat}--${k}.jpg`, id }))
  ),
  ...Object.entries(CIRCLES).flatMap(([cat, vals]) =>
    Object.entries(vals).map(([k, id]) => ({ path: `art/circle/${cat}--${k}.jpg`, id }))
  ),
  ...Object.entries(OCCASIONS).flatMap(([cat, vals]) =>
    Object.entries(vals).map(([k, id]) => ({ path: `art/occasion/${cat}--${k}.jpg`, id }))
  ),
  ...Object.entries(FLOWERS).map(([k, id]) => ({ path: `art/flower/${k}.jpg`, id })),
  ...Object.entries(HEROES).map(([k, id]) => ({ path: `art/hero/${k}.jpg`, id, w: 1200 })),
];

for (const j of jobs) {
  if (DRY) {
    console.log(`  + ${j.path}  <- photo-${j.id} — dry run`);
    continue;
  }
  await upload(j.path, await photo(j.id, j.w));
  console.log(`  + ${j.path}  <- photo-${j.id}`);
}
console.log(`\n${DRY ? "Would upload" : "Uploaded"} ${jobs.length} curated images.`);
