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
 * Rejected on the Fashion re-shoot (all nine slots, Sep 2026):
 *   1645276241987  bags    — Coach signature monogram and logo plate
 *   1680295456691  caps    — Fred Perry laurel embroidered on the crown
 *   1680295536578  caps    — the same laurel, closer
 *   1603129700763  caps    — Carhartt logo, and a dark room besides
 *   1580981440054  men     — brand name printed on the shirt's neck tape
 *   1562157873     tiles   — "swella" wordmark embroidered on both sweatshirts
 *   1624879944018  tiles   — hung on a brick wall; the brief bans brick
 *   1601379327928  women   — already the Merino Crewneck's product photo on
 *                            this very tab, so it would have appeared twice
 *   1633008004535  women   — olive headband on the stack
 *   1641642231157  tiles   — two forest-green sweaters in the pile
 *   1621198059871  kids    — a green branch takes a third of the frame
 *   1713881630214  men     — the top tee is navy, and blue is out
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
 * A slot's value is either a bare Unsplash id — 900px wide, JPEG, uncropped,
 * which is what every slot took when there was only one shape to serve — or an
 * object that asks for a specific crop and format.
 *
 * The Fashion row needed the second kind. Five circles only read as a set if
 * they are cropped identically, and cropping in CSS is not the same as cropping
 * the file: `object-fit: cover` on a 3:2 source throws away a third of the
 * picture at display time, so what was judged on a contact sheet is not what
 * ships. Asking Unsplash for the exact square means the file on disk IS the
 * picture, and the tall tiles get 3:4 for the same reason.
 */
const SQUARE = { w: 400, h: 400, fmt: "webp" }; // "Shop for" circles
const TALL = { w: 600, h: 800, fmt: "webp" }; // entry tiles
const spec = (v) => (typeof v === "string" ? { id: v } : v);
const MIME = { jpg: "image/jpeg", webp: "image/webp" };

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
  /*
   * Fashion, re-shot. The four tiles were clothing already, but two of them
   * were the wrong clothing: "Most gifted" was a jewellery photograph on a
   * fashion tab, and "Under $75" was a rack shot in colours that fought the
   * page. All four are now warm neutrals — cream, camel, sand, white, soft
   * black — with no faces and no busy scene, and no two share a composition:
   * a rail, a knit close-up, a single flat garment, a hanging coat.
   */
  fashion: {
    // Pale shirts on white hangers against a white wall — a rail of unworn
    // stock, which is what "New in" means. Dinh Ng.
    "new-in": { ...TALL, id: "1580682312385-e94d8de1cf3c" },
    // Cream cable-knit cardigan over a warm brown knit, close. Replaces the
    // jewellery photo: knitwear is the thing people actually gift off a
    // clothes tab. Nataliya Melnychuk.
    "most-gifted": { ...TALL, id: "1670080514836-2a007ec86f6a" },
    // A plain white shirt laid on a pale table. Replaces the clothes rack,
    // and says everyday basics rather than a shop floor. Milli und Gold.
    "under-75": { ...TALL, id: "1693048737398-c63e70f27da0" },
    // Cream trench coat hanging, two soft-black jackets behind it, on white
    // panelling. The one full-length garment in the four. Lisa Anna.
    deals: { ...TALL, id: "1722859031306-4c81e8d83957" },
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
  /*
   * Fashion, re-shot as a SET rather than five separate good pictures.
   *
   * The row it replaces mixed full-body models, a legs-only shot on brick and
   * two product cutouts, so it read as five photographs that had never met.
   * At 62px a face is unreadable noise and a street scene is mud, so every one
   * of these five is now: the garment or the product only, no face, one
   * subject centred, a light neutral or cream ground, and warm neutrals only —
   * cream, camel, sand, white, soft black. Nothing red, blue or green.
   *
   * They are cropped square in the FILE, not by the browser, so the five
   * arrive at the same zoom instead of being re-cropped at display time.
   */
  fashion: {
    // Folded cream and camel knits, soft light. Kateryna Hliznitsova.
    women: { ...SQUARE, id: "1633943934209-31b7f3775fee" },
    // Cream linen shirts on wooden hangers, close. Pew Nguyen.
    men: { ...SQUARE, id: "1687405181716-4107f1d84a0c" },
    // A cream baby dress, a wooden toy camera and tan sandals on white
    // muslin — a small outfit, no child in it. Amanda Selby.
    "kids-fashion": { ...SQUARE, id: "1777397660834-67c6d0eabe15" },
    // One tan leather handbag, cut out on white. personalgraphic.com.
    bags: { ...SQUARE, id: "1691480250099-a63081ecfcb8" },
    // One plain white cap on white — no crest, no wordmark, nothing that
    // could be mistaken for somebody's brand. Mediamodifier.
    caps: { ...SQUARE, id: "1588850561407-ed78c282e89b" },
  },
};

