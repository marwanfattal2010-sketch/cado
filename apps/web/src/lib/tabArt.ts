import { productImageUrl } from "./images";
import { RECIPIENTS, TILE_LABEL, type TileId } from "./facets";

/**
 * THE CURATED ARTWORK FOR RECIPIENT CIRCLES AND ENTRY TILES.
 *
 * These two rows are the only decorative slots on a category tab whose label
 * is not the name of a thing in the catalogue, and that is exactly why they
 * could not keep borrowing a product photo:
 *
 *   - "For Him" on Fashion picked the first product tagged `him`, which was a
 *     girls' t-shirt.
 *   - "Dad" on Perfume & Beauty had nothing tagged `father` to pick, so the
 *     circle rendered as an empty grey disc.
 *   - Seven recipients chosen by seven independent queries never read as seven
 *     different people, which is the one job that row has.
 *
 * A subcategory circle is a different case and deliberately still comes from
 * the catalogue: a "Rings" circle showing a ring from the Rings subcategory is
 * showing the labelled thing by construction, and it stays current as stock
 * changes. What it must never do is render nothing, which `art()` below and
 * the allocator in CategoryTab together guarantee.
 *
 * NOTHING HERE MAY BE BLANK. `art()` throws in dev when a slot has no entry,
 * so a missing image fails on the first render instead of shipping a hole in
 * the row. In production it falls back to the neutral mark rather than taking
 * the whole page down over a picture.
 */

const RECIPIENT_ART: Record<string, string> = {
  her: "art/recipient/her.jpg",
  him: "art/recipient/him.jpg",
  mother: "art/recipient/mother.jpg",
  father: "art/recipient/father.jpg",
  partner: "art/recipient/partner.jpg",
  friend: "art/recipient/friend.jpg",
  child: "art/recipient/child.jpg",
};

/**
 * Tile art a category overrides, because the shared picture would be wrong.
 *
 * On Flowers every tile has to be flowers. The shared "Under $100" tile is a
 * stack of wrapped parcels — a fine picture of a gift and a bad picture of a
 * bouquet, which is exactly how a candle box and a linen basket ended up on
 * the flowers tab. Keyed by a plain string rather than TileId, because two of
 * the four flower tiles are price filters and have no TileId at all.
 */
const CATEGORY_TILE_ART: Record<string, Record<string, string>> = {
  // Fashion's four are WebP and cropped 3:4 in the file — see the note on the
  // Fashion circles below, which explains why the crop lives in the file
  // rather than in CSS. The extension is part of the path, so these cannot be
  // edited here without re-running scripts/seed-tab-art.mjs.
  //
  // All four are editorial fashion photography as of Sep 2026 — styled models
  // on a pale studio ground, campaign-style — replacing four packshots of
  // empty clothes. Identical 600x800 for all four, so the row is uniform
  // before the browser gets a say. The paths are unchanged, so this file did
  // not have to move; the bytes behind them did.
  fashion: {
    "new-in": "art/tile/fashion--new-in.webp",
    "most-gifted": "art/tile/fashion--most-gifted.webp",
    "under-75": "art/tile/fashion--under-75.webp",
    deals: "art/tile/fashion--deals.webp",
  },
  // Flowers' four are WebP and cropped 3:4 in the file, for the same reason
  // Fashion's are — and here the crop is exact rather than approximate: a
  // Flowers tile renders at 152x200, which IS 3:4, so a 600x800 file arrives
  // at the tile with nothing left for the browser to throw away.
  "flowers-gifts": {
    "under-50": "art/tile/flowers-gifts--under-50.webp",
    "under-100": "art/tile/flowers-gifts--under-100.webp",
    "best-picks": "art/tile/flowers-gifts--best-picks.webp",
    "new-in": "art/tile/flowers-gifts--new-in.webp",
  },
};

/** A category's own tile art, or null to fall back to the shared set. */
export function categoryTileArt(cat: string, key: string): string | null {
  const path = CATEGORY_TILE_ART[cat]?.[key];
  return path ? productImageUrl(path) : null;
}

/**
 * "What are you looking for?" — the TYPE tiles.
 *
 * A separate map from CATEGORY_TILE_ART on purpose. Those four are saved
 * VIEWS ("New in", "Under $75") and their pictures are the idea of the view;
 * these seven are PRODUCT TYPES, and the rule for them is literal — the Shirts
 * tile shows a shirt, the Caps tile shows a cap. Mixing the two maps would put
 * a tile whose picture may be anything next to a tile whose picture may not.
 *
 * Also a separate storage prefix, `art/type/`, rather than `art/tile/`. Four
 * of these seven — bags, caps, belts, scarves — are the SAME PHOTOGRAPHS as
 * the accessory circles, re-cropped from 400x400 square to 600x800 portrait,
 * and one path per crop is what keeps the two rows from fighting over a file:
 * a tile is a different shape from a circle, so it cannot share the object.
 *
 * All seven are 600x800 WebP — one ratio for the whole row, baked into the
 * file rather than left to `object-fit`, for the reason set out over
 * CATEGORY_TILE_ART above. Re-run scripts/seed-tab-art.mjs to change any of
 * them; the extension is part of the path, so a format change moves the file.
 */
