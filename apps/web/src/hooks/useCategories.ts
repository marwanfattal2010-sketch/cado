import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useCategoryCounts } from "./useProducts";

/**
 * Every active category, in display order. This is the raw list — it still
 * contains categories with nothing in them, which is what you want when you
 * are resolving a slug to a name (a direct link to an empty category still
 * has to render "Electronics" in its heading, not a blank).
 *
 * For anything that *offers* a category to tap, use useStockedCategories.
 */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon_name, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Categories that actually have gifts in them.
 *
 * Home & Gifts and Electronics are live rows in the database with zero
 * products, so the rail and the Browse grid were both advertising a shelf
 * that turns out to be bare. A chip that leads nowhere costs more trust than
 * the extra choice buys.
 *
 * Data-driven on purpose: nothing here names a category. The filter is the
 * real product count, so a category disappears the moment its last gift is
 * deactivated and comes back on its own the moment one is added — no deploy,
 * no list to maintain, and nothing deleted from the database.
 *
 * /category/<slug> is deliberately NOT gated by this. Someone following an
 * old link or a bookmark still lands on the page and still gets the honest
 * "We're still adding gifts to Electronics" empty state rather than a 404.
 */
export function useStockedCategories() {
  const categories = useCategories();
  const counts = useCategoryCounts();

  const data = useMemo(() => {
    const all = categories.data;
    if (!all) return undefined;
    // If the count query failed we cannot tell "empty" from "unknown", and
    // guessing wrong in that direction empties the site's main navigation.
    // Show everything: an empty category has a real empty state to land on,
    // a missing rail has nothing.
    if (counts.isError || !counts.data) return all;
    return all.filter((c) => (counts.data.get(c.slug) ?? 0) > 0);
  }, [categories.data, counts.data, counts.isError]);

  return {
    data,
    // Hold the skeleton until BOTH queries are in. Painting nine chips and
    // then yanking two of them away a moment later reads as a glitch.
    isLoading: categories.isLoading || counts.isLoading,
    isError: categories.isError,
  };
}