const HEROES = {
  "fashion-1": "1668952135120-7d997b1b3778", // tan coat and trousers, warm studio
  "fashion-2": "1709004915865-38bc70f4cb78", // man in a cream shirt, deep teal ground
  "fashion-3": "1780566758158-86894dcae8e8", // white oversized tee, orange trousers
};

async function upload(path, buf, fmt) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": MIME[fmt], "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

async function photo({ id, w = 900, h, fmt = "jpg" }) {
  // 900px: these are shown at 62px in a circle and 124px on a tile, so the
  // source only has to survive a 3x screen, and a 2MB hero would be waste.
  // With `h`, Unsplash crops to that exact box centre-out, which is the same
  // point `object-fit: cover` would have chosen — so the file matches what was
  // judged on the contact sheet.
  const q = new URLSearchParams({ w: String(w), q: "80", fm: fmt });
  if (h) {
    q.set("h", String(h));
    q.set("fit", "crop");
  }
  const res = await fetch(`https://images.unsplash.com/photo-${id}?${q}`);
  if (!res.ok) throw new Error(`unsplash ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * The extension follows the format, so a slot that switches to WebP lands at a
 * new storage path and cannot be silently served as the old JPEG. tabArt.ts
 * carries the same path, and the two have to be edited together.
 */
const job = (base, v, extra = {}) => {
  const s = { ...spec(v), ...extra };
  return { ...s, path: `${base}.${s.fmt ?? "jpg"}` };
};

const jobs = [
  ...Object.entries(RECIPIENTS).map(([k, v]) => job(`art/recipient/${k}`, v)),
  ...Object.entries(TILES).map(([k, v]) => job(`art/tile/${k}`, v)),
  ...Object.entries(CATEGORY_TILES).flatMap(([cat, tiles]) =>
    Object.entries(tiles).map(([k, v]) => job(`art/tile/${cat}--${k}`, v))
  ),
  ...Object.entries(CIRCLES).flatMap(([cat, vals]) =>
    Object.entries(vals).map(([k, v]) => job(`art/circle/${cat}--${k}`, v))
  ),
  ...Object.entries(OCCASIONS).flatMap(([cat, vals]) =>
    Object.entries(vals).map(([k, v]) => job(`art/occasion/${cat}--${k}`, v))
  ),
  ...Object.entries(FLOWERS).map(([k, v]) => job(`art/flower/${k}`, v)),
  // Heroes are full-bleed, so they get a wider source than a 62px circle needs.
  ...Object.entries(HEROES).map(([k, v]) => job(`art/hero/${k}`, v, { w: 1200 })),
];

// One slot, one file. A repeated path means two slots would fight over the
// same object and the loser would be whichever ran second.
const dupes = jobs.map((j) => j.path).filter((p, i, a) => a.indexOf(p) !== i);
if (dupes.length) throw new Error(`Two slots claim the same path: ${dupes.join(", ")}`);

for (const j of jobs) {
  const size = j.h ? ` ${j.w}x${j.h}` : "";
  if (DRY) {
    console.log(`  + ${j.path}${size}  <- photo-${j.id} — dry run`);
    continue;
  }
  await upload(j.path, await photo(j), j.fmt ?? "jpg");
  console.log(`  + ${j.path}${size}  <- photo-${j.id}`);
}
console.log(`\n${DRY ? "Would upload" : "Uploaded"} ${jobs.length} curated images.`);
