import { inBudgetRange, budgetBySlug } from "./filters";
import { NEW_IN_DAYS, parsePriceTier, type TileId } from "./facets";
import type { FeedProduct } from "./browse";

/**
 * THE FILTER STATE LIVES IN THE URL. Nowhere else.
 *
 * Every selection a shopper makes is a query parameter, which is what makes
 * the three reported failures go away at once:
 *
 *   - selections stack instead of replacing each other, because adding one is
 *     adding a param rather than calling setState with a fresh object;
 *   - the browser back button walks back through combinations, because each
 *     one is a real history entry;
 *   - a filtered view can be shared, reloaded and bookmarked.
 *
 * Multi-value params are comma separated. OR within a group, AND across
 * groups: `for=him,dad` is Him OR Dad; `for=him&occasion=anniversary` is Him
 * AND anniversary.
 */

export type Sort = "recommended" | "price-asc" | "price-desc" | "newest" | "discount";

/**
 * `short` is what fits beside the title in the sticky header; `label` is the
 * full sentence used inside the sort sheet, where there is room for it.
 */
export const SORTS: { value: Sort; label: string; short: string }[] = [
  { value: "recommended", label: "Recommended", short: "Sort" },
  { value: "price-asc", label: "Price: low to high", short: "Price ↑" },
  { value: "price-desc", label: "Price: high to low", short: "Price ↓" },
  { value: "newest", label: "Newest", short: "Newest" },
  { value: "discount", label: "Biggest discount", short: "Discount" },
];

export type BrowseState = {
  cat: string;
  for: string[];
  occasion: string[];
  /** Tier ids, e.g. "under-100". */
  price: string[];
  min: number | null;
  max: number | null;
  /** Subcategory slugs. */
  type: string[];
  /** Partner slugs. */
  store: string[];
  tile: TileId | null;
  sort: Sort;
};

const LIST_KEYS = ["for", "occasion", "price", "type", "store"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

const TILES: TileId[] = ["new-in", "best-sellers", "store-picks", "ready-to-gift", "deals"];

const list = (v: string | null) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const num = (v: string | null) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
};

export function parseBrowse(params: URLSearchParams): BrowseState {
  const sort = SORTS.find((s) => s.value === params.get("sort"))?.value ?? "recommended";
  const tile = TILES.find((t) => t === params.get("tile")) ?? null;
  return {
    cat: params.get("cat") ?? "",
    for: list(params.get("for")),
    occasion: list(params.get("occasion")),
    price: list(params.get("price")).filter((p) => parsePriceTier(p) != null),
    min: num(params.get("min")),
    max: num(params.get("max")),
    type: list(params.get("type")),
    store: list(params.get("store")),
    tile,
    sort,
  };
}

/**
 * Back to a query string, dropping anything empty.
 *
 * Unknown and empty params are not written back, so the URL stays the shortest
 * honest description of what is on screen rather than accumulating `&for=`
 * fragments as things are removed.
 */
export function serializeBrowse(s: BrowseState): string {
  const p = new URLSearchParams();
  if (s.cat) p.set("cat", s.cat);
  for (const k of LIST_KEYS) if (s[k].length) p.set(k, s[k].join(","));
  if (s.min != null) p.set("min", String(s.min));
  if (s.max != null) p.set("max", String(s.max));
  if (s.tile) p.set("tile", s.tile);
  if (s.sort !== "recommended") p.set("sort", s.sort);
  return p.toString();
}

export const emptyBrowse = (cat: string): BrowseState => ({
  cat,
  for: [],
  occasion: [],
  price: [],
  min: null,
  max: null,
  type: [],
  store: [],
  tile: null,
  sort: "recommended",
});

