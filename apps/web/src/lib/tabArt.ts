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

const TILE_ART: Record<TileId, string> = {
  "new-in": "art/tile/new-in.jpg",
  "most-gifted": "art/tile/most-gifted.jpg",
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
  fashion: ["art/hero/fashion-1.jpg", "art/hero/fashion-2.jpg", "art/hero/fashion-3.jpg"],
};

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

export const tileArt = (id: TileId) => art(TILE_ART[id], `tile "${TILE_LABEL[id]}"`);

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
