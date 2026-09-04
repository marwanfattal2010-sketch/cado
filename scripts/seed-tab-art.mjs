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
 * REJECTED ON THE FASHION PEOPLE-AND-STYLING ROUND (eleven slots, Sep 2026).
 * This round reverses the "no faces, cutouts on white, warm neutrals only" rule
 * for these eleven slots — Marwan looked at the sterile version and asked for
 * people, styling and editorial energy instead. The no-third-party-brand rule
 * did NOT relax, and it is what killed almost everything below. Every one of
 * these was opened at full size; NOT ONE of them could have been caught from
 * its alt text, which is the whole argument for looking:
 *   1578102718171  women   — very nearly shipped: a PRADA plate on the bag
 *   1764179690246  women   — YVES SAINT LAURENT printed along the headscarf
 *   1601324389523  women   — a HUBLOT shopfront sign behind the model
 *   1616847220575  women   — lettered designer buckle, and legs fill the frame
 *   1684283377169  women   — repeating designer-style monogram on the jacket
 *   1779305585195  women   — greyscale; mono in a colour row
 *   1645058493373  kids    — Ralph Lauren pony on the boy's polo
 *   1503944583220  kids    — "…& WHYTE" printed across the girl's t-shirt
 *   1692782380041  kids    — lettered backpack, and neon studio light
 *   1672223303533  bags    — "SIDESPIN" across the holdall
 *   1715761195783  bags    — LEONE gloves and an Italian flag in the bag
 *   1774560745344  bags    — Under Armour logo on the duffel
 *   1768929096123  bags    — logo on the bag and on the sunglasses
 *   1692506530242  bags    — NEW BALANCE, repeated the length of the strap
 *   1699319656128  bags    — "E<hil>" printed on the side
 *   1689007657910  bags    — "R.U.F.F" on the bag
 *   1683394305929  bags    — a branded creatine tub in the bag's mouth
 *   1567159169514  bags    — Nike
 *   1778854290307  bags    — logo'd trainers beside the bag
 *   1702604585541  caps    — "HYDRO / PREMIUM HEADWEAR / DESIGNED IN
 *                            AUSTRALIA" sticker on every brim; so are
 *                            1702604588062, 1702604865155, 1702604865117 —
 *                            the whole of that studio set is stickered
 *   1777455163870  caps    — NEW BALANCE; 1777455163879 is the same shoot
 *   1611537823172  caps    — Titleist, New Era, a baseball franchise
 *   1569520045266  caps    — NBA team marks (Bulls, Lakers)
 *   1736143151756  caps    — a national coat of arms embroidered on the patch
 *   1681583663936  caps    — woven brand labels on three of the five
 *   1684941062179  caps    — "Pink Dot." embroidered
 *   1653704841996  caps    — embroidered wordmarks along the shelf
 *   1521369909029  caps    — tone-on-tone embroidery on the side panel
 *   1718539364357  caps    — NOT CAPS AT ALL. Alt text says "a bunch of hats
 *                            stacked on top of each other"; the photograph is
 *                            a pile of woven round TABLE MATS. It survived two
 *                            square-crop contact sheets looking like fanned
 *                            cap brims and only died at full size.
 *   pexels 31162881 caps   — AC/DC lettering and a "GASOLINE" patch
 *   pexels 38622783 caps   — Nike, Ralph Lauren, LA Dodgers, "New Jeans"
 *   1608461864721  belts   — GG buckle
 *   1711443982852  belts   — three belts, and the brief says one
 *   1457545195570  scarves — a folded flat-grey stack, banned by name
 *   1598568290157  scarves — brick wall, and the scarf reads as noise at 80px
 *   1590033951631  tiles   — adidas trefoil on the tee and adidas stripes on
 *                            the trousers, plus Converse; 1590033951589 is the
 *                            next frame of the same shoot and adds FILA
 *   1777628530456  tiles   — "…TA WEAR" shop sign lit above the rail
 *   1775740396820  tiles   — SALE tags, which are already banned; so are
 *                            1775740396822, 1775740396839, 1775740397180
 *   1759421965457  tiles   — Uniqlo shopfront
 *   1610765431323  tiles   — greyscale, so it cannot join a colour row
 *   1704642406929  tiles   — the softbox and light stand are in frame; that is
 *                            a behind-the-scenes photo, not a campaign one
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
 * REJECTED ON THE LOOKBOOK ROUND (three circles + seven type tiles, Sep 2026).
 * The brief this time is Zara/SHEIN/Trendyol category-tile photography: a full
 * styled outfit, considered light, a clean or plain-toned ground, cropped so
 * the CLOTHES read at 80px rather than the face. Every one of these was opened
 * at full size, and — again — not one of them could have been caught from its
 * thumbnail, let alone its alt text:
 *   1724365309223  kids    — nearly shipped. A styled kidswear frame on plain
 *                            lilac-grey, and the child is holding a LOUIS
 *                            VUITTON monogram handbag. Invisible on a 260px
 *                            contact sheet, unmissable at full size. Her
 *                            trainers also carry a maker's emblem.
 *   1788500304887  men     — nearly shipped. Brown tee, tan overshirt, beige
 *                            shorts on cream seamless, which is exactly the
 *                            brief; it has a small tone-on-tone maker's mark
 *                            embroidered mid-chest and another on each shoe
 *                            tongue. Same fault as 1521369909029 above.
 *   1575862469264  men     — camel trench on white seamless, and a black size
 *                            label with legible lettering ("UK", "US 2…") on
 *                            the shirt worn under it.
 *   1787435943727  men     — a suit jacket worn on a bare chest; the brief
 *                            says full styled outfit.
 *   1661080561444  men     — crudely cut out of its background (orange fringe
 *                            around one shoe) and a chest embroidery.
 *   1766103809717  men     — greyscale, so it cannot join a colour row.
 *   1602956280248  men     — soft focus, venetian-blind shadows, hand across
 *                            the face. Not a lookbook frame.
 *   1780566760434  tops    — grey oversized tee on white seamless, and a NIKE
 *                            swoosh on both trainers.
 *   1740711152088  shirts  — a navy linen shirt on a hanger, clean ground, and
 *                            the printed care label on the tee behind it reads
 *                            "100%… MADE IN CHINA… M". Same fault as the
 *                            florist's care tag at 1680563094046.
 *   1737687478817  tops    — shopfront signage legible behind the model.
 *   pexels 5560013 kids    — the right shoot and the wrong frame: an OLD NAVY
 *                            tag on the cardigan sleeve.
 *   pexels 38778553 kids   — printed wordmarks across the boy's denim shirt,
 *                            and an Apple Watch on his wrist.
 *
 * AND ONE REJECTED FOR A REASON THAT IS NOT A FAULT, so nobody re-picks it
 * thinking it was missed:
 *   1619603364937  men     — a camel overcoat on a warm cream wall, no marks,
 *                            no text, the best men's frame found this round.
 *                            It is ALREADY IN THIS REPO, as
 *                            apps/web/public/tiles/fashion-men-circle.jpg, and
 *                            that file is still served: browse_tiles rows of
 *                            type `category_circles` are read by TabPanel.tsx
 *                            and AllCategoriesSheet.tsx. Shipping it here would
 *                            put one photograph in two places, which is the
 *                            near-miss recorded at 1601379327928 above.
 *   1759313560181  kids    — clean, no marks, and the best-FRAMED kidswear
 *                            photograph found: the outfit fills the disc where
 *                            the shipped one only half does. It is on a
 *                            saturated yellow seamless, and beside a cream
 *                            drape and a white studio it broke the row. Judged
 *                            side by side at 88px before it was dropped. If the
 *                            Kids circle is ever wanted louder, use this.
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
const TALL = { w: 600, h: 800, fmt: "webp" }; // entry tiles and type tiles
const spec = (v) => (typeof v === "string" ? { id: v } : v);
const MIME = { jpg: "image/jpeg", webp: "image/webp" };

