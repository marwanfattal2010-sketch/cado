import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useTrendingProducts() {
  return useQuery({
    queryKey: ["products", "trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, currency, is_featured, is_trending, product_images(storage_path, is_primary)")
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

export function useProductsByCategory(categorySlug: string) {
  return useQuery({
    queryKey: ["products", "category", categorySlug],
    enabled: !!categorySlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, price, currency, category:categories!inner(slug), product_images(storage_path, is_primary)"
        )
        .eq("is_active", true)
        .eq("categories.slug", categorySlug);
      if (error) throw error;
      return data;
    },
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    enabled: query.trim().length > 1,
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

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*, partner:partners(id, name, slug, logo_url), product_images(id, storage_path, is_primary, sort_order)"
        )
        .eq("id", id)
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
