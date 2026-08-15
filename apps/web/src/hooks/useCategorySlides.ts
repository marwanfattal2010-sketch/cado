import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { primaryImage } from "../lib/images";
import { storePath } from "../lib/routes";
import type { BrowseBanner } from "../lib/browse";

/**
 * The second and third banner slides for a category, built from live data.
 *
 * Slide one is the seeded row with the category's own headline. These are
 * generated because the alternative is writing sixteen more headlines into the
 * database that nothing keeps honest — "New in Chocolate" has to still be true
 * next month, and a row cannot check that. Here they are derived:
 *
 *   - a hero product from the category, with its own photo and title
 *   - a shop that genuinely stocks the category, with its own cover
 *
 * Every word is a value already in the database. Nothing is claimed that the
 * catalogue does not support, and a category with neither simply gets fewer
 * slides rather than a grey one.
 *
 * WHICH PRODUCT, AND WHY NOT THE NEWEST
 *
 * This used to take whatever was added last, and "most recent" turned out to
 * be a terrible curator. Marwan reviewed the live carousels and every fault he
 * found came from that one rule: Flowers led with "The Housewarming Box" (a
 * box, in Flowers), Jewelry & Accessories with "Bugatti Men Bag" and then a
 * belt, Shoes with a kids' clog, Gift Sets with a baby crate.
 *
 * So the choice is curated instead, through `products.is_featured` — a column
 * that already existed and that the storefront was not reading. Editorial
 * judgement lives in the database where it can be changed without a deploy,
 * and it still only ever selects REAL products. Newest remains the fallback
 * so a category nobody has curated yet still gets a slide.
 */
export function useCategorySlides(
  categoryId: string | undefined,
  categoryName: string | undefined,
  /**
   * The photo slide one is already using. Slide two picks a different product
   * so the carousel cannot show the same picture twice — which is exactly what
   * Toys was doing, and it reads as the carousel being broken rather than as
   * two slides about the same thing.
   */
  avoidImage?: string | null
) {
  const newest = useQuery({
    queryKey: ["cat-slide-hero", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, created_at, is_featured, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .eq("category_id", categoryId as string)
        .gt("stock_quantity", 0)
        // Featured first, then newest within each group. One query, and the
        // fallback is the same rows rather than a second round trip.
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
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

    const candidates = (newest.data ?? []).filter((p) => (p.product_images ?? []).length > 0);
    // Prefer one whose photo slide 1 is not already showing; fall back to the
    // first rather than dropping the slide, because a category with a single
    // photographed product should still get a carousel.
    const product =
      candidates.find((p) => !avoidImage || primaryImage(p.product_images) !== avoidImage) ??
      candidates[0];
    if (product) {
      out.push({
        id: `slide-new-${product.id}`,
        block_id: "generated",
        image_url: primaryImage(product.product_images),
        // "New in" is only honest for the newest row. Once the choice is
        // curated the claim has to change with it, so a featured pick says
        // what it is instead of dating itself.
        headline: product.is_featured
          ? (categoryName ?? "Picked for you")
          : categoryName
            ? `New in ${categoryName}`
            : "New in",
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
  }, [newest.data, store.data, categoryName, avoidImage]);
}