const TYPE_TILE_ART: Record<string, Record<string, string>> = {
  fashion: {
    // A clear white polo on a hanger against a pale wall — the classic cut
    // Marwan asked for, unbranded. Replaces both the black tee and the folded
    // stack; both are still in storage if he wants either back.
    tops: "art/type/fashion--tops.jpg",
    // Marwans own file, supplied Sep 5: a coordinated linen shirt-and-trouser
    // set on a model — which is literally what this tile means.
    sets: "art/type/fashion--sets.jpg",
    // Marwans own file, supplied Sep 5: wide-leg jeans worn, street light.
    // Converted from AVIF, which the bucket does not accept.
    bottoms: "art/type/fashion--bottoms.jpg",
    // Marwan's own photograph, supplied Sep 5. It is a styled shot — the bag
    // worn, calm neutral interior — rather than a packshot, which is the
    // register he wants this row in. It sits here as ARTWORK, not on a product
    // listing: the bag in it is not something CADO sells, and a picture on a
    // listing is a claim about what you are buying.
    bags: "art/type/fashion--bags.jpg",
    caps: "art/type/fashion--caps.webp",
    belts: "art/type/fashion--belts.webp",
    // Marwans own file, supplied Sep 5: a blue cashmere scarf worn, street
    // light, no branding in frame.
    scarves: "art/type/fashion--scarves.jpg",
  },
};

/**
 * A type tile's picture, or null when that category has no type row.
 *
 * Deliberately returns null rather than throwing the way `art()` does: the
 * type row exists on Fashion only, so an unknown category here is the normal
 * case and not a missing image. The caller decides whether to render the row.
 */
export function typeTileArt(cat: string, key: string): string | null {
  const path = TYPE_TILE_ART[cat]?.[key];
  return path ? productImageUrl(path) : null;
}

const TILE_ART: Record<TileId, string> = {
  "new-in": "art/tile/new-in.jpg",
  "most-gifted": "art/tile/most-gifted.jpg",
  // Same behaviour as most-gifted, different label. Only Flowers renders it,
  // and Flowers overrides the picture above, so this is the safety net.
  "best-picks": "art/tile/most-gifted.jpg",
  "under-75": "art/tile/under-75.jpg",
  "arrives-today": "art/tile/arrives-today.jpg",
  "gift-wrapped": "art/tile/gift-wrapped.jpg",
  "ready-to-gift": "art/tile/ready-to-gift.jpg",
  deals: "art/tile/deals.jpg",
  "best-sellers": "art/tile/best-sellers.jpg",
  "store-picks": "art/tile/store-picks.jpg",
  /*
   * The three garment cuts are tiles too, because a tile id is what the
   * results page reads out of the URL — so they have to appear here even
   * though only Fashion draws them, and only ever through TYPE_TILE_ART
   * above. Pointing them at the same files keeps this map total rather than
   * inventing a picture that nothing renders.
   */
  tops: "art/type/fashion--tops.jpg",
  sets: "art/type/fashion--sets.jpg",
  bottoms: "art/type/fashion--bottoms.jpg",
};

/**
 * Hero slides per category, in order.
 *
 * Fashion only for now — the rollout tab. Everything else still takes its hero
 * from a product photo, which is why the other ten are untouched this round.
 * A category with no entry here gets `null` and the caller falls back to the
 * old product-photo hero rather than showing nothing.
 */
const HERO_ART: Record<string, string[]> = {
  // ONE slide, and it is Cedar Street Fashion's own shop photograph — a copy of
  // the store's cover, uploaded here so the hero cannot change if the store
  // later edits its cover. The three stock model shots it replaced showed
  // nobody's shop; this one shows a real CADO store's rails.
  fashion: ["art/hero/fashion-cedar-street.jpg"],
  // The peony photograph the Flowers hero already shows. Declared as a
  // constant path rather than queried, so the hero cannot change when the
  // catalogue does — but it is the same picture, because the brief says keep
  // the current hero exactly.
  "flowers-gifts": ["e341146a-64dc-4689-8b63-3d632dea95de/f7b57b3d-1203-4c0e-94e7-8e2eb934df2d/real.jpg"],
};

