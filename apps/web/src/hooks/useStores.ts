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
        .select("id, name, slug, description, logo_url, cover_image_url, products!inner(category:categories!inner(slug))")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.categories.slug", categorySlug as string)
        .limit(100);
      if (error) throw error;
      // de-dupe (the join can repeat a partner once per matching product)
      const seen = new Set<string>();
      return data.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    },
  });
}

export function useSearchStores(query: string) {
  // Same sanitising as product search: strip PostgREST filter characters so
  // the term is safe to embed in `.or(...)`.
  const term = query.trim().replace(/[,()*]/g, " ").replace(/\s+/g, " ").trim();
  return useQuery({
    queryKey: ["stores", "search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, description, cover_image_url")
        .eq("status", "active")
        // Coming-soon stores (is_live=false) stay out of search — they'd be
        // clickable links to a store with nothing in it.
        .eq("is_live", true)
        .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

/** The homepage stores row — the ONE place is_live=false stores appear,
 *  rendered as non-clickable "Coming soon". Everything else filters them out. */
export function useTopStores() {
  return useQuery({
    queryKey: ["stores", "top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, description, is_live, products(id)")
        .eq("status", "active")
        .eq("products.is_active", true)
        .order("name")
        .limit(60);
      if (error) throw error;

      // Order by how much a store actually has to sell, not by its name.
      // Alphabetical plus a cap meant the row was decided by first letter:
      // Zahar went live with 9 real products and immediately dropped off the
      // end, while empty stores kept their place. A shopper tapping this row
      // wants a shop with things in it.
      const rows = (data ?? []) as Array<
        (typeof data extends (infer R)[] ? R : never) & { products?: { id: string }[] }
      >;
      const stocked = rows
        .filter((s) => s.is_live && (s.products?.length ?? 0) > 0)
        .sort((a, b) => (b.products?.length ?? 0) - (a.products?.length ?? 0))
        .slice(0, 12);
      // Coming-soon stores keep their place at the end regardless — they are
      // the whole reason this row shows non-clickable cards at all.
      const comingSoon = rows.filter((s) => !s.is_live);
      return [...stocked, ...comingSoon];
    },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A store by its slug — or by its id, for links made before /store/:slug
 * existed and for anything that only has the uuid to hand.
 *
 * Which column is queried is decided by the shape of the value, not by a
 * caller-supplied flag: a uuid can only be an id, anything else can only be a
 * slug. `maybeSingle` rather than `single` because a wrong slug is a 404 page,
 * not a thrown query.
 */
export function useStore(slugOrId: string | undefined) {
  return useQuery({
    queryKey: ["store", slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      const key = slugOrId as string;
      const column = UUID_RE.test(key) ? "id" : "slug";
      const { data, error } = await supabase.from("partners").select("*").eq(column, key).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Everything one store sells, with the columns the filter panel needs.
 *
 * The extra columns over the old version — recipient_tags, color, the two
 * category joins, created_at — are exactly what `productMatches` reads. The
 * store page filters client-side on this one result for the same reason the
 * category page does: ticking a box is then instant, with no refetch and no
 * loading flash, and the panel can show real counts instead of estimates.
 */
export function useStoreProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store-products", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        // same_day + stock_quantity so the card's badges match what the same
        // product shows everywhere else.
        .select(
          "id, title, price, compare_at_price, currency, same_day, stock_quantity, created_at, recipient_tags, occasion_tags, color, is_trending, partner:partners(id, name, slug), category:categories(slug, name), subcategory:subcategories(slug, name), product_images(storage_path, is_primary)"
        )
        .eq("partner_id", storeId as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}
