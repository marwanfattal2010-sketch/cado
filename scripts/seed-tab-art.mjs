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
 * Rejected on the Flowers tile re-shoot (four slots, Sep 2026). The brief was
 * one composed bouquet, clean uncluttered ground, no text and no packaging, so
 * most of what a flower search returns fails it:
 *   1602136303098  tiles   — the tile it replaces: a florist's printed sticker
 *                            ("HARR…") legible on the wrapping paper
 *   1602135452565  tiles   — the same florist's paper, same wordmark
 *   1544249804     tiles   — the tile it replaces: bouquet half-cropped off
 *                            the right edge, no background to speak of
 *   1587235442308  tiles   — the tile it replaces: jugs on a near-black
 *                            ground, nowhere near the other three for light
 *   1599791095997  tiles   — "Just for you" printed along the ribbon
 *   1680563094046  tiles   — printed care tag hanging off the ribbon
 *   1689061732262  tiles   — printed label on the paper, dark wood table
 *   1655744342825  tiles   — florist's card tied to the stems
 *   1523693916903  tiles   — shot lying on grass
 *   1655744348513  tiles   — leopard-print sleeve and a boot in frame
 *   1717785386175  tiles   — near-black background; so are 1719529006092,
 *                            1649140938067, 1773114326711
 *   1579532648866  tiles   — loose stems flat on concrete, which the brief
 *                            bans by name; so is 1689085055401
 *   1674758445398  tiles   — half-cropped styling flat, not a bouquet
 *   1729151634645  tiles   — carved cabinet and greenery behind the subject
 *   1625382270782  tiles   — a room, a framed print and an arm; a scene
 *   1622658641558  tiles   — very nearly shipped as Under $50, and caught at
 *                            full size: cursive lettering printed the length
 *                            of the ribbon. Same fault as 1622658641561, which
 *                            is the same photographer's next frame.
 *   1567696153798  tiles   — a printed card being clipped to the wrapping
 *   1685270065783  tiles   — florist's bench, twine, and a printed label
 *   1590545601547  grad    — "Arizona State University" across the folder
 *   1747576686252  grad    — a name and a university seal on the sash
 *   1639891673700  grad    — a school's name embossed on the cover
 *   1559443065     grad    — "2019" on the tassel charm, and a violent blue
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
  /*
   * Flowers, re-shot as a SET (Sep 2026). The four it replaces were four
   * different photographs of flowers and nothing more: a half-cropped posy
   * running off the right edge, a cluttered marble flat-lay with a florist's
   * printed sticker legible in it, a tight pink-on-pink crop, and tulips in
   * jugs on a near-black ground. Put side by side they shared no crop, no
   * background and no light level, and one of them broke the no-brand rule.
   *
   * All four are now the same picture made four ways: ONE bouquet, upright and
   * centred, filling the frame, against a plain pale ground in even daylight,
   * in cream / blush / peach and nothing louder. No shop floor, no market
   * stall, no loose stems on a table, no packaging or lettering in frame. The
   * wrap colour is what separates them — mauve, ivory, blush, and one white
   * arrangement in a pale vase so the row is not four copies of one idea.
   *
   * 600x800 in the FILE: a Flowers tile is 152x200, which is exactly 3:4, so
   * the file and the tile agree and the browser crops nothing at display time.
   */
  "flowers-gifts": {
    // A white and green arrangement in a pale ceramic vase against a cream
    // wall — the one that is not a wrapped bouquet, so the row is four
    // arrangements rather than four photographs of the same idea, and the
    // quietest of them, which is the right note for the cheapest tile. The
    // rect is why it holds its own beside the other three: see `photo()`.
    // Annie Spratt.
    "under-50": { ...TALL, id: "1646925910567-1ff71e3f32df", rect: "400,2200,3100,4133" },
    // A blush and cream bouquet in mauve wrap with a peach ribbon, held up
    // against plain white. shche_ team.
    "under-100": { ...TALL, id: "1644248422980-8e0eb75a1557" },
    // The fullest of the four — cream roses, peach carnations, eucalyptus and
    // gypsophila in a blush wrap with a long peach ribbon. The one that has to
    // look like the best thing on the tab. Lorena Lizeth Gonzalez Briones.
    "best-picks": { ...TALL, id: "1667010723263-8ad9a8f5f6c6" },
    // Cream roses and eucalyptus in an ivory wrap, held against pale grey.
    // The crispest and coolest of the four, which is what "New in" wants.
    // Arjun Lama.
    "new-in": { ...TALL, id: "1652346064068-1ae0d97502c3" },
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
/*
 * SEVEN OF THE EIGHT OCCASION CIRCLES ARE NOT UPLOADED BY THIS SCRIPT.
 *
 * There used to be eight Unsplash ids here — a gerbera mix for Birthday, white
 * lilies for Get well, and so on, on the rule that every slot on a flowers tab
 * must be flowers. Marwan reversed that for the occasion circles specifically:
 * eight bouquets in a row cannot tell you which one is Birthday, so the row
 * stopped meaning anything. The originals go back — the "Happy Birthday"
 * balloons, the rings on white blooms, the newborn's feet, the pink tulip, the
 * couple on the beach, the gift box.
 *
 * "The exact images this app used before" are FILES IN THIS REPO, at
 * apps/web/public/occasions/, unchanged since August and already deployed at
 * /occasions/*.jpg. Re-uploading copies of them into product-images would give
 * one photograph two homes and let the copy drift from the original, so
 * src/lib/tabArt.ts points straight at the public files instead. Nothing to
 * upload, nothing to keep in step. See the note over OCCASION_ART there.
 *
 * The old flower JPEGs are still sitting at art/occasion/flowers-gifts--*.jpg
 * in storage. Nothing reads them; they are left rather than deleted, because
 * deleting is the irreversible half of a change that did not need to be made.
 *
 * GRADUATION IS THE ONE EXCEPTION, and it is here because the row was looked
 * at at 70px rather than assumed. public/occasions/graduation.jpg is a wide
 * shot of a cap thrown into an empty sky: cropped to a 70px disc it is a pale
 * blue-grey circle with a speck in it, next to seven circles whose subject
 * fills the frame. It also carries a real university's lettering on the stole.
 * So Flowers overrides it, exactly the way a category already overrides a
 * shared tile — and the file itself is left alone, because the All tab's
 * occasion rail and /find still serve it through lib/filters.ts and changing
 * it there was not what was asked for.
 */
const OCCASIONS = {
  "flowers-gifts": {
    // A graduate in cap and gown against a plain warm beige wall — one subject,
    // centred, no lettering and no institution's crest, in the same cream and
    // blush register as the Wedding, Engagement and New Baby circles beside
    // it. Cropped square in the file for the same reason the Fashion circles
    // are. Seyi Ariyo.
    graduation: { ...SQUARE, id: "1576997355598-a5a9def46291" },
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

async function photo({ id, w = 900, h, fmt = "jpg", crop, rect }) {
  // 900px: these are shown at 62px in a circle and 124px on a tile, so the
  // source only has to survive a 3x screen, and a 2MB hero would be waste.
  // With `h`, Unsplash crops to that exact box centre-out, which is the same
  // point `object-fit: cover` would have chosen — so the file matches what was
  // judged on the contact sheet.
  const q = new URLSearchParams({ w: String(w), q: "80", fm: fmt });
  if (h) {
    q.set("h", String(h));
    q.set("fit", "crop");
    // `crop` moves that box off centre — "bottom", "top", "left", "right".
    // Centre is right for almost everything, and wrong for a photograph whose
    // subject sits low under a lot of empty wall: centring it keeps the wall
    // and clips the subject.
    if (crop) q.set("crop", crop);
  }
  /**
   * `rect` — "x,y,w,h" in the ORIGINAL photograph's pixels, applied before the
   * resize. It is how a slot says "this part of the frame", when neither the
   * centre nor an edge is the answer.
   *
   * Used once, and only after looking: the Under $50 arrangement is a small
   * subject at the bottom of a 4000x6000 frame, so every automatic crop either
   * kept a third of the picture as empty wall — leaving it visibly smaller
   * than the three tiles beside it — or zoomed in far enough to cut the
   * arrangement off at both edges, which the brief bans by name. The rect
   * keeps the whole arrangement AND fills the tile. Whole-subject first: a
   * tighter number here is not an improvement.
   */
  if (rect) q.set("rect", rect);
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
  // Graduation only — the other seven are public/occasions files. See above.
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