/** Toggle one value inside one group — the add/remove the brief asks for. */
export function toggleValue(s: BrowseState, key: ListKey, value: string): BrowseState {
  const cur = s[key];
  return { ...s, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
}

/** How many filter VALUES are active — the number on the Filter badge. */
export function activeCount(s: BrowseState): number {
  return (
    LIST_KEYS.reduce((n, k) => n + s[k].length, 0) +
    (s.min != null || s.max != null ? 1 : 0) +
    (s.tile ? 1 : 0)
  );
}

export const hasFilters = (s: BrowseState) => activeCount(s) > 0;

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

export type Lookup = {
  /** Subcategory slug -> id. */
  typeId: (slug: string) => string | undefined;
  /** Partner slug -> id. */
  storeId: (slug: string) => string | undefined;
  /** Real delivered-order counts, for best-sellers and Recommended. */
  orders: (productId: string) => number;
};

function matchesTile(p: FeedProduct, tile: TileId, look: Lookup): boolean {
  switch (tile) {
    case "new-in": {
      const cutoff = Date.now() - NEW_IN_DAYS * 86400000;
      return new Date(p.created_at).getTime() >= cutoff;
    }
    case "best-sellers":
      return look.orders(p.id) > 0;
    case "store-picks":
      return !!p.is_pick;
    case "ready-to-gift":
      return !!p.is_gift_ready;
    case "deals":
      return p.compare_at_price != null && p.compare_at_price > p.price;
  }
}

/**
 * OR within a group, AND across groups.
 *
 * Getting that backwards is how a filter sheet strands people on an empty
 * grid: AND inside a group means ticking a second box can only ever remove
 * results, which reads as broken.
 */
export function matches(p: FeedProduct, s: BrowseState, look: Lookup): boolean {
  if (s.for.length && !(p.recipient_tags ?? []).some((t) => s.for.includes(t))) return false;
  if (s.occasion.length && !(p.occasion_tags ?? []).some((t) => s.occasion.includes(t))) return false;

  if (s.price.length) {
    // Tiers are exclusive upper bounds and OR together, so "Under $30" plus
    // "Under $100" means under $100 — the looser of the two, not neither.
    const ok = s.price.some((id) => {
      const max = parsePriceTier(id);
      return max != null && inBudgetRange(p.price, budgetBySlug(`under-${max}`) ?? { slug: "", label: "", min: 0, max });
    });
    if (!ok) return false;
  }
  if (s.min != null && p.price < s.min) return false;
  if (s.max != null && p.price > s.max) return false;

  if (s.type.length) {
    const ids = s.type.map(look.typeId).filter(Boolean) as string[];
    if (!p.subcategory_id || !ids.includes(p.subcategory_id)) return false;
  }
  if (s.store.length) {
    const ids = s.store.map(look.storeId).filter(Boolean) as string[];
    if (!ids.includes(p.partner_id)) return false;
  }
  if (s.tile && !matchesTile(p, s.tile, look)) return false;
  return true;
}

export function sortResults(rows: FeedProduct[], s: Sort, look: Lookup): FeedProduct[] {
  const out = rows.slice();
  const off = (p: FeedProduct) =>
    p.compare_at_price && p.compare_at_price > p.price
      ? (p.compare_at_price - p.price) / p.compare_at_price
      : 0;
  switch (s) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "newest":
      return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    case "discount":
      return out.sort((a, b) => off(b) - off(a));
    default:
      // Recommended: real order counts first, then newest. No invented score.
      return out.sort(
        (a, b) =>
          look.orders(b.id) - look.orders(a.id) ||
          String(b.created_at).localeCompare(String(a.created_at))
      );
  }
}

/**
 * The count shown beside ONE option, with that option's own group lifted out.
 *
 * Counting with the whole selection applied makes every unticked option in a
 * group read 0 the moment one is ticked, because a product has one
 * subcategory and one store. The number has to answer "how many would I get
 * if I added this", and inside its own group that means "these, plus what is
 * already selected".
 */
export function optionCount(
  rows: FeedProduct[],
  s: BrowseState,
  group: ListKey,
  value: string,
  look: Lookup
): number {
  const relaxed: BrowseState = { ...s, [group]: [value] };
  return rows.filter((p) => matches(p, relaxed, look)).length;
}

/**
 * A link to the results page with one selection pre-applied.
 *
 * Entry points render real <Link>s built from this rather than calling a
 * handler, so a long-press, a middle-click and the browser's own prefetch all
 * behave the way they do everywhere else on the web.
 */
export function browseHref(cat: string, patch: Partial<BrowseState> = {}): string {
  const qs = serializeBrowse({ ...emptyBrowse(cat), ...patch });
  return `/browse?${qs}`;
}
