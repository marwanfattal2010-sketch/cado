import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * The one shape every product card reads. Kept in a single constant so a
 * card can never be rendered from a differently-shaped query — which is how
 * the same product ended up with three different prices on the home page.
 */
const CARD_FIELDS =
  "id, title, price, compare_at_price, currency, same_day, stock_quantity, tags, created_at, occasion_tags, recipient_tags, product_images(storage_path, is_primary), partner:partners(id, name, slug)";

/*
 * Removed with the old Home page: useProductsByTag, useNeedItToday,
 * useTrendingProducts, useFeaturedProducts and the ProductTag type.
 *
 * They existed to fill "Most gifted for birthdays", "Need it today", "New on
 * CADO" and "Trending this week", and every one of those sections is gone.
 * The `tags` and `is_featured` columns they read are untouched — nothing was
 * dropped from the database, only the dead queries against it.
 */

/**
 * Shared with the hook below and with the category rail's prefetching, so
 * both always agree on exactly what a "category products" query means.
 *
 * One query per category, ordered newest-first, capped at 100 — sorting and
 * every filter happen client-side on top of this. That is deliberate: it
 * means changing the sort or ticking a filter is instant with no refetch and
 * no loading flash, and it lets the filter sheet show exact counts instead
 * of estimates.
 */
export function categoryProductsQuery(categorySlug: string) {
  return {
    queryKey: ["products", "category", categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          // same_day + stock_quantity ride along so the card's delivery and
          // stock badges work here too. Without them the same product showed
          // "Today" on the homepage and nothing on the category page.
          // recipient_tags backs the Gender filter; color backs the Colour
          // filter. color_is_placeholder is deliberately NOT selected — it is
          // a dashboard-side data-quality flag and has no meaning to a
          // shopper, so it must not be able to leak into the storefront.
          "id, title, price, compare_at_price, currency, created_at, is_trending, same_day, stock_quantity, recipient_tags, color, partner:partners(id, name), category:categories!inner(slug), subcategory:subcategories(id, name, slug), product_images(storage_path, is_primary)"
        )
        .eq("is_active", true)
        .eq("categories.slug", categorySlug)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  };
}

export function useProductsByCategory(categorySlug: string | undefined) {
  return useQuery({
    ...categoryProductsQuery(categorySlug ?? ""),
    enabled: !!categorySlug,
  });
}

/**
 * Sizes are ordered the way a shop rail is ordered, not the way a string
 * sort would do it — "Large, Medium, Small" and "10, 6, 8" are both wrong.
 * Anything unrecognised falls to the end in plain alphabetical order rather
 * than being dropped.
 */
const SIZE_ORDER = [
  "xxs", "xs", "extra small", "s", "small", "m", "medium", "l", "large",
  "xl", "extra large", "xxl", "xxxl", "one size", "os",
];

function compareSizes(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a.toLowerCase());
  const ib = SIZE_ORDER.indexOf(b.toLowerCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

export type VariantOptions = {
  /** product id -> the variant names that product actually has. */
  byProduct: Map<string, Set<string>>;
  /** Every distinct variant name in this category, shop-ordered. */
  options: string[];
};

/**
 * Size options for one category, derived from product_variants.name.
 *
 * HONESTY NOTE — READ BEFORE "FIXING" THIS.
 * `product_variants` is the only real size data that exists: there is no
 * size column on products, and no colour column anywhere in the schema. As
 * of 2026-08-11 the table has ZERO rows in production, so this returns an
 * empty option list and the Sizes group renders nothing at all. That is the
 * point. The group lights up by itself the first time a partner adds a
 * variant in the dashboard, and until then nobody is shown a size chip that
 * matches no product. Do not seed this with a hardcoded S/M/L list.
 */
export function useVariantOptionsByCategory(categorySlug: string | undefined) {
  return useQuery<VariantOptions>({
    queryKey: ["variants", "category", categorySlug],
    enabled: !!categorySlug,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        // Same embed-and-filter shape as useStoresByCategory: alias the
        // nested table in the select, filter on its real name in the path.
        .select("name, product_id, products!inner(category:categories!inner(slug))")
        .eq("is_active", true)
        .eq("products.categories.slug", categorySlug as string)
        .limit(500);
      if (error) throw error;

      const byProduct = new Map<string, Set<string>>();
      const seen = new Set<string>();
      for (const row of (data ?? []) as unknown as { name: string; product_id: string }[]) {
        const name = (row.name ?? "").trim();
        if (!name) continue;
        let set = byProduct.get(row.product_id);
        if (!set) byProduct.set(row.product_id, (set = new Set()));
        set.add(name);
        seen.add(name);
      }
      return { byProduct, options: [...seen].sort(compareSizes) };
    },
  });
}

