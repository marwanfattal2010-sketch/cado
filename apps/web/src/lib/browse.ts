/**
 * Types and query helpers for the /shop browse experience.
 *
 * The shape of a tab — which sections it has, in what order, with what in
 * them — is database rows, not code (see 0042_browse_blocks.sql). This file
 * is the boundary where those rows become something typed.
 *
 * Filtering rule for the whole feature: every filter is applied with the
 * client's parameterised methods (`.eq`, `.lte`, `.order`). Nothing here
 * builds a PostgREST filter string out of a value, so a stored tile or a URL
 * parameter cannot smuggle in extra syntax.
 */

export type BrowseTabFilter = {
  category_slug?: string;
};

export type BrowseTab = {
  id: string;
  slug: string;
  label: string;
  position: number;
  accent_token: string;
  filter: BrowseTabFilter;
};

export type BrowseBlockType =
  | "banner_carousel"
  | "entry_cards"
  | "sub_tabs"
  | "category_circles"
  | "deal_pair"
  | "stores"
  | "product_feed";

export type BrowseBlock = {
  id: string;
  tab_id: string;
  type: BrowseBlockType;
  position: number;
  title: string | null;
  config: Record<string, unknown>;
};

export type BrowseTile = {
  id: string;
  block_id: string;
  label: string;
  image_url: string | null;
  link_type: "category" | "partner" | "collection" | "url" | "filter";
  link_value: string;
  position: number;
  group_key: string | null;
};

export type BrowseBanner = {
  id: string;
  block_id: string;
  image_url: string | null;
  headline: string | null;
  subcopy: string | null;
  cta_label: string | null;
  link_type: string;
  link_value: string;
  position: number;
};

/**
 * What the feed inside one tab is currently narrowed to, on top of the tab's
 * own category. Set by tapping an entry card, a store or a circle; cleared by
 * the chip that appears when any of it is set.
 */
export type FeedFilter = {
  sort?: "new";
  max_price?: number;
  same_day?: boolean;
  partner_id?: string;
  partner_name?: string;
  subcategory_slug?: string;
  label?: string;
};

export const EMPTY_FEED_FILTER: FeedFilter = {};

export function isFeedFiltered(f: FeedFilter) {
  return Object.keys(f).some((k) => k !== "label" && k !== "partner_name");
}

/**
 * Parse the `link_value` of a `filter` tile.
 *
 * The column is text and the rows are admin-authored, so this is deliberately
 * defensive: anything that is not an object of the keys we understand comes
 * back as an empty filter rather than throwing on a page render. Unknown keys
 * are dropped instead of being passed to PostgREST.
 */
export function parseFilterValue(value: string): FeedFilter {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: FeedFilter = {};
  if (src.sort === "new") out.sort = "new";
  if (typeof src.max_price === "number" && Number.isFinite(src.max_price) && src.max_price > 0) {
    out.max_price = src.max_price;
  }
  if (src.same_day === true) out.same_day = true;
  if (typeof src.partner_id === "string") out.partner_id = src.partner_id;
  if (typeof src.subcategory_slug === "string") out.subcategory_slug = src.subcategory_slug;
  return out;
}

/**
 * A tab's accent as a CSS colour.
 *
 * PERSIMMON, ALWAYS (spec 2.1). Every tab used to carry its own colour —
 * magenta Fashion, purple Jewelry, green Beauty, blue Toys — which made eleven
 * tabs look like eleven products. Tabs now differ by their PHOTOS, not their
 * colour, and there is exactly one accent in the app.
 *
 * The `token` argument is kept so the dozens of call sites do not all have to
 * change at once, and so a per-tab colour cannot creep back in through one of
 * them. The database column stays; nothing reads it for colour any more.
 */
export function accentColor(_token?: string | null, alpha?: number) {
  return alpha == null ? "rgb(var(--accent-brand))" : `rgb(var(--accent-brand) / ${alpha})`;
}

/**
 * The columns every product card on /shop needs, and no more.
 *
 * One unbroken literal with `as const`: split across `+` it widens to
 * `string`, and the Supabase client can only type the returned rows from a
 * literal select.
 */
export const PRODUCT_CARD_COLUMNS =
  // gift_wrap_available is on the card contract because the card SAYS
  // "Arrives wrapped", and that has to be true of the item it is printed on
  // — roughly half the catalogue cannot be wrapped.
  // is_gift_ready and is_pick (migration 0085) drive two whole sections on a
  // category tab — "Ready to gift" and the Store-picks fallback for Best
  // sellers — so they belong on the card contract rather than in a second
  // round-trip per section.
  "id, title, price, compare_at_price, currency, same_day, stock_quantity, created_at, occasion_tags, recipient_tags, gift_wrap_available, is_gift_ready, is_pick, category_id, subcategory_id, partner_id, partner:partners(id, name, slug), product_images(storage_path, is_primary)" as const;

export type FeedProduct = {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  same_day: boolean | null;
  stock_quantity: number | null;
  created_at: string;
  occasion_tags: string[] | null;
  recipient_tags: string[] | null;
  category_id: string;
  subcategory_id: string | null;
  partner_id: string;
  partner: { id: string; name: string; slug: string | null } | null;
  product_images: { storage_path: string; is_primary: boolean }[] | null;
  gift_wrap_available?: boolean | null;
  is_gift_ready?: boolean | null;
  is_pick?: boolean | null;
};

/**
 * The slice of the PostgREST builder this helper touches.
 *
 * Structural rather than the real generic type on purpose: threading
 * `PostgrestFilterBuilder`'s generics through a chain of four calls makes the
 * compiler give up with "type instantiation is excessively deep". The caller
 * casts its builder to this and casts the rows back on the way out, which is
 * where the runtime shape is asserted anyway.
 */
export type FeedQuery = {
  eq(column: string, value: unknown): FeedQuery;
  lte(column: string, value: unknown): FeedQuery;
  order(column: string, options: { ascending: boolean }): FeedQuery;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Narrow a products query to one tab plus whatever the shopper has tapped.
 *
 * `categoryId` is resolved from the tab's slug by the caller rather than
 * filtered through an embedded resource: a plain `.eq("category_id", uuid)`
 * cannot be mis-parsed, and it keeps the query flat enough to paginate.
 */
export function applyFeedFilters(
  query: FeedQuery,
  { categoryId, subcategoryId, filter }: { categoryId?: string; subcategoryId?: string; filter: FeedFilter }
): FeedQuery {
  let q = query.eq("is_active", true);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (subcategoryId) q = q.eq("subcategory_id", subcategoryId);
  if (filter.partner_id) q = q.eq("partner_id", filter.partner_id);
  if (filter.same_day) q = q.eq("same_day", true);
  if (filter.max_price != null) q = q.lte("price", filter.max_price);
  return q.order("created_at", { ascending: false });
}
