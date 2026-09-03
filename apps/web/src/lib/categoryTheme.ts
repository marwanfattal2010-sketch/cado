import { EMPTY_FILTER, type TabFilter } from "./tabFilter";

/**
 * ONE SKIN PER CATEGORY.
 *
 * Every category tab renders the identical skeleton — hero, tall tiles, shop
 * by category, super deals, stores, occasions, grid — and differs only by
 * what is in this file: the words in the hero and which
 * five tiles it offers. That is the whole point of a skin: put two tabs side
 * by side and the structure is the same, so the shop feels like one place
 * rather than ten small sites.
 *
 * THERE IS NO PER-CATEGORY COLOUR. One accent, persimmon, on every tab —
 * see accent() at the bottom. Tabs differ by their PHOTOGRAPHS.
 *
 * THE COPY IS WRITTEN PER CATEGORY, not templated. "Jewellery that gets
 * noticed" does not become "Chocolate that gets noticed" — a headline built
 * by string substitution reads like one, and the hero is the first thing on
 * the page.
 */

export type TileKind =
  | { type: "recipient"; value: string }
  | { type: "price"; max: number }
  | { type: "new" }
  | { type: "picks" }
  | { type: "giftReady" }
  | { type: "sale" }
  | { type: "sameDay" }
  | { type: "subcategory"; slug: string };

export type CategoryTile = {
  label: string;
  kind: TileKind;
};

export type CategoryTheme = {
  /**
   * Which product the hero borrows its photo from, by slug.
   *
   * Without this the hero takes whatever sorts first, which on Jewels was a
   * ring photographed on a hand — a real product, but a poor advert for a
   * whole category. Naming one is not a step away from real photography: it
   * is still that product's own picture, just chosen rather than stumbled on.
   * Falls back to the old behaviour when the slug is missing or has no photo.
   */
  heroProduct?: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Five, in order. Any that cannot be filled from real stock is dropped. */
  tiles: CategoryTile[];
};