/**
 * Size options for an arbitrary set of products — the search and gift-finder
 * equivalent of the hook above, which can only ask by category.
 *
 * Same honesty rule: product_variants has ZERO rows in production, so this
 * returns an empty option list today and the Size group renders nothing at
 * all. It lights up by itself the first time a partner adds a variant. Do
 * not seed it with a hardcoded S/M/L list.
 *
 * The id list is sorted into the query key so two screens showing the same
 * gifts in a different order share one cached result.
 */
export function useVariantOptionsForProducts(productIds: string[]) {
  const ids = [...productIds].sort();
  return useQuery<VariantOptions>({
    queryKey: ["variants", "products", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("name, product_id")
        .eq("is_active", true)
        .in("product_id", ids)
        .limit(500);
      if (error) throw error;

      const byProduct = new Map<string, Set<string>>();
      const seen = new Set<string>();
      for (const row of (data ?? []) as { name: string; product_id: string }[]) {
        const name = (row.name ?? "").trim();
        if (!name) continue;
        let set = byProduct.get(row.product_id);
        if (!set) byProduct.set(row.product_id, (set = new Set()));
        set.add(name);
        seen.add(name);
      }
      return { byProduct, options: [...seen].sort(compareSizes) };
    },
  });
}

/**
 * How many active gifts sit in each category. One small query over the whole
 * catalogue, used to point a thin category at a sibling that actually has
 * something in it — a "try this instead" link to another empty shelf is
 * worse than no link.
 */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ["products", "category-counts"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category:categories(slug)")
        .eq("is_active", true)
        .limit(1000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const slug = (row as { category?: { slug?: string } | null }).category?.slug;
        if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
      return counts;
    },
  });
}

/**
 * Both filters are optional and applied independently, so this backs three
 * entry points: budget only (homepage budget pills), recipient only
 * (homepage recipient cards), and both (the full two-step gift finder).
 */