/**
 * Occasion circle art — THE APP'S ORIGINAL OCCASION PHOTOGRAPHS, RESTORED.
 *
 * These eight files have been in `apps/web/public/occasions/` since August and
 * are the pictures the tab showed before the flowers-only round replaced them:
 * "Happy Birthday" balloons, two rings on pale blooms, a newborn's feet in a
 * white blanket, one pink tulip on pink, a couple on the beach at sunset, a
 * ribboned gift box handed over. Restoring them means pointing at THOSE FILES,
 * not re-sourcing a lookalike — so these are the same bytes `lib/filters.ts`
 * and `OccasionStrip.tsx` already serve, and the Flowers circles can no longer
 * disagree with the occasion chips about what "Birthday" looks like.
 *
 * AN OCCASION CIRCLE IS THE ONE SLOT ON FLOWERS THAT IS NOT FLOWERS.
 *
 * Everything else on the tab — hero, tiles, subcategory circles, flower-type
 * pills — is a photograph of flowers, and stays that way. An occasion is not a
 * product, so the picture has to say the OCCASION: balloons read as a birthday
 * in a 70px disc, and a bouquet does not, because every other disc in the row
 * would also be a bouquet. That is the whole reason the row was legible before
 * and unreadable after.
 *
 * Rooted paths, not storage keys: these are repo assets served from the app's
 * own origin, which the deployed CSP allows as `'self'`. `occasionArt` passes
 * them through untouched — see below.
 */
const OCCASION_ART: Record<string, Record<string, string>> = {
  "flowers-gifts": {
    birthday: "/occasions/birthday-banner.jpg",
    "visiting-someone": "/occasions/visiting-someone.jpg",
    "get-well": "/occasions/get-well-soon.jpg",
    newborn: "/occasions/new-baby.jpg",
    anniversary: "/occasions/anniversary.jpg",
    wedding: "/occasions/wedding.jpg",
    // Neither renders today — nothing in the catalogue is tagged `engagement`
    // or `graduation` in Flowers, and the row only shows occasions with stock.
    // They are filled anyway: the moment a florist tags one, the circle has a
    // picture instead of a hole rather than a slot nobody thought about.
    //
    // Engagement is the original file and belongs with the other six: a
    // solitaire in an open box, one subject, close.
    engagement: "/occasions/engagement.jpg",
    /*
     * Graduation is the ONE occasion Flowers overrides, and it was overridden
     * because the row was looked at at 70px instead of assumed.
     * /occasions/graduation.jpg is a cap thrown into an open sky; cropped to a
     * disc it is a pale blue-grey circle with a speck in it, beside seven
     * circles whose subject fills the frame — and it carries a real
     * university's lettering, which the no-trademark rule bans. This is a
     * graduate against a plain warm wall instead: one subject, no lettering,
     * the same cream-and-blush register as Wedding and New Baby.
     *
     * The public file is left exactly as it is. The All tab's occasion rail
     * and /find still read it through lib/filters.ts, and swapping a picture
     * on two other screens was not part of this. That is a real divergence —
     * the same occasion, two photographs — and the fix, if Marwan wants one,
     * is to replace public/occasions/graduation.jpg so every screen moves
     * together, at which point this override can be deleted.
     */
    graduation: "art/occasion/flowers-gifts--graduation.webp",
  },
};

/**
 * A leading "/" means a file in `public/`, already an absolute URL on this
 * origin. Handing that to `productImageUrl` would bolt it onto the Supabase
 * storage prefix and produce a 404 — so it is returned as-is.
 */
export function occasionArt(cat: string, value: string): string | null {
  const path = OCCASION_ART[cat]?.[value];
  if (!path) return null;
  return path.startsWith("/") ? path : productImageUrl(path);
}

/** Flower-type pill art. */
const FLOWER_ART: Record<string, string> = {
  roses: "art/flower/roses.jpg",
  tulips: "art/flower/tulips.jpg",
  peonies: "art/flower/peonies.jpg",
  orchids: "art/flower/orchids.jpg",
  lilies: "art/flower/lilies.jpg",
  mixed: "art/flower/mixed.jpg",
};

export const flowerArt = (v: string): string | null =>
  FLOWER_ART[v] ? productImageUrl(FLOWER_ART[v]) : null;

export const heroArt = (cat: string): string[] =>
  (HERO_ART[cat] ?? []).map((p) => productImageUrl(p));

export const hasHeroArt = (cat: string) => (HERO_ART[cat]?.length ?? 0) > 0;

