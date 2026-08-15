import { AUDIENCES, budgetBySlug, inBudgetRange } from "../lib/filters";

/**
 * One filter model, one matcher, one panel — shared by the category page, the
 * in-place category view on the homepage, search results and the gift finder
 * results. They used to be able to drift; now a group added here appears in
 * all of them or in none.
 *
 * EVERY GROUP HERE IS BACKED BY A COLUMN THAT ACTUALLY HAS VALUES IN IT.
 * Verified against the live database on 2026-08-11:
 *   For    -> products.recipient_tags   her 20, him 12, child 12 of 47 active
 *   Colour -> products.color            32 of 47 active carry a value
 *   Size   -> product_variants.name     ZERO rows exist yet, so the group
 *                                       does not render at all
 * Nothing in this file hardcodes an option list. Options are derived from
 * the rows actually in view, and an option whose count is 0 is not shown, so
 * a filter can never lead to a guaranteed-empty screen.
 *
 * MULTI-SELECT. Every group is an array. Within a group the values are ORed
 * ("Her or Kids"), and the groups are ANDed together — which is the
 * combination people actually mean when they tick two boxes.
 */
export type CategoryFilters = {
  /** recipient_tags: her / him / child. Surfaced as "For". */
  audience: string[];
  /** product_variants.name. Empty in production today — see useProducts. */
  size: string[];
  /** products.color, matched on the exact stored string. */
  color: string[];
  /** Budget band slugs. Always resolved through inBudgetRange(). */
  budget: string[];
  storeId: string[];
  /** Top-level category slug. Only offered outside a category page. */
  category: string[];
  subcategory: string[];
  /** products.occasion_tags — the Occasion group. */
  occasion: string[];
  sameDayOnly: boolean;
  /** A real compare_at_price above the price. */
  onSale: boolean;
  /** A real stock_quantity above zero. */
  inStock: boolean;
};

export const NO_FILTERS: CategoryFilters = {
  audience: [],
  size: [],
  color: [],
  budget: [],
  storeId: [],
  category: [],
  subcategory: [],
  occasion: [],
  sameDayOnly: false,
  onSale: false,
  inStock: false,
};

/** The array-valued keys, in the order their chips should read. */
const LIST_KEYS = [
  "audience",
  "category",
  "subcategory",
  "occasion",
  "color",
  "budget",
  "size",
  "storeId",
] as const;
type ListKey = (typeof LIST_KEYS)[number];

/**
 * THE URL IS THE FILTER STATE.
 *
 * Refinements used to live in useState, and the report that killed that was
 * precise: "selecting an occasion and then navigating or coming back loses
 * the selection". Open a product, come back — the component remounted and
 * every tick was gone. So the selection now round-trips through the query
 * string: back restores it, reload restores it, and a filtered view is a
 * shareable link for free.
 *
 * Every key is prefixed `f.` so this namespace can never collide with the
 * entry params other pages already own (`occasion`, `budget`, `tab`, ...).
 * Empty groups are simply absent — an unfiltered page keeps a clean URL.
 */
const FILTER_PREFIX = "f.";
const FLAG_KEYS = ["sameDayOnly", "onSale", "inStock"] as const;

export function filtersToParams(f: CategoryFilters, into: URLSearchParams): void {
  // Clear the namespace first so a removed tick does not linger in the URL.
  // forEach, not .keys(): this tsconfig's lib predates the iterator typings.
  const stale: string[] = [];
  into.forEach((_v, key) => {
    if (key.startsWith(FILTER_PREFIX)) stale.push(key);
  });
  for (const key of stale) into.delete(key);
  for (const key of LIST_KEYS) {
    if (f[key].length) into.set(FILTER_PREFIX + key, f[key].join(","));
  }
  for (const key of FLAG_KEYS) {
    if (f[key]) into.set(FILTER_PREFIX + key, "1");
  }
}

export function filtersFromParams(params: URLSearchParams): CategoryFilters {
  const f: CategoryFilters = { ...NO_FILTERS };
  for (const key of LIST_KEYS) {
    const v = params.get(FILTER_PREFIX + key);
    if (v) f[key] = v.split(",").filter(Boolean);
  }
  for (const key of FLAG_KEYS) {
    if (params.get(FILTER_PREFIX + key) === "1") f[key] = true;
  }
  return f;
}

/** True when any `f.`-namespaced key is present at all. */
export function hasFilterParams(params: URLSearchParams): boolean {
  let found = false;
  params.forEach((_v, key) => {
    if (key.startsWith(FILTER_PREFIX)) found = true;
  });
  return found;
}

/** The minimum a product row has to look like to be filterable. */
export type FilterableProduct = {
  id: string;
  price: number | string;
  recipient_tags?: string[] | null;
  occasion_tags?: string[] | null;
  compare_at_price?: number | string | null;
  color?: string | null;
  same_day?: boolean | null;
  stock_quantity?: number | null;
  partner?: { id?: string | null } | null;
  category?: { slug?: string | null } | null;
  subcategory?: { slug?: string | null } | null;
};

