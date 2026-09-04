/**
 * THE ONE DEFINITION OF FACETS AND RECIPIENT LABELS.
 *
 * Every filter group, every tile and every recipient label the browse
 * experience offers is declared here. The Results page, the filter sheet and
 * the category tabs all read it, so a group cannot appear in one place and
 * not another, and a label cannot drift ("Him" in a circle, "For Him" on a
 * chip — that was a real bug).
 *
 * FACETS WITH NO BACKING DATA ARE NOT DECLARED. The brief asked for Colour,
 * Size and Age; none of the three has real data behind it and this build adds
 * no columns to invent them:
 *
 *   Colour — `products.color` carries a real value on FOUR products in the
 *            whole catalogue. Every other populated row is flagged
 *            `color_is_placeholder`, i.e. a value somebody made up. Filtering
 *            on invented colours would be a filter that lies.
 *   Size   — there is no size field. `product_variants.name` holds only
 *            "Small" and "Large", on twelve products, and that is a portion
 *            size on hampers — not a clothing or shoe size.
 *   Age    — no age or age-range field exists on products at all.
 *
 * All three are listed in the report under "facets skipped, no data".
 */

export type FacetGroup = "for" | "occasion" | "price" | "type" | "store";

/** Group order per category. Only groups with real backing data appear. */
export const FACETS_BY_CATEGORY: Record<string, FacetGroup[]> = {
  fashion: ["for", "occasion", "price", "type", "store"],
  shoes: ["for", "price", "type", "store"],
  "jewelry-accessories": ["for", "occasion", "price", "type", "store"],
  "flowers-gifts": ["occasion", "price", "type", "store"],
  chocolate: ["occasion", "price", "type", "store"],
  perfumes: ["for", "price", "type", "store"],
  toys: ["price", "type", "store"],
  "gift-sets": ["for", "occasion", "price", "store"],
  electronics: ["for", "price", "type", "store"],
  sport: ["for", "price", "type", "store"],
  "home-appliances": ["price", "type", "store"],
};

export const GROUP_LABEL: Record<FacetGroup, string> = {
  for: "For",
  occasion: "Occasion",
  price: "Price",
  type: "Type",
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

export type TileId = "new-in" | "best-sellers" | "store-picks" | "ready-to-gift" | "deals";

export const TILE_LABEL: Record<TileId, string> = {
  "new-in": "New in",
  "best-sellers": "Best sellers",
  "store-picks": "Store picks",
  "ready-to-gift": "Ready to gift",
  deals: "Deals",
};

/** Added within this many days counts as new. */
export const NEW_IN_DAYS = 30;

/** The price tiers a category can offer; the real spread decides which. */
export const PRICE_TIERS = [30, 50, 100, 200] as const;

export const priceTierId = (max: number) => `under-${max}`;
export const priceTierLabel = (max: number) => `Under $${max}`;

/** "under-100" -> 100, anything else -> null. */
export function parsePriceTier(id: string): number | null {
  const m = /^under-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}
