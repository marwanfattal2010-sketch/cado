/**
 * THE ONE DEFINITION OF FACETS AND RECIPIENT LABELS.
 *
 * Every filter group, every tile and every recipient label the browse
 * experience offers is declared here. The Results page, the filter sheet and
 * the category tabs all read it, so a group cannot appear in one place and
 * not another, and a label cannot drift ("Him" in a circle, "For Him" on a
 * chip — that was a real bug).
 *
 * A FACET IS DECLARED HERE, AND STILL HAS TO EARN ITS PLACE AT RUNTIME.
 * This table is the intended order per category; a facet whose options are all
 * zero, or which has fewer than two distinct values in the category actually
 * being viewed, is not rendered. That second test is what keeps Colour off ten
 * of the eleven tabs without a hard-coded exception list.
 *
 * Where the data stands today:
 *
 *   Size   — real, and new. `product_variants` is the size mechanism the
 *            schema already had; it held twelve rows, all on [TEST] products.
 *            Fashion (22 products), Shoes (8) and Sport (4) are now sized.
 *            Sport is four and not thirteen on purpose: a dumbbell has a
 *            weight and a bottle has a volume, and neither is a size.
 *   Colour — `products.color` is real on FOUR products, all jewellery; every
 *            other populated row is flagged `color_is_placeholder`, i.e. a
 *            value somebody made up. Declared, and the two-value test will
 *            keep it hidden until real colours are entered.
 *   Age    — there is no age or age-range field on products, and this build
 *            adds no columns. Toys therefore shows no Age facet. Reported.
 */

export type FacetGroup = "for" | "occasion" | "price" | "type" | "size" | "colour" | "store";

/** Facet order per category, exactly as the brief specifies it. */
export const FACETS_BY_CATEGORY: Record<string, FacetGroup[]> = {
  fashion: ["for", "occasion", "price", "type", "size", "colour", "store"],
  shoes: ["for", "price", "type", "size", "colour", "store"],
  "jewelry-accessories": ["for", "occasion", "price", "type", "colour", "store"],
  "flowers-gifts": ["occasion", "price", "type", "colour", "store"],
  chocolate: ["occasion", "price", "type", "size", "store"],
  perfumes: ["for", "price", "type", "store"],
  // Toys asks for Age, which has no backing field. The facet is omitted rather
  // than faked from the title text.
  toys: ["price", "type", "store"],
  "gift-sets": ["for", "occasion", "price", "store"],
  electronics: ["for", "price", "type", "store"],
  sport: ["for", "price", "type", "size", "store"],
  "home-appliances": ["price", "type", "store"],
};

export const GROUP_LABEL: Record<FacetGroup, string> = {
  for: "For",
  occasion: "Occasion",
  price: "Price",
  // "Category", not "Type": the row it filters is called Shop by category, and
  // two names for one thing is how the Him/For Him drift started.
  type: "Category",
  size: "Size",
  colour: "Colour",
  store: "Store",
};

/**
 * ONE label per recipient value.
 *
 * `full` is what a chip says; `short` is what a circle says. The circle row
 * drops the "For " prefix because the row is already titled "Gift for…" —
 * but both come from here, so they can never disagree again.
 */
export const RECIPIENTS = [
  { value: "her", full: "For Her", short: "Her" },
  { value: "him", full: "For Him", short: "Him" },
  { value: "mother", full: "For Mom", short: "Mom" },
  { value: "father", full: "For Dad", short: "Dad" },
  { value: "partner", full: "For Partner", short: "Partner" },
  { value: "friend", full: "For a Friend", short: "Friend" },
  { value: "child", full: "For Kids", short: "Kids" },
] as const;

export function recipientLabel(value: string, form: "full" | "short" = "full") {
  return RECIPIENTS.find((r) => r.value === value)?.[form] ?? value;
}

/* -------------------------------------------------------------------------- */
/* Tiles — saved views                                                        */
/* -------------------------------------------------------------------------- */

/**
 * WHY "ARRIVES TODAY" AND "GIFT WRAPPED" ARE IN THIS LIST.
 *
 * The tile row is meant to be five or six shortcuts wide. It collapsed to
 * three because two of the original six are claims the catalogue cannot back:
 * `is_pick` is false on every product, so "Store picks" is empty, and only
 * Gift Sets sets `is_gift_ready`, so "Ready to gift" is empty on ten tabs. A
 * tile with nothing behind it is dropped rather than opening an empty page,
 * which is right — but it left a short row.
 *
 * Same-day delivery and gift wrapping are real per-product fields that are set
 * across every category, and both are things a gift shopper actually filters
 * on. They fill the row with shortcuts that are true, instead of padding it
 * with two that are not.
 */
export type TileId =
  | "new-in"
  | "most-gifted"
  | "under-75"
  | "arrives-today"
  | "gift-wrapped"
  | "best-sellers"
  | "store-picks"
  | "ready-to-gift"
  | "deals";

export const TILE_LABEL: Record<TileId, string> = {
  "new-in": "New in",
  "most-gifted": "Most gifted",
  "under-75": "Under $75",
  "arrives-today": "Arrives today",
  "gift-wrapped": "Gift wrapped",
  "best-sellers": "Best sellers",
  "store-picks": "Store picks",
  "ready-to-gift": "Ready to gift",
  deals: "Deals",
};

/** The ceiling the "Under $75" tile filters on. */
export const UNDER_TILE_MAX = 75;

/** Added within this many days counts as new. */
export const NEW_IN_DAYS = 30;

/**
 * The price tiers, including an open-ended top one.
 *
 * "Under $200" as the highest tier makes the most expensive things in the shop
 * unreachable by any tier — you can filter to everything below them and never
 * to them. `over-200` closes that.
 *
 * Tiers OR together and the under- ones are nested, so ticking "Under $50" and
 * "Under $100" means under $100 — the looser of the two, which is what a
 * shopper means when they tick both.
 */
export type PriceTier = { id: string; label: string; min: number; max: number };

export const PRICE_TIERS: PriceTier[] = [
  { id: "under-30", label: "Under $30", min: 0, max: 30 },
  { id: "under-50", label: "Under $50", min: 0, max: 50 },
  { id: "under-100", label: "Under $100", min: 0, max: 100 },
  { id: "under-200", label: "Under $200", min: 0, max: 200 },
  { id: "over-200", label: "$200 and up", min: 200, max: Infinity },
];

export const priceTier = (id: string) => PRICE_TIERS.find((t) => t.id === id) ?? null;
export const isPriceTier = (id: string) => PRICE_TIERS.some((t) => t.id === id);

/** A tier for an arbitrary ceiling — what the "Under $X" tile computes. */
export const priceTierId = (max: number) => `under-${max}`;
export const priceTierLabel = (max: number) => `Under $${max}`;

/**
 * "under-100" -> 100, "over-200" -> Infinity, anything else -> null.
 *
 * Kept because a tile can name a ceiling that is not one of the standard
 * tiers — Fashion's is $75 — and that still has to parse.
 */
export function parsePriceTier(id: string): number | null {
  if (id === "over-200") return Infinity;
  const m = /^under-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

/** The lower bound a tier implies; only the open-ended one has a real floor. */
export function priceTierFloor(id: string): number {
  return id === "over-200" ? 200 : 0;
}
