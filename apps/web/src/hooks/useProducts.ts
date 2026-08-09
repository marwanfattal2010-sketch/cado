import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * The one shape every product card reads. Kept in a single constant so a
 * card can never be rendered from a differently-shaped query — which is how
 * the same product ended up with three different prices on the homepage.
 */
const CARD_FIELDS =
  "id, title, price, compare_at_price, currency, same_day, stock_quantity, tags, product_images(storage_path, is_primary), partner:partners(id, name)";

export type ProductTag = "trending" | "most-gifted" | "new" | "staff-pick";

/**
 * Homepage rows are filters over the product table, never separate arrays.
 * One product = one row = one price, wherever it appears.
 */
export function useProductsByTag(tag: ProductTag, limit = 12) {
  return useQuery({
    queryKey: ["products", "tag", tag, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_FIELDS)
        .eq("is_active", true)
        .contains("tags", [tag])
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

/** Same-day, in stock — powers the "Need It Today" section. */
export function useNeedItToday(limit = 12) {
  return useQuery({
    queryKey: ["products", "need-it-today", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_FIELDS)
        .eq("is_active", true)
        .eq("same_day", true)
        .gt("stock_quantity", 0)
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useTrendingProducts() {
  return useProductsByTag("trending");
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, currency, is_featured, is_trending, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

/** Shared with the hook below and with hover-prefetching, so both always
 * agree on exactly what a "category products" query means. */
export function categoryProductsQuery(
  categorySlug: string,
  opts?: { subcategorySlug?: string; sort?: "price_asc" | "price_desc" | "newest" | "popular" }
) {
  return {
    queryKey: ["products", "category", categorySlug, opts?.subcategorySlug, opts?.sort],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          "id, title, price, currency, created_at, is_trending, partner:partners(id, name), category:categories!inner(slug), subcategory:subcategories(slug), product_images(storage_path, is_primary)"
        )
        .eq("is_active", true)
        .eq("categories.slug", categorySlug);
      if (opts?.subcategorySlug) {
        query = query.eq("subcategories.slug", opts.subcategorySlug);
      }
      switch (opts?.sort) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "popular":
          query = query.order("is_trending", { ascending: false }).order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  };
}

export function useProductsByCategory(
  categorySlug: string | undefined,
  opts?: { subcategorySlug?: string; sort?: "price_asc" | "price_desc" | "newest" | "popular" }
) {
  return useQuery({
    ...categoryProductsQuery(categorySlug ?? "", opts),
    enabled: !!categorySlug,
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
        .select("id, title, price, currency, partner:partners(name), product_images(storage_path, is_primary)")
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

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, currency, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .ilike("title", `%${query.trim()}%`)
        .limit(30);
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