/** Falls back to persimmon for a category nobody has skinned yet. */
export const DEFAULT_THEME: CategoryTheme = {
  heroTitle: "Gifts they will actually keep",
  heroSubtitle: "Chosen from Lebanese shops, at their door tonight",
  tiles: [
    { label: "For her", kind: { type: "recipient", value: "her" } },
    { label: "For him", kind: { type: "recipient", value: "him" } },
    { label: "Store picks", kind: { type: "picks" } },
    { label: "Under $100", kind: { type: "price", max: 100 } },
    { label: "New in", kind: { type: "new" } },
  ],
};

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "jewelry-accessories": {
    heroProduct: "layered-chain-necklace",
    heroTitle: "Something that lasts longer than the day",
    heroSubtitle: "Gold, silver and stones from Lebanese ateliers",
    tiles: [
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "Best sellers", kind: { type: "picks" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  fashion: {
    heroTitle: "Wear it the day it arrives",
    heroSubtitle: "Pieces from Beirut boutiques, wrapped and delivered",
    tiles: [
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "For kids", kind: { type: "recipient", value: "child" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  "flowers-gifts": {
    heroTitle: "Cut this morning, at their door tonight",
    heroSubtitle: "Bouquets and plants from Lebanese florists",
    tiles: [
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "Same-day", kind: { type: "sameDay" } },
      { label: "Under $50", kind: { type: "price", max: 50 } },
      { label: "Bouquets", kind: { type: "subcategory", slug: "bouquets" } },
      { label: "Plants", kind: { type: "subcategory", slug: "plants" } },
    ],
  },

  perfumes: {
    heroTitle: "A scent they will be asked about",
    heroSubtitle: "Perfume, skincare and beauty sets, boxed to give",
    tiles: [
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "Skincare", kind: { type: "subcategory", slug: "skincare" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  chocolate: {
    heroTitle: "Never turn up empty-handed",
    heroSubtitle: "Boxes, pralines and sweets from Lebanese makers",
    tiles: [
      { label: "Boxes", kind: { type: "subcategory", slug: "chocolate-boxes" } },
      { label: "Cakes", kind: { type: "subcategory", slug: "cakes" } },
      { label: "Under $50", kind: { type: "price", max: 50 } },
      { label: "On offer", kind: { type: "sale" } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  shoes: {
    heroTitle: "The pair they keep reaching for",
    heroSubtitle: "Heels, sneakers and boots, delivered the same day",
    tiles: [
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "Heels", kind: { type: "subcategory", slug: "heels-sandals" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "On offer", kind: { type: "sale" } },
    ],
  },

  toys: {
    heroTitle: "The one they open first",
    heroSubtitle: "Toys and games for every age, wrapped and ready",
    tiles: [
      { label: "For kids", kind: { type: "recipient", value: "child" } },
      { label: "Under $50", kind: { type: "price", max: 50 } },
      { label: "Educational", kind: { type: "subcategory", slug: "educational" } },
      { label: "On offer", kind: { type: "sale" } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  "gift-sets": {
    heroTitle: "Everything chosen, boxed and tied",
    heroSubtitle: "Nothing left to do but sign the card",
    tiles: [
      { label: "Ready to gift", kind: { type: "giftReady" } },
      { label: "For her", kind: { type: "recipient", value: "her" } },
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "Under $50", kind: { type: "price", max: 50 } },
      { label: "On offer", kind: { type: "sale" } },
    ],
  },

  electronics: {
    heroTitle: "The upgrade they keep putting off",
    heroSubtitle: "Audio, gadgets and smart watches, delivered tonight",
    tiles: [
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "Audio", kind: { type: "subcategory", slug: "audio" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "On offer", kind: { type: "sale" } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  "home-appliances": {
    heroTitle: "For the home they are still filling",
    heroSubtitle: "Kitchen, coffee and linen worth unwrapping",
    tiles: [
      { label: "Housewarming", kind: { type: "subcategory", slug: "kitchen" } },
      { label: "Coffee & tea", kind: { type: "subcategory", slug: "coffee-tea" } },
      { label: "Bedding", kind: { type: "subcategory", slug: "bedding-towels" } },
      { label: "Under $50", kind: { type: "price", max: 50 } },
      { label: "New in", kind: { type: "new" } },
    ],
  },

  sport: {
    heroTitle: "For the one who never sits still",
    heroSubtitle: "Kit and equipment, not another gym t-shirt",
    tiles: [
      { label: "For him", kind: { type: "recipient", value: "him" } },
      { label: "For kids", kind: { type: "recipient", value: "child" } },
      { label: "Training", kind: { type: "subcategory", slug: "training" } },
      { label: "Under $100", kind: { type: "price", max: 100 } },
      { label: "On offer", kind: { type: "sale" } },
    ],
  },
};

/**
 * The occasions a CATEGORY TAB may offer as chips.
 *
 * Deliberately its own list rather than `OCCASIONS` from lib/filters, and the
 * reason is a real gap: three tags that products genuinely carry —
 * `valentine` (17 products), `housewarming` (15) and `mothers-day` (5) — are
 * missing from that list, so those products were unreachable by occasion
 * anywhere on the site. Perfume had four real occasions in its data and could
 * only show two, which is why its chip row was hidden entirely.
 *
 * They are NOT added to `OCCASIONS` itself because that list also drives the
 * All tab's photo rail, where every entry needs artwork — adding them there
 * would put broken tiles on a page that is meant to stay untouched. Chips
 * need only a label, so the category tabs can carry the fuller vocabulary.
 *
 * Order is the order they are offered in, most useful first; the row then
 * keeps whichever have stock, by count.
 */
export const CHIP_OCCASIONS: { value: string; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "visiting-someone", label: "Visiting someone" },
  { value: "graduation", label: "Graduation" },
  { value: "valentine", label: "Valentine's" },
  { value: "housewarming", label: "Housewarming" },
  { value: "mothers-day", label: "Mother's Day" },
  { value: "get-well", label: "Get well" },
  { value: "newborn", label: "New baby" },
  { value: "engagement", label: "Engagement" },
  { value: "wedding", label: "Wedding" },
  { value: "eid", label: "Eid" },
];

export function themeFor(categorySlug: string | undefined): CategoryTheme {
  return (categorySlug && CATEGORY_THEMES[categorySlug]) || DEFAULT_THEME;
}

/** `rgb(...)`, optionally with alpha, from a stored channel triple. */
/**
 * PERSIMMON, ON EVERY TAB. The theme argument is ignored.
 *
 * Each category used to carry its own hue — terracotta Fashion, purple
 * Jewels, rose Flowers — and eleven tabs in eleven colours read as eleven
 * different shops rather than one. The values are DELETED, not merely
 * unused: there is no per-category accent left in the data for a future
 * edit to read, so a hue cannot quietly come back.
 *
 * The signature keeps its optional theme parameter so the two dozen call
 * sites did not all have to change at once — which is itself the point, as
 * a half-finished migration is exactly how one tab keeps its old colour.
 */
export function accent(_theme?: CategoryTheme, alpha?: number) {
  return alpha == null ? "rgb(var(--persimmon))" : `rgb(var(--persimmon) / ${alpha})`;
}

/** The filter a tile applies when tapped. */
export function filterForTile(kind: TileKind, subcategoryId?: string): TabFilter {
  switch (kind.type) {
    case "recipient":
      return { ...EMPTY_FILTER, recipients: [kind.value] };
    case "price":
      return { ...EMPTY_FILTER, priceMax: [kind.max] };
    case "giftReady":
      return { ...EMPTY_FILTER, giftReady: true };
    case "sale":
      return { ...EMPTY_FILTER, onSale: true };
    case "subcategory":
      return subcategoryId ? { ...EMPTY_FILTER, types: [subcategoryId] } : EMPTY_FILTER;
    // "New in", "Best sellers" and "Same-day" are orderings or facts about a
    // product rather than filters the sheet models, so they open the grid
    // unfiltered and rely on the row above having already shown the goods.
    default:
      return EMPTY_FILTER;
  }
}