function art(path: string | undefined, slot: string): string | null {
  if (path) return productImageUrl(path);
  if (import.meta.env.DEV) {
    throw new Error(
      `No curated image for ${slot}. Add one to scripts/seed-tab-art.mjs, run it, ` +
        `then add the path to src/lib/tabArt.ts. Never ship this slot empty.`
    );
  }
  return null;
}

export const recipientArt = (value: string) =>
  art(RECIPIENT_ART[value], `recipient "${value}"`);

/**
 * A tab's own tile art wins over the shared set.
 *
 * The shared pictures are gift wrap, which is right for a gifting tile and
 * wrong for a Fashion one — a ribboned parcel says nothing about clothes.
 */
export const tileArt = (id: TileId, cat?: string) =>
  (cat ? categoryTileArt(cat, id) : null) ?? art(TILE_ART[id], `tile "${TILE_LABEL[id]}"`);

/** "Shop for" circle art, keyed by category and subcategory slug. */
const CIRCLE_ART: Record<string, Record<string, string>> = {
  "flowers-gifts": {
    bouquets: "art/circle/flowers-gifts--bouquets.jpg",
    "flower-boxes": "art/circle/flowers-gifts--flower-boxes.jpg",
    plants: "art/circle/flowers-gifts--plants.jpg",
    "vase-arrangements": "art/circle/flowers-gifts--vase-arrangements.jpg",
  },
  /*
   * Fashion's SEVEN are WebP, cropped square at 400x400 in the file.
   *
   * THE KEYS ARE THE SUBCATEGORY SLUGS, and `kids-fashion` is the slug — not
   * `kids`. Getting that wrong is a silent miss: `circleArt` returns null and
   * the circle renders empty.
   *
   * `belts` and `scarves` are new here as of Sep 2026, and the other five now
   * point at different photographs behind the same paths. That round reversed
   * the previous one: Women, Men and Kids are PEOPLE with faces in frame, not
   * folded knits on cream, because a pile of jumpers does not say "Women" and
   * a woman in a full outfit does. Belts and Scarves are the accessory styled
   * on a person; Bags and Caps stay object shots because at 80px they have to.
   *
   * The crop is baked into the file rather than left to `object-fit: cover`,
   * because a browser cropping a 3:2 source at display time throws away a
   * third of the picture — so the row that was judged is the row that ships.
   * Three of the seven also carry a `rect` in seed-tab-art.mjs, picking the
   * part of the frame where the outfit actually is; the centre of a full-length
   * fashion frame is usually a knee.
   */
  fashion: {
    // Marwans own file, supplied Sep 5: a navy pinstripe co-ord on a white
    // studio ground, face cropped out so the outfit is what reads at 80px.
    // Its own path, so re-running seed-tab-art.mjs cannot overwrite it.
    women: "art/circle/fashion--women-supplied.webp",
    men: "art/circle/fashion--men.webp",
    /*
     * Supplied by Marwan on Sep 5, who confirmed the model is cleared for use.
     * A deliberate exception to the rule governing the other two circles: this
     * is a portrait, so at 80px it reads as a child's face rather than as
     * kidswear, where Women and Men both read as outfits. His call, recorded
     * here so nobody "fixes" it back.
     *
     * Its own path, not the seeded one — re-running scripts/seed-tab-art.mjs
     * would otherwise overwrite a file that did not come from the script.
     */
    "kids-fashion": "art/circle/fashion--kids-supplied.webp",
    bags: "art/circle/fashion--bags.webp",
    caps: "art/circle/fashion--caps.webp",
    belts: "art/circle/fashion--belts.webp",
    scarves: "art/circle/fashion--scarves.webp",
  },
};

export function circleArt(cat: string, slug: string): string | null {
  const path = CIRCLE_ART[cat]?.[slug];
  return path ? productImageUrl(path) : null;
}

/**
 * The completeness check, run once at module load in dev.
 *
 * Adding a recipient to RECIPIENTS or a tile to TileId without adding its
 * picture is the exact mistake that leaves a blank circle in production, and
 * it is invisible until someone opens the one tab where that slot renders. So
 * it is caught here, at import time, on the first page load in development.
 */
if (import.meta.env.DEV) {
  const missing = [
    ...RECIPIENTS.filter((r) => !RECIPIENT_ART[r.value]).map((r) => `recipient:${r.value}`),
    ...(Object.keys(TILE_LABEL) as TileId[])
      .filter((t) => !TILE_ART[t])
      .map((t) => `tile:${t}`),
  ];
  if (missing.length) {
    throw new Error(
      `tabArt.ts is missing curated images for: ${missing.join(", ")}. ` +
        `Every recipient and every tile needs one — see scripts/seed-tab-art.mjs.`
    );
  }
}
