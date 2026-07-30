import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useSubcategories(categorySlug: string | undefined) {
  return useQuery({
    queryKey: ["subcategories", categorySlug],
    enabled: !!categorySlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, slug, sort_order, category:categories!inner(slug)")
        .eq("categories.slug", categorySlug as string)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useStoresByCategory(categorySlug: string | undefined) {
  return useQuery({
    queryKey: ["stores", "category", categorySlug],
    enabled: !!categorySlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, description, logo_url, products!inner(category:categories!inner(slug))")
        .eq("status", "active")
        .eq("products.categories.slug", categorySlug as string);
      if (error) throw error;
      // de-dupe (the join can repeat a partner once per matching product)
      const seen = new Set<string>();
      return data.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    },
  });
}

export function useStore(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").eq("id", storeId as string).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useStoreProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store-products", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, currency, product_images(storage_path, is_primary)")
        .eq("partner_id", storeId as string)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}