/**
 * How a colour NAME is drawn as a dot. This is not an option list — the
 * options come from products.color — it only decides what swatch to paint
 * next to a name the database already gave us. A colour with no entry here
 * still renders, with a neutral dot, so new values from the dashboard are
 * never dropped.
 *
 * Literal hex is correct here and is the one sanctioned exception to the
 * "no raw hex" rule: these are samples of a real-world colour, so they
 * cannot come from the brand palette.
 */
/** The single matcher. Every grid and every count in the panel runs this,
 *  so a number in the panel is exactly what tapping it will give you. */
export function productMatches(
  p: FilterableProduct,
  f: CategoryFilters,
  sizesByProduct?: Map<string, Set<string>>
): boolean {
  const tags = (p.recipient_tags as string[] | null) ?? [];
  if (f.audience.length && !f.audience.some((a) => tags.includes(a))) return false;
  if (f.size.length) {
    const own = sizesByProduct?.get(p.id);
    if (!own || !f.size.some((s) => own.has(s))) return false;
  }
  if (f.color.length && !(p.color && f.color.includes(p.color))) return false;
  // Bands share edges and the upper bound is exclusive — see inBudgetRange().
  // Never replace this with a raw min/max comparison.
  if (f.budget.length && !f.budget.some((b) => inBudgetRange(Number(p.price), budgetBySlug(b))))
    return false;
  if (f.storeId.length && !(p.partner?.id && f.storeId.includes(p.partner.id))) return false;
  if (f.category.length && !(p.category?.slug && f.category.includes(p.category.slug))) return false;
  if (f.subcategory.length && !(p.subcategory?.slug && f.subcategory.includes(p.subcategory.slug)))
    return false;
  // Same rule as the card badge: the store offers same-day AND there is
  // stock. An unknown stock count never earns the promise.
  if (f.sameDayOnly && !(p.same_day === true && (p.stock_quantity ?? 0) > 0)) return false;
  if (f.occasion.length) {
    const occ = (p.occasion_tags as string[] | null) ?? [];
    if (!f.occasion.some((o) => occ.includes(o))) return false;
  }
  // Both toggles read a real column: a compare_at_price genuinely above the
  // price, and a stock count genuinely above zero. Neither invents a state.
  if (f.onSale && !(p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)))
    return false;
  if (f.inStock && !((p.stock_quantity ?? 0) > 0)) return false;
  return true;
}

export function countActive(f: CategoryFilters): number {
  return (
    LIST_KEYS.reduce((n, k) => n + f[k].length, 0) +
    (f.sameDayOnly ? 1 : 0) +
    (f.onSale ? 1 : 0) +
    (f.inStock ? 1 : 0)
  );
}

/** Add or drop one value inside one group. */
export function toggleFilter(
  f: CategoryFilters,
  key: ListKey,
  value: string
): CategoryFilters {
  const list = f[key];
  return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
}

/** What the removable chips under the bar do. `value` is undefined for the
 *  one boolean group. */
export function removeFilter(
  f: CategoryFilters,
  key: keyof CategoryFilters,
  value?: string
): CategoryFilters {
  if (key === "sameDayOnly") return { ...f, sameDayOnly: false };
  if (key === "onSale") return { ...f, onSale: false };
  if (key === "inStock") return { ...f, inStock: false };
  const list = f[key as ListKey];
  return { ...f, [key]: value == null ? [] : list.filter((v) => v !== value) };
}

export type ActiveFilterChip = {
  /** Stable across renders so React keys don't collide between groups. */
  id: string;
  key: keyof CategoryFilters;
  value?: string;
  label: string;
};

export function filterLabels(
  f: CategoryFilters,
  ctx: {
    stores?: { id: string; name: string }[];
    categories?: { value: string; label: string }[];
    subcategories?: { value: string; label: string }[];
  }
): ActiveFilterChip[] {
  const out: ActiveFilterChip[] = [];
  const push = (key: ListKey, value: string, label: string) =>
    out.push({ id: `${key}:${value}`, key, value, label });

  for (const v of f.audience) push("audience", v, AUDIENCES.find((a) => a.value === v)?.label ?? v);
  for (const v of f.category)
    push("category", v, ctx.categories?.find((c) => c.value === v)?.label ?? v);
  for (const v of f.subcategory)
    push("subcategory", v, ctx.subcategories?.find((s) => s.value === v)?.label ?? v);
  for (const v of f.color) push("color", v, v);
  for (const v of f.budget) push("budget", v, budgetBySlug(v)?.label ?? v);
  for (const v of f.size) push("size", v, v);
  for (const v of f.storeId)
    push("storeId", v, ctx.stores?.find((s) => s.id === v)?.name ?? "Store");
  if (f.sameDayOnly) out.push({ id: "sameDayOnly", key: "sameDayOnly", label: "Arrives today" });
  return out;
}

/*
 * The panel component that used to live here is deleted. Every screen now
 * renders BrowseFilterPanel; what remains in this file is the filter MODEL —
 * the shape, the matcher, the chip labels — which the new panel and all four
 * grids share. One place still decides what a filter means.
 */