/**
 * `src: "pexels"` — the second free-licence pool, added this round.
 *
 * Two of the three lookbook circles came from Pexels because Unsplash's free
 * pool did not have a usable one: every kidswear frame on a pale ground either
 * carried a brand mark (a Louis Vuitton bag, an Old Navy sleeve tag) or was a
 * candid snapshot, and the one clean menswear frame that fitted is already in
 * this repo under another name. See the log at the top.
 *
 * THE IMPORTANT DIFFERENCE IS THAT PEXELS HAS NO `rect`.
 *
 * Its CDN takes w / h / fit=crop / fm and the named `crop` anchors, and
 * silently IGNORES `rect` and `crop=focalpoint` — a rect'd URL returns 200 with
 * the whole frame, so a bad crop looks like a working one. Both Pexels slots
 * below are therefore framed by the photograph itself and take the centre
 * square; `job()` throws if anyone later adds a rect to one, rather than
 * letting it be quietly dropped.
 */
const PEXELS = { src: "pexels" };

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
   * FASHION, RE-SHOT AS EDITORIAL PHOTOGRAPHY (Sep 2026) — and this reverses
   * the round above rather than refining it.
   *
   * The four it replaces were a rail of shirts, a knit close-up, a shirt laid
   * flat and a hanging coat: four pictures of clothes with nobody in them.
   * Marwan looked at the result and said the tab reads sterile, so the brief
   * is now editorial fashion — styled models, campaign-style, faces in frame —
   * and explicitly NOT isolated packshots on white.
   *
   * All four are one register so the row reads as one campaign: a full-length
   * styled figure on a pale seamless studio ground, daylight-soft, in cream,
   * camel, white and black and nothing louder. Two women, one woman, one man,
   * so the row is not four of the same person. 600x800 in the FILE, identical
   * for all four, which is what "identical crop ratio" in the brief means —
   * the ratio is settled before the browser sees it, not left to object-fit.
   *
   * What made this hard is not composition, it is trademarks: styled people
   * wear branded clothes. The whole adidas/Converse/FILA studio set, a lit
   * "…TA WEAR" shop sign, SALE tags and a Uniqlo shopfront all died at full
   * size. See the rejection log at the top of this file.
   */
  fashion: {
    // Two women against white seamless in mirrored cropped blazers — cream
    // over black trousers, black over camel trousers. The brightest and most
    // obviously "new season" of the four, and the only one with two figures,
    // which is why it leads the row. Peyman Farmani.
    "new-in": { ...TALL, id: "1715559522419-db7face19c1c" },
    // A woman in a cream double-breasted trench, black tights and boots,
    // seated on a black chair in a pale grey studio with soft window light
    // falling across the wall. The most "considered present" of the four.
    // Ionela Mat.
    "most-gifted": { ...TALL, id: "1771243791734-dfeebf162af0" },
    // White shirt over black trousers and black heels on pale grey seamless —
    // the everyday basics look, which is what a price-capped tile should say.
    // Tatiana Getikova.
    "under-75": { ...TALL, id: "1733392226806-876e2fdee027" },
    // A man in a black printed short-sleeve shirt and black trousers on pale
    // grey. The one menswear frame, so the row is not four women, and the
    // darkest of the four. Naeem Ad.
    deals: { ...TALL, id: "1726509319288-01d7e9d50ca9" },
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
 * "What are you looking for?" — SEVEN TYPE TILES, new this round.
 *
 * The row above these (New in / Most gifted / Under $75 / Deals) is four saved
 * VIEWS, and its pictures are the idea of a view. This row is seven PRODUCT
 * TYPES, and the rule is literal: the Shirts tile is a shirt, the Caps tile is
 * a cap. That is the whole test, and it is the one a browsing shopper applies
 * in about a fifth of a second.
 *
 * FOUR OF THE SEVEN ARE PHOTOGRAPHS ALREADY IN THIS FILE. Bags, caps, belts
 * and scarves are the same sources as the accessory circles above, re-cropped
 * from 400x400 square to 600x800 portrait and uploaded under `art/type/`. That
 * is deliberate and it is not "the same slot twice": the circles are a
 * different shape, so a shared file is impossible, and each crop is its own
 * object. It also means four of these were already opened at full size and
 * cleared of brand marks on an earlier round — which, given that a cap search
 * is a minefield of embroidered logos, is worth more than novelty.
 *
 * All seven are 600x800 in the FILE. A uniform ratio is what makes a row of
 * seven read as a row rather than seven pictures, and baking it in means the
 * row that was judged is the row that ships — see the note over `photo()`.
 *
 * Every rect below was chosen by looking at the row at tile size, not by
 * arithmetic on the subject's bounding box. Three of them moved after that
 * look: Tops opened as a whole seated figure and the t-shirt was a detail in
 * it, Bags kept half an Eames chair, and Scarves — cropped centre — was a face
 * in a dark doorway with a scarf under it.
 */
const TYPE_TILES = {
  fashion: {
    // A washed brown t-shirt over black trousers, seated on white seamless,
    // with a gold pendant. Cropped in on the tee so the TOP is the subject and
    // not the outfit: centred, this frame is a full seated figure and the
    // t-shirt is a detail in the middle of it. Anton K Wibowo.
    tops: { ...TALL, id: "1780566759986-b09893d22b3d", rect: "715,500,2200,2933" },
    // A light blue two-piece — cropped blazer and matching belted trousers —
    // head to toe on a cream seamless. The one tile that has to say "these two
    // things match", so it keeps the whole figure rather than cropping in. The
    // vase of dried flowers at its feet is a plain studio prop with no
    // lettering on it. ola szkolda.
    sets: { ...TALL, id: "1779406166955-371cb625567d", rect: "0,250,4000,5333" },
    // A crisp white shirt — collar, placket and shoulder — on a warm sand
    // ground, cropped above the mouth. The source is landscape and the shirt
    // sits right of centre, so the rect takes the right-hand 3360px of it.
    // Nimble Made.
    shirts: { ...TALL, id: "1603252109612-24fa03d145c8", rect: "2496,0,3360,4480" },
    /*
     * REUSED FROM THE CIRCLES, RE-CROPPED. All four keep their original
     * rejection history — see the header — and none of them shares a file with
     * its circle, only a source photograph.
     */
    // The tan canvas holdall, tighter than the circle takes it: at 3:4 the
    // wider box kept the Eames chair that the circle's rect exists to remove.
    // Erol Ahmed.
    bags: { ...TALL, id: "1448582649076-3981753123b5", rect: "700,500,2100,2800" },
    // The blank black-and-white trucker cap on pale grey. The one tile that is
    // a plain object on a plain ground, which is exactly right for a cap and
    // would be wrong for a garment. Fabio T.
    caps: { ...TALL, id: "1678721938524-1a3ee398de2a", rect: "1800,400,2400,3200" },
    // The single tan leather belt with a plain pin buckle, worn at the waist
    // under an untucked white shirt. The darkest tile in the row, and the belt
    // still reads first. Hermes Rivera.
    belts: { ...TALL, id: "1611937685025-8d1df67a80b6", rect: "1800,400,2400,3200" },
    /*
     * The oversized camel-and-brown check mohair scarf — AND THE HEAD IS GONE.
     *
     * The circle crop of this photograph includes the model's face against a
     * dark brick doorway, which at tile size is a portrait with a scarf in it.
     * Starting the rect below the chin gives the whole frame to the scarf and
     * the white shirt cuffs, drops the dark doorway to a corner, and turns the
     * odd tile out of the seven into one that matches the rest.
     * amin naderloei.
     */
    scarves: { ...TALL, id: "1760551938129-01da7f950fe1", rect: "816,2100,3000,4000" },
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
   * FASHION — SEVEN CIRCLES, AND THE "NO FACES" RULE IS DEAD HERE.
   *
   * The five above were folded knits, hanging shirts, a flat-laid baby outfit,
   * a cut-out handbag and a blank cap: five product cutouts on cream, chosen
   * under a brief that banned faces. Marwan reversed that after looking at the
   * tab — a "Women" circle showing a pile of jumpers does not say Women, and a
   * woman wearing a full outfit does. So Women, Men and Kids are now PEOPLE,
   * with their faces in frame, and that is correct rather than an oversight.
   *
   * Belts and scarves are NEW slots — they did not exist in this row before.
   *
   * What did not change is the size the row is judged at. A circle renders at
   * about 80px and is masked round, so a full-length model is a smudge: every
   * one of these is cropped so the OUTFIT fills the disc, and where the source
   * frame would not do that centre-out, `rect` picks the part of the frame
   * that does — see Women, Kids and Bags below.
   *
   * They are cropped square in the FILE, not by the browser, so the seven
   * arrive at the same zoom instead of being re-cropped at display time.
   */
  fashion: {
    /*
     * WOMEN, MEN AND KIDS ARE RE-SHOT AS LOOKBOOK PHOTOGRAPHY (Sep 2026), and
     * this refines the round above rather than reversing it.
     *
     * The three it replaces were a woman against a shopfront, a man against an
     * olive studio wall and two children against white brick: three real
     * photographs of people, chosen one at a time, that read as three stock
     * portraits rather than one campaign. Marwan asked for the thing Zara and
     * Trendyol put on a category tile — a full styled outfit, considered
     * light, a clean or plain-toned ground, and the frame cropped so THE
     * CLOTHES read at 80px, not the face.
     *
     * So all three are now one register: a plain pale studio ground, soft
     * daylight, warm neutrals with one colour each — aubergine, camel,
     * sage — and a crop that puts the garment, not the head, in the middle of
     * the disc. They were judged as a row of three 88px discs, which is where
     * the Kids frame that "obviously" won on a contact sheet lost.
     */
    // A deep aubergine satin shirt over ivory wide-leg trousers, against a
    // cream draped backdrop in even light. The rect drops the head at the chin
    // and ends mid-calf, so the disc is shirt-and-trousers rather than a
    // portrait. GLOBALDSIO IT SOLUTION.
    women: { ...SQUARE, id: "1704775988086-f899d6566a4c", rect: "757,1300,2800,2800" },
    /*
     * A camel wool overcoat over a burgundy roll-neck and navy trousers, on a
     * plain white studio ground. Head to toe in the source; the centre square
     * lands on collar-to-knee, which is the coat, so no rect is needed — and
     * none is possible, because this is a Pexels frame. The only hardware on
     * it is a small silver leaf-shaped pin on the lapel, opened at 6x to check:
     * an ornament, not a wordmark. Dima Valkov.
     */
    men: { ...SQUARE, ...PEXELS, id: "6211656" },
    /*
     * A boy in a sage ribbed knit and tan waffle joggers on white seamless —
     * styled kidswear, not a candid snapshot, which is what the brief asked
     * for. Same white studio and same warm-neutral palette as the two beside
     * it, which is why it is here.
     *
     * ITS SUBJECT IS SMALLER IN THE DISC THAN THE OTHER TWO, and that is a
     * known trade rather than an oversight: Pexels ignores `rect`, so this
     * frame cannot be tightened, and the one kidswear photograph that could be
     * (1759313560181, on Unsplash) sits on a saturated yellow seamless that
     * broke the row. Judged both ways at 88px; the row won. If a tighter Kids
     * disc ever matters more than the row reading as one campaign, that id is
     * in the log at the top of this file. Amina Filkins.
     */
    "kids-fashion": { ...SQUARE, ...PEXELS, id: "5560033" },
    /*
     * A tan canvas holdall — the barrel-shaped gym-bag silhouette — on a
     * wooden floor in warm window light.
     *
     * NOT the athletic bag the brief asked for, and that is a deliberate
     * substitution, not an oversight: every gym or sports holdall in the free
     * pool carried a maker's mark across the side (New Balance, Under Armour,
     * Nike, SIDESPIN, "E<hil>", "R.U.F.F"), and the no-brand rule outranks the
     * styling note. This is the closest logo-free thing to a gym bag there is.
     * The rect crops off the Eames chair that owns the right half of the
     * frame. Erol Ahmed.
     */
    bags: { ...SQUARE, id: "1448582649076-3981753123b5", rect: "330,748,2900,2900" },
    /*
     * ONE cap, not the stack the brief asked for — and this is the one slot
     * that could not be delivered as written.
     *
     * A stack or flat-lay of caps is easy to find and impossible to ship: the
     * flat-lays are Nike, Ralph Lauren, LA Dodgers, New Balance, Titleist,
     * NBA teams, AC/DC, a national coat of arms, or a "HYDRO / PREMIUM
     * HEADWEAR" sticker on every brim, on both Unsplash and Pexels. One of
     * them was not even caps — see 1718539364357 in the log above. A logo is
     * a hard no and "stack" is a composition note, so the composition gave.
     *
     * This is a completely blank black-and-white trucker cap on pale grey: no
     * crest, no wordmark, nothing to mistake for anybody's brand, and it still
     * says CAP unmistakably at 80px, which is the circle's actual job.
     * Different photograph from the white-cap-on-white it replaces. Fabio T.
     */
    caps: { ...SQUARE, id: "1678721938524-1a3ee398de2a" },
    // NEW SLOT. A single tan leather belt worn over blue trousers under an
    // untucked white shirt, cropped tight at the waist — "single leather belt,
    // styled, close crop", exactly. The plain pin buckle matters: every belt
    // shot with an interesting buckle turned out to have a monogram on it.
    // Hermes Rivera.
    belts: { ...SQUARE, id: "1611937685025-8d1df67a80b6" },
    // NEW SLOT. An oversized camel-and-brown check mohair scarf wound high
    // over a white shirt, against a dark doorway. Styled on a person and warm,
    // which is the brief's "not a flat grey one" — the folded grey stacks a
    // scarf search returns are banned by name. amin naderloei.
    scarves: { ...SQUARE, id: "1760551938129-01da7f950fe1" },
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

/**
 * Pexels' CDN. Same idea as `photo()` below and a much smaller dial set: no
 * `rect`, so what you get is the centre box of the requested shape. `crop`
 * still works as a named anchor ("top", "bottom") if a slot ever needs one.
 */
async function pexelsPhoto({ id, w = 900, h, fmt = "jpg", crop }) {
  const q = new URLSearchParams({ auto: "compress", cs: "tinysrgb", w: String(w), fm: fmt });
  if (h) {
    q.set("h", String(h));
    q.set("fit", "crop");
    if (crop) q.set("crop", crop);
  }
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?${q}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pexels ${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
  // A rect on a Pexels slot is not a smaller crop, it is a no-op that returns
  // 200 — which is how a wrong picture ships looking like a right one.
  if (s.src === "pexels" && s.rect) {
    throw new Error(`${base}: Pexels ignores rect. Frame it in the source photograph instead.`);
  }
  return { ...s, path: `${base}.${s.fmt ?? "jpg"}` };
};

const jobs = [
  ...Object.entries(RECIPIENTS).map(([k, v]) => job(`art/recipient/${k}`, v)),
  ...Object.entries(TILES).map(([k, v]) => job(`art/tile/${k}`, v)),
  ...Object.entries(CATEGORY_TILES).flatMap(([cat, tiles]) =>
    Object.entries(tiles).map(([k, v]) => job(`art/tile/${cat}--${k}`, v))
  ),
  // `art/type/`, not `art/tile/` — four of these are the accessory circles at
  // a second crop, and a separate prefix is what lets one photograph have two
  // shapes without two slots claiming one object. See TYPE_TILES above.
  ...Object.entries(TYPE_TILES).flatMap(([cat, tiles]) =>
    Object.entries(tiles).map(([k, v]) => job(`art/type/${cat}--${k}`, v))
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

const fetchPhoto = (j) => (j.src === "pexels" ? pexelsPhoto(j) : photo(j));
const label = (j) => (j.src === "pexels" ? `pexels-${j.id}` : `photo-${j.id}`);

for (const j of jobs) {
  const size = j.h ? ` ${j.w}x${j.h}` : "";
  if (DRY) {
    console.log(`  + ${j.path}${size}  <- ${label(j)} — dry run`);
    continue;
  }
  await upload(j.path, await fetchPhoto(j), j.fmt ?? "jpg");
  console.log(`  + ${j.path}${size}  <- ${label(j)}`);
}
console.log(`\n${DRY ? "Would upload" : "Uploaded"} ${jobs.length} curated images.`);
