import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";

/**
 * THE BROWSE CATALOGUE: one request, sliced in memory by everything that
 * browses.
 *
 * This exists because the app was making ~37 database calls to draw one
 * screen, and at ~600ms each from Lebanon that is what "pressing anything
 * takes time" actually was. The pattern was per-section queries: every
 * category tab asked for its own products, every tab asked for its own
 * subcategories, and half a dozen rows each asked for partners. Ten of those
 * calls returned about ten rows apiece.
 *
 * The whole live catalogue is ~100 products and ~30 stores. Fetching it once
 * costs one round trip and roughly the same bytes as any two of the calls it
 * replaces, and every section then filters an array — instantly, with no
 * spinner and no second wait when you swipe to a tab you have already seen.
 *
 * THE LINE THIS DOES NOT CROSS: it is for BROWSING only. Anything that must
 * be fresh after a write — cart, orders, gift cards, points — keeps its own
 * query and its own invalidation. A stale price on a card is a cosmetic bug;
 * a stale cart is a wrong charge.
 *
 * If the catalogue ever reaches a few thousand products this has to go back
 * to the server, and the grid (which pages) is the first thing to move.
 */

/** Browse data changes a few times a day. Five minutes is generous and still
 *  means at most one refetch per session for most people. */
const BROWSE_STALE_MS = 5 * 60_000;

export function useCatalogue() {
  return useQuery({
    queryKey: ["catalogue"],
    staleTime: BROWSE_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });
}

export type StoreRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  city: string | null;
  is_live: boolean | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  created_at: string | null;
  is_lebanese_brand: boolean | null;
};

/** Every live store, once. The store rows on Home all slice this. */
export function useStoreDirectory() {
  return useQuery({
    queryKey: ["store-directory"],
    staleTime: BROWSE_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select(
          "id, name, slug, logo_url, cover_image_url, tagline, city, is_live, is_featured, featured_rank, created_at, is_lebanese_brand"
        )
        .eq("status", "active")
        .eq("is_live", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as StoreRow[];
    },
  });
}

export type SubcategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  category_id: string;
};

/**
 * ALL subcategories in one request.
 *
 * There are about thirty rows in this table. Asking for them one category at
 * a time was ten requests to move a few kilobytes, and it happened again
 * every time a tab mounted.
 */
export function useAllSubcategories() {
  return useQuery({
    queryKey: ["subcategories", "all"],
    staleTime: BROWSE_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, slug, sort_order, category_id")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as SubcategoryRow[];
    },
  });
}
