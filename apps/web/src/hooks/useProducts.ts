import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useTrendingProducts() {
  return useQuery({
    queryKey: ["products", "trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, price, currency, is_featured, is_trending, product_images(storage_path, is_primary), partner:partners(name)"
        )
        .eq("is_active", true)
        .eq("is_trending", true)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
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

export function useGiftFinderProducts(minPrice: number, maxPrice: number | null, recipient: string) {
  return useQuery({
    queryKey: ["products", "gift-finder", minPrice, maxPrice, recipient],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, title, price, currency, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .contains("recipient_tags", [recipient])
        .gte("price", minPrice);
      if (maxPrice !== null) {
        query = query.lte("price", maxPrice);
      }
      const { data, error } = await query.limit(24);
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
