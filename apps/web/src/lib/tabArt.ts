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
  fashion: {
    "new-in": "art/tile/fashion--new-in.jpg",
    "most-gifted": "art/tile/fashion--most-gifted.jpg",
    "under-75": "art/tile/fashion--under-75.jpg",
    deals: "art/tile/fashion--deals.jpg",
  },
  "flowers-gifts": {
    "under-50": "art/tile/flowers-gifts--under-50.jpg",
    "under-100": "art/tile/flowers-gifts--under-100.jpg",
    "best-picks": "art/tile/flowers-gifts--best-picks.jpg",
    "new-in": "art/tile/flowers-gifts--new-in.jpg",
  },
};

/** A category's own tile art, or null to fall back to the shared set. */
export function categoryTileArt(cat: string, key: string): string | null {
  const path = CATEGORY_TILE_ART[cat]?.[key];
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

/** Occasion circle art, keyed by category and occasion value. */
const OCCASION_ART: Record<string, Record<string, string>> = {
  "flowers-gifts": {
    birthday: "art/occasion/flowers-gifts--birthday.jpg",
    "visiting-someone": "art/occasion/flowers-gifts--visiting-someone.jpg",
    "get-well": "art/occasion/flowers-gifts--get-well.jpg",
    newborn: "art/occasion/flowers-gifts--newborn.jpg",
    anniversary: "art/occasion/flowers-gifts--anniversary.jpg",
    wedding: "art/occasion/flowers-gifts--wedding.jpg",
    engagement: "art/occasion/flowers-gifts--engagement.jpg",
    graduation: "art/occasion/flowers-gifts--graduation.jpg",
  },
};

export function occasionArt(cat: string, value: string): string | null {
  const path = OCCASION_ART[cat]?.[value];
  return path ? productImageUrl(path) : null;
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
  fashion: {
    women: "art/circle/fashion--women.jpg",
    men: "art/circle/fashion--men.jpg",
    "kids-fashion": "art/circle/fashion--kids-fashion.jpg",
    bags: "art/circle/fashion--bags.jpg",
    caps: "art/circle/fashion--caps.jpg",
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
