import type { FeedProduct } from "./browse";

/**
 * The filter model behind the sticky bar and the filter sheet (spec 2.11).
 *
 * ONE model, one apply function, one counter — because the spec's real
 * requirement is that "the same bar and sheet appear on EVERY filtered entry":
 * recipient tiles, occasion chips, price chips, quick tiles, subcategory
 * icons. Those are not six different screens, they are six different opening
 * values of this object. That is also what makes filters combine (For Him +
 * Under $50 + Necklaces) instead of replacing each other, which is what the
 * old chip bar did.
 */

export type Sort = "recommended" | "price-asc" | "price-desc" | "newest";

export const SORTS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price low → high" },
  { value: "price-desc", label: "Price high → low" },
  { value: "newest", label: "Newest" },
];

export type TabFilter = {
  recipients: string[];
  occasions: string[];
  /** Subcategory ids. */
  types: string[];
  /** Partner ids. */
  stores: string[];
  /** Exclusive upper bounds, e.g. 50 for "Under $50". */
  priceMax: number[];
  min: number | null;
  max: number | null;
  giftReady: boolean;
  onSale: boolean;
};

export const EMPTY_FILTER: TabFilter = {
  recipients: [],
  occasions: [],
  types: [],
  stores: [],
  priceMax: [],
  min: null,
  max: null,
  giftReady: false,
  onSale: false,
};

export function isEmptyFilter(f: TabFilter) {
  return (
    f.recipients.length === 0 &&
    f.occasions.length === 0 &&
    f.types.length === 0 &&
    f.stores.length === 0 &&
    f.priceMax.length === 0 &&
    f.min == null &&
    f.max == null &&
    !f.giftReady &&
    !f.onSale
  );
}

/** How many groups are narrowing the grid — the number on the Filter badge. */
export function activeCount(f: TabFilter) {
  return (
    f.recipients.length +
    f.occasions.length +
    f.types.length +
    f.stores.length +
    f.priceMax.length +
    (f.min != null || f.max != null ? 1 : 0) +
    (f.giftReady ? 1 : 0) +
    (f.onSale ? 1 : 0)
  );
}

export function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * OR within a group, AND across groups.
 *
 * "Her or Him" is one question with two acceptable answers; "For Her" and
 * "Under $50" are two questions that both have to hold. Getting this backwards
 * is how a filter sheet lands someone on an empty grid: AND-ing inside a group
 * means ticking a second box can only ever remove results, which reads as
 * broken.
 */
export function applyFilter(products: FeedProduct[], f: TabFilter): FeedProduct[] {
  return products.filter((p) => {
    if (f.recipients.length && !(p.recipient_tags ?? []).some((t) => f.recipients.includes(t)))
      return false;
    if (f.occasions.length && !(p.occasion_tags ?? []).some((t) => f.occasions.includes(t)))
      return false;
    if (f.types.length && !(p.subcategory_id && f.types.includes(p.subcategory_id))) return false;
    if (f.stores.length && !f.stores.includes(p.partner_id)) return false;
    // Upper bounds are exclusive and OR together, so "Under $30" plus
    // "Under $100" means under $100 — the looser of the two, not neither.
    if (f.priceMax.length && !f.priceMax.some((m) => p.price < m)) return false;
    if (f.min != null && p.price < f.min) return false;
    if (f.max != null && p.price > f.max) return false;
    if (f.giftReady && !p.is_gift_ready) return false;
    if (f.onSale && !(p.compare_at_price != null && p.compare_at_price > p.price)) return false;
    return true;
  });
}

/**
 * The count shown beside one option, computed with that option's OWN group
 * lifted out.
 *
 * Counting with the whole filter applied makes every unticked option in a
 * group read 0 as soon as one is ticked, because a product can only be in one
 * subcategory. The count has to answer "how many would I get if I added this",
 * and inside its own group the answer is "these, plus what is already there".
 */
export function optionCount(
  products: FeedProduct[],
  f: TabFilter,
  group: keyof TabFilter,
  match: (p: FeedProduct) => boolean
) {
  const relaxed = { ...f, [group]: Array.isArray(f[group]) ? [] : f[group] } as TabFilter;
  return applyFilter(products, relaxed).filter(match).length;
}

export function sortProducts(products: FeedProduct[], sort: Sort): FeedProduct[] {
  const out = products.slice();
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "newest":
      return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
    default:
      // "Recommended" is deliberately the order the tab already loaded in
      // (newest first) rather than a score nobody can explain. When real
      // ranking signals exist for a tab they are applied by the caller.
      return out;
  }
}
