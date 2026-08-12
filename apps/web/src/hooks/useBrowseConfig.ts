import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { BrowseBanner, BrowseBlock, BrowseTab, BrowseTile } from "../lib/browse";

/**
 * The whole /shop layout in one request.
 *
 * Tabs, their blocks, and the blocks' tiles and banners are four small
 * admin-authored tables — a few dozen rows in total — so fetching them as one
 * nested select and slicing it client-side beats a query per block. It also
 * means the tab bar and the panels can never disagree about what exists.
 *
 * Cached for the session: this is configuration, not stock. Prices, products
 * and store lists are all fetched separately and stay live.
 */
export function useBrowseConfig() {
  const query = useQuery({
    queryKey: ["browse-config"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("browse_tabs")
        // One literal, deliberately not split with `+`: TypeScript does not
        // fold concatenated strings into a literal type, and the Supabase
        // client needs the literal to type the nested rows. Broken up, every
        // field below comes back as GenericStringError.
        .select(
          "id, slug, label, position, accent_token, filter, blocks:browse_blocks(id, tab_id, type, position, title, config, is_active, tiles:browse_tiles(id, block_id, label, image_url, link_type, link_value, position, group_key, is_active), banners:browse_banners(id, block_id, image_url, headline, subcopy, cta_label, link_type, link_value, position))"
        )
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tabs = useMemo<BrowseTab[]>(() => {
    return (query.data ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      label: t.label,
      position: t.position,
      accent_token: t.accent_token,
      // The column is jsonb; PostgREST hands it back parsed. Anything that
      // isn't an object is treated as "no filter" rather than crashing the
      // tab bar for every shopper.
      filter: t.filter && typeof t.filter === "object" && !Array.isArray(t.filter) ? t.filter : {},
    }));
  }, [query.data]);

  /**
   * Blocks for one tab, active only, in position order, with their contents
   * already attached. Nested rows arrive in whatever order PostgREST returns
   * them, so every level is sorted here rather than in six components.
   */
  const blocksFor = useMemo(() => {
    const byTab = new Map<string, (BrowseBlock & { tiles: BrowseTile[]; banners: BrowseBanner[] })[]>();
    for (const tab of query.data ?? []) {
      const blocks = ((tab.blocks ?? []) as (BrowseBlock & {
        is_active: boolean;
        tiles?: (BrowseTile & { is_active: boolean })[];
        banners?: BrowseBanner[];
      })[])
        .filter((b) => b.is_active)
        .sort((a, b) => a.position - b.position)
        .map((b) => ({
          ...b,
          tiles: (b.tiles ?? []).filter((t) => t.is_active).sort((a, c) => a.position - c.position),
          banners: (b.banners ?? []).slice().sort((a, c) => a.position - c.position),
        }));
      byTab.set(tab.id, blocks);
    }
    return byTab;
  }, [query.data]);

  return { tabs, blocksFor, isLoading: query.isLoading, isError: query.isError };
}

export type BrowseBlockWithContent = BrowseBlock & { tiles: BrowseTile[]; banners: BrowseBanner[] };

/**
 * A real photo for each category and subcategory tile.
 *
 * The tiles have an `image_url` column for artwork that has been uploaded on
 * purpose, and almost none of them have one yet. Rather than ship a grid of
 * grey letters — or worse, pull stock photography — each tile borrows the
 * photo of a product that is genuinely in it. Nothing is invented: if a
 * category has no product with an image, its tile keeps the lettered
 * placeholder.
 *
 * One query for the whole page, cached for the session. `is_primary` first so
 * a tile shows the same photo the product card does.
 */
export function useTileImages() {
  const query = useQuery({
    queryKey: ["browse-tile-images"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("categories(slug), subcategories(slug), product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo(() => {
    const byCategory = new Map<string, string>();
    const bySubcategory = new Map<string, string>();
    for (const row of query.data ?? []) {
      const images = (row.product_images ?? []) as { storage_path: string; is_primary: boolean }[];
      if (images.length === 0) continue;
      const path = (images.find((i) => i.is_primary) ?? images[0]).storage_path;
      const cat = (row.categories as { slug: string } | null)?.slug;
      const sub = (row.subcategories as { slug: string } | null)?.slug;
      if (cat && !byCategory.has(cat)) byCategory.set(cat, path);
      if (sub && !bySubcategory.has(sub)) bySubcategory.set(sub, path);
    }
    return { byCategory, bySubcategory };
  }, [query.data]);
}
