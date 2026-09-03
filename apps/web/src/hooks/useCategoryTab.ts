import { useMemo } from "react";
import { type FeedProduct } from "../lib/browse";
import { useCatalogue } from "./useCatalogue";
import { useHomeSignals } from "./useHomeEndless";

/**
 * Everything a category tab needs, from ONE query.
 *
 * A tab in the Part 2 template has eleven sections and nine of them are a
 * different slice of the same list: recipients, subcategories, deals, new
 * arrivals, best sellers, gift-ready, occasions, price tiers, the grid. Asking
 * the database nine times for nine views of at most a few dozen rows is nine
 * round-trips to answer a question one round-trip already answered — so the
 * tab loads its products once and every section is derived here, in memory.
 *
 * That is only defensible because the numbers are small: the largest live
 * category holds 15 active products and the whole catalogue is 101. If a tab
 * ever grows past a few hundred, the grid (2.11) is the section to move back
 * to the server first, because it is the only one that pages.
 */

/** The threshold the spec uses everywhere: below this, a section hides. */
export const MIN_SECTION = 4;

/**
 * This tab's products, sliced out of the one catalogue request.
 *
 * It used to be a query per tab. Eleven tabs meant eleven round trips of
 * about ten rows each, every one of them a fresh wait the first time you
 * swiped to that tab — which is most of what "switching categories takes
 * time" was. Now the first tab pays for all of them and the rest are free.
 */
export function useTabProducts(categoryId?: string) {
  const catalogue = useCatalogue();
  const data = useMemo(
    () => (categoryId ? (catalogue.data ?? []).filter((p) => p.category_id === categoryId) : []),
    [catalogue.data, categoryId]
  );
  return { data, isLoading: catalogue.isLoading || !categoryId, error: catalogue.error };
}

/* -------------------------------------------------------------------------- */
/* Slices                                                                     */
/* -------------------------------------------------------------------------- */

export function isDiscounted(p: FeedProduct) {
  return p.compare_at_price != null && p.compare_at_price > p.price;
}

export function discountPercent(p: FeedProduct) {
  if (!isDiscounted(p)) return 0;
  return Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100);
}

/**
 * The three price chips on the hero (2.2) and the price bands in the filter
 * sheet (2.11), computed from THIS tab's real prices.
 *
 * The rule the spec cares about is "so none opens an empty grid", so a band is
 * only offered when something actually sits in it. A tab where everything
 * costs $80 gets one chip, not three that lie.
 */
const CANDIDATE_TIERS = [30, 50, 100, 200] as const;

export function priceTiers(products: FeedProduct[]) {
  return CANDIDATE_TIERS.map((max) => ({
    max,
    label: `Under $${max}`,
    count: products.filter((p) => p.price < max).length,
  })).filter((t) => t.count >= MIN_SECTION);
}

/** The single "Under $X" the quick tiles and the hero headline use. */
export function primaryTier(products: FeedProduct[]) {
  const tiers = priceTiers(products);
  // The most useful chip is the tightest one that still has real depth —
  // "Under $200" on a tab where everything is $40 tells a shopper nothing.
  return tiers[0] ?? null;
}

export function countByTag(products: FeedProduct[], field: "recipient_tags" | "occasion_tags") {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const tag of p[field] ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

export function countBySubcategory(products: FeedProduct[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (p.subcategory_id) counts.set(p.subcategory_id, (counts.get(p.subcategory_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * One real product to put on a tile, preferring one with a photo — a tile
 * whose photo slot is empty is worse than no tile, and the spec explicitly
 * bans reaching for the old balloon/beach/tulip stock images here.
 */
export function pickPhotoProduct(products: FeedProduct[]) {
  return products.find((p) => (p.product_images?.length ?? 0) > 0) ?? products[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Derived sections                                                           */
/* -------------------------------------------------------------------------- */

export type TabSections = {
  all: FeedProduct[];
  deals: FeedProduct[];
  maxDiscount: number;
  newArrivals: FeedProduct[];
  /** Real order counts when there are enough of them; store picks otherwise. */
  bestSellers: FeedProduct[];
  bestSellersAreReal: boolean;
  giftReady: FeedProduct[];
  recipients: Map<string, number>;
  occasions: Map<string, number>;
  subcategories: Map<string, number>;
  tiers: ReturnType<typeof priceTiers>;
  tier: ReturnType<typeof primaryTier>;
};

export function useTabSections(categoryId?: string) {
  const products = useTabProducts(categoryId);
  const signals = useHomeSignals();

  const sections = useMemo<TabSections>(() => {
    const all = products.data ?? [];
    const deals = all
      .filter(isDiscounted)
      .sort((a, b) => discountPercent(b) - discountPercent(a));

    /**
     * BEST SELLERS ARE ONLY BEST SELLERS WHEN SALES SAY SO.
     *
     * Four products with an order between them is not a ranking, it is four
     * products. Below the threshold the card renames itself "Store picks" and
     * shows what a store owner actually ticked in the dashboard — curation
     * presented as curation. This is the same honest switch the All tab makes
     * between "Trending this week" and "Popular picks".
     */
    const ordered = all
      .map((p) => ({ p, n: signals.data?.get(p.id)?.recentOrders ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const bestSellersAreReal = ordered.length >= MIN_SECTION;

    return {
      all,
      deals,
      maxDiscount: deals.length ? discountPercent(deals[0]) : 0,
      // `all` already arrives newest-first from the query.
      newArrivals: all.slice(0, 8),
      bestSellers: bestSellersAreReal
        ? ordered.map((x) => x.p)
        : all.filter((p) => p.is_pick),
      bestSellersAreReal,
      giftReady: all.filter((p) => p.is_gift_ready),
      recipients: countByTag(all, "recipient_tags"),
      occasions: countByTag(all, "occasion_tags"),
      subcategories: countBySubcategory(all),
      tiers: priceTiers(all),
      tier: primaryTier(all),
    };
  }, [products.data, signals.data]);

  return { ...sections, isLoading: products.isLoading, error: products.error };
}