export function useGiftFinderProducts(opts: {
  recipient?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}) {
  const { recipient, minPrice, maxPrice } = opts;
  const hasFilter = !!recipient || minPrice != null || maxPrice != null;

  return useQuery({
    queryKey: ["products", "gift-finder", recipient ?? null, minPrice ?? null, maxPrice ?? null],
    enabled: hasFilter,
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          // Same badge fields as every other card query — otherwise the gift
          // finder is the one place a same-day gift doesn't say so.
          "id, title, price, compare_at_price, currency, same_day, stock_quantity, partner:partners(name), product_images(storage_path, is_primary)"
        )
        .eq("is_active", true);
      if (recipient) query = query.contains("recipient_tags", [recipient]);
      if (minPrice != null) query = query.gte("price", minPrice);
      // Exclusive upper bound — the bands share edges, so `lte` put a $50
      // gift in both "$20 – $50" and "$50 – $100". See inBudgetRange().
      if (maxPrice != null) query = query.lt("price", maxPrice);
      const { data, error } = await query.order("price", { ascending: true }).limit(60);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * PostgREST reads commas and parentheses as filter syntax, so a raw user
 * string inside `.or(...)` is an injection vector. Stripping those characters
 * (plus the `*` wildcard) makes the value safe to embed while leaving normal
 * words — "rose", "eau de parfum" — untouched.
 */
function safeIlikeTerm(query: string) {
  return query.trim().replace(/[,()*]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The few words where what a shopper types and what the catalogue stores are
 * different words for the same thing.
 *
 * Every entry was checked against live rows before it was added — this is a
 * list of MEASURED gaps, not a guess at what people might mean. Anything not
 * in it searches exactly as typed.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  // 27 products are tagged `mother`, only 5 `mom`.
  mom: ["mother"],
  mum: ["mother", "mom"],
  mother: ["mom"],
  // 9 are tagged `father`, 4 `dad`.
  dad: ["father"],
  father: ["dad"],
  // What people actually call a best friend. 56 products carry `friend`.
  bff: ["friend"],
  bsf: ["friend"],
  bestie: ["friend"],
  // `kids` is on 1 product; `child` is on 34.
  kids: ["child"],
  kid: ["child"],
  // The Flowers category has 6 products and not one has "flowers" in its
  // title — they are bouquets, roses and plants.
  flowers: ["bouquet", "rose", "plant"],
  flower: ["bouquet", "rose", "plant"],
  perfume: ["eau de", "fragrance"],
};

/** The typed word plus any synonyms, deduped. */
function expandSearchTerm(term: string): string[] {
  const extra = SEARCH_SYNONYMS[term.toLowerCase()] ?? [];
  return [...new Set([term, ...extra])];
}

export function useSearchProducts(query: string) {
  const term = safeIlikeTerm(query);
  return useQuery({
    queryKey: ["products", "search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      /*
       * TITLE, TAGS, AND WHO IT IS FOR.
       *
       * `recipient_tags` was missing from this, and it is the column that
       * carries the words people actually type. Measured against the live
       * catalogue: "mom" matched NOTHING while 27 products were tagged
       * `mother` and 5 `mom`; "friend" matched nothing while 56 were tagged
       * `friend`. Searching a gift shop for "mom" and being told there is
       * nothing is the worst possible answer, and it was wrong.
       *
       * The synonyms below exist for the same reason. They are not clever
       * matching — they are the handful of cases where the word a shopper
       * types and the word the catalogue stores are different words for one
       * thing, and every one was checked against real rows before it was
       * added. See SEARCH_SYNONYMS.
       */
      const terms = expandSearchTerm(term);
      const clauses = terms.flatMap((t) => [
        `title.ilike.%${t}%`,
        `tags.cs.{${t}}`,
        `recipient_tags.cs.{${t}}`,
      ]);

      const { data, error } = await supabase
        .from("products")
        .select(
          // created_at / is_trending back the Sort sheet; recipient_tags,
          // color and the two category embeds back the Filter sheet. Search
          // results are filtered and sorted entirely client-side over this
          // one response, so a tick is instant and the counts are exact.
          "id, title, price, compare_at_price, currency, created_at, is_trending, same_day, stock_quantity, tags, recipient_tags, color, category:categories(slug, name), subcategory:subcategories(slug, name), product_images(storage_path, is_primary), partner:partners(id, name)"
        )
        .eq("is_active", true)
        .or(clauses.join(","))
        .limit(40);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * "You might also like" — same category, excluding the product itself.
 * A product page should never dead-end.
 */
export function useRelatedProducts(categoryId: string | undefined, excludeId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ["products", "related", categoryId, excludeId, limit],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_FIELDS)
        .eq("is_active", true)
        .eq("category_id", categoryId as string)
        .neq("id", excludeId ?? "")
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

/** "Often sent together" — a different category, so the pairing is a real
 *  suggestion (flowers + chocolate) rather than more of the same. */
export function useOftenTogether(categoryId: string | undefined, excludeId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ["products", "together", categoryId, excludeId, limit],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_FIELDS)
        .eq("is_active", true)
        .neq("category_id", categoryId as string)
        .neq("id", excludeId ?? "")
        .contains("tags", ["most-gifted"])
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*, partner:partners(id, name, slug, logo_url), product_images(id, storage_path, is_primary, sort_order)"
        )
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingOccasionEvents() {
  return useQuery({
    queryKey: ["occasion-events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("occasion_events")
        .select("id, title, event_date, banner_image_url")
        .eq("is_active", true)
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
