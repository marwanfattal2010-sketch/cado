import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { primaryImage } from "../lib/images";
import { storePath } from "../lib/routes";
import type { BrowseBanner } from "../lib/browse";

/**
 * The second and third banner slides for a category, built from live data.
 *
 * Slide one is the seeded row with the category's own headline. These two are
 * generated because the alternative is writing sixteen more headlines into the
 * database that nothing keeps honest — "New in Chocolate" has to still be true
 * next month, and a row cannot check that. Here both slides are derived:
 *
 *   - the newest product in the category, with its own photo and title
 *   - a shop that genuinely stocks the category, with its own cover
 *
 * Every word is a value already in the database. Nothing is claimed that the
 * catalogue does not support, and a category with neither simply gets fewer
 * slides rather than a grey one.
 */
export function useCategorySlides(categoryId: string | undefined, categoryName: string | undefined) {
  const newest = useQuery({
    queryKey: ["cat-slide-newest", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, created_at, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .eq("category_id", categoryId as string)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const store = useQuery({
    queryKey: ["cat-slide-store", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, description, logo_url, cover_image_url, products!inner(id)")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.is_active", true)
        .eq("products.category_id", categoryId as string)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo<BrowseBanner[]>(() => {
    const out: BrowseBanner[] = [];

    const product = (newest.data ?? []).find((p) => (p.product_images ?? []).length > 0);
    if (product) {
      out.push({
        id: `slide-new-${product.id}`,
        block_id: "generated",
        image_url: primaryImage(product.product_images),
        headline: categoryName ? `New in ${categoryName}` : "New in",
        subcopy: product.title,
        cta_label: "SHOP NOW",
        link_type: "url",
        link_value: `/product/${product.id}`,
        position: 90,
      });
    }

    const shop = (store.data ?? []).find((s) => s.cover_image_url || s.logo_url);
    if (shop) {
      out.push({
        id: `slide-store-${shop.id}`,
        block_id: "generated",
        image_url: shop.cover_image_url ?? shop.logo_url,
        headline: shop.name,
        // The store's own description, or the one fact we know for certain.
        subcopy: shop.description ?? `A CADO store${categoryName ? ` for ${categoryName}` : ""}.`,
        cta_label: "SHOP NOW",
        link_type: "url",
        link_value: storePath(shop),
        position: 91,
      });
    }

    return out;
  }, [newest.data, store.data, categoryName]);
}
