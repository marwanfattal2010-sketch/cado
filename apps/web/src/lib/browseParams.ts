import { inBudgetRange } from "./filters";
import {
  NEW_IN_DAYS,
  UNDER_TILE_MAX,
  isPriceTier,
  parsePriceTier,
  priceTierFloor,
  type TileId,
} from "./facets";
import { colourOf, flowerTypesOf, sizesOf, type FeedProduct } from "./browse";

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

export type Sort =
  | "recommended"
  | "popular"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "discount";

/**
 * `short` is what fits on the inline sort row; `label` is the full sentence
 * used inside the little Recommended menu, where there is room for it.
 */
export const SORTS: { value: Sort; label: string; short: string }[] = [
  { value: "recommended", label: "Recommended", short: "Recommended" },
  { value: "popular", label: "Most popular", short: "Most popular" },
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
  /** Variant names — "M", "41", "Size 5". */
  size: string[];
  /** Real colour values only; placeholders are never offered. */
  colour: string[];
  /** Flower type values, held as `flower:<value>` in products.tags. */
  flower: string[];
  /** Partner slugs. */
  store: string[];
  tile: TileId | null;
  sort: Sort;
};

const LIST_KEYS = ["for", "occasion", "price", "type", "size", "colour", "flower", "store"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

/**
 * ONE URL VOCABULARY, on the tab route and on /browse alike.
 *
 * The field names inside BrowseState and the parameter names in the URL are
 * deliberately decoupled, because the two want different words:
 *
 *   state.cat   <-> `tab`   which category you are in
 *   state.type  <-> `cat`   which sub-category within it, the Category facet
 *   state.tile  <-> `view`  which saved view
 *
 * Renaming the fields to match would have touched every call site; renaming
 * the params to match the fields would have left the Fashion tab reading
 * `type=women` under a facet labelled Category. This mapping lives here, in
 * one place, and both routes go through it — so a link built on the tab and a
 * link built on /browse are the same string.
 */
const PARAM = {
  cat: "tab",
  type: "cat",
  tile: "view",
} as const;

const TILES: TileId[] = [
  "new-in",
  "most-gifted",
  "best-picks",
  "under-75",
  "arrives-today",
  "gift-wrapped",
  "best-sellers",
  "store-picks",
  "ready-to-gift",
  "deals",
];

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
  const tile = TILES.find((t) => t === params.get(PARAM.tile)) ?? null;
  return {
    cat: params.get(PARAM.cat) ?? "",
    for: list(params.get("for")),
    occasion: list(params.get("occasion")),
    price: list(params.get("price")).filter(isPriceTier),
    min: num(params.get("min")),
    max: num(params.get("max")),
    type: list(params.get(PARAM.type)),
    size: list(params.get("size")),
    colour: list(params.get("colour")),
    flower: list(params.get("flower")),
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
  if (s.cat) p.set(PARAM.cat, s.cat);
  for (const k of LIST_KEYS) if (s[k].length) p.set(k === "type" ? PARAM.type : k, s[k].join(","));
  if (s.min != null) p.set("min", String(s.min));
  if (s.max != null) p.set("max", String(s.max));
  if (s.tile) p.set(PARAM.tile, s.tile);
  if (s.sort !== "recommended") p.set("sort", s.sort);
  return p.toString();
}

/**
 * The filter params, and only those.
 *
 * The Fashion tab lives at the same URL as the pager, so its query string is
 * shared with `tab` and anything else the shell keeps there. Switching tabs
 * has to drop the filters — they describe a category you have just left — and
 * this is the list that gets dropped.
 */
export const FILTER_PARAM_NAMES = [
  ...LIST_KEYS.map((k) => (k === "type" ? PARAM.type : k)),
  "min",
  "max",
  PARAM.tile,
  "sort",
  "facet",
];

export const emptyBrowse = (cat: string): BrowseState => ({
  cat,
  for: [],
  occasion: [],
  price: [],
  min: null,
  max: null,
  type: [],
  size: [],
  colour: [],
  flower: [],
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
  /** Whether ANY product has an order yet — see the most-gifted view. */
  anyOrders: () => boolean;
};

function matchesTile(p: FeedProduct, tile: TileId, look: Lookup): boolean {
  switch (tile) {
    case "new-in": {
      const cutoff = Date.now() - NEW_IN_DAYS * 86400000;
      return new Date(p.created_at).getTime() >= cutoff;
    }
    case "under-75":
      return p.price < UNDER_TILE_MAX;
    case "most-gifted":
    case "best-picks":
      /*
       * A SORT WEARING A FILTER'S CLOTHES, and honest about it.
       *
       * With real order history this narrows to things people have actually
       * ordered. With none — which is where the catalogue is today — it
       * narrows to nothing and the view is purely the popularity sort, which
       * is why the tile's own sub-line reads "Popular picks" rather than
       * claiming a count nobody has earned. It never invents an order.
       */
      return look.anyOrders() ? look.orders(p.id) > 0 : true;
    case "arrives-today":
      return p.same_day === true;
    case "gift-wrapped":
      return p.gift_wrap_available === true;
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
    // Tiers OR together, so "Under $30" plus "Under $100" means under $100 —
    // the looser of the two, not neither. `over-200` carries a real floor and
    // no ceiling, which is why the bound comes from the tier and not from a
    // regex on its id.
    const ok = s.price.some((id) => {
      const max = parsePriceTier(id);
      if (max == null) return false;
      // Built from the tier rather than looked up in BUDGETS: those bands are
      // the home page's own ($20–$50 and friends) and resolving "under-100"
      // against them would silently filter on a different range than the
      // label promises.
      return inBudgetRange(p.price, {
        slug: id,
        label: "",
        min: priceTierFloor(id),
        max: Number.isFinite(max) ? max : null,
      });
    });
    if (!ok) return false;
  }
  if (s.min != null && p.price < s.min) return false;
  if (s.max != null && p.price > s.max) return false;

  if (s.type.length) {
    const ids = s.type.map(look.typeId).filter(Boolean) as string[];
    if (!p.subcategory_id || !ids.includes(p.subcategory_id)) return false;
  }
  if (s.size.length) {
    const have = sizesOf(p);
    if (!have.some((n) => s.size.includes(n))) return false;
  }
  if (s.colour.length) {
    const c = colourOf(p);
    if (!c || !s.colour.includes(c)) return false;
  }
  if (s.flower.length) {
    // Unset means "nobody could tell from the title or the description", and
    // an unclassified bouquet must not turn up under Roses just because the
    // photograph looks red. No tag, no match.
    const types = flowerTypesOf(p);
    if (!types.some((t) => s.flower.includes(t))) return false;
  }
  if (s.store.length) {
    const ids = s.store.map(look.storeId).filter(Boolean) as string[];
    if (!ids.includes(p.partner_id)) return false;
  }
  if (s.tile && !matchesTile(p, s.tile, look)) return false;
  return true;
}

/**
 * A view can pin the sort. "Most gifted" and "New in" are not just filters —
 * the order is half of what they mean — so the tile does not have to remember
 * to set `sort=` as well, and removing the view chip gives the default back.
 */
export function effectiveSort(s: BrowseState): Sort {
  if (s.sort !== "recommended") return s.sort;
  if (s.tile === "most-gifted" || s.tile === "best-picks") return "popular";
  if (s.tile === "new-in") return "newest";
  if (s.tile === "deals") return "discount";
  return "recommended";
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
    case "popular":
      /*
       * Real delivered-order counts, highest first, and nothing else.
       *
       * With no order history yet this lands in catalogue order rather than a
       * different-looking list, which is the honest outcome: there is no
       * popularity data to show, so it shows none. It is NOT seeded with views,
       * a hash of the id, or any other stand-in that would make the sort look
       * busy while meaning nothing.
       */
      return out.sort((a, b) => look.orders(b.id) - look.orders(a.id));
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
