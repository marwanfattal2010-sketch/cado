import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Img } from "../components/Img";
import { Skeleton } from "../components/Skeleton";
import { storePath } from "../lib/routes";

/**
 * /stores — every live store, two per row (spec 2.6).
 *
 * This is the See-all behind "Stores in {Category}" and "Stores on CADO", so
 * it is built to the same rule as the tab rows: the name sits BELOW the photo
 * on a cream panel, never over it. Text on top of an arbitrary product photo
 * is unreadable on about a third of these covers, and no amount of scrim
 * fixes the ones that are pale.
 *
 * Ordering puts the shops with the most to sell first, so the page opens on
 * something to buy rather than on a coming-soon placeholder.
 */

/** Live product counts, one query for the whole page. */
function useStoreProductCounts() {
  return useQuery({
    queryKey: ["store-product-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("partner_id, category:categories(name)")
        .eq("is_active", true);
      const counts = new Map<string, { n: number; categories: Map<string, number> }>();
      for (const row of (data ?? []) as { partner_id: string; category: { name: string } | null }[]) {
        const entry = counts.get(row.partner_id) ?? { n: 0, categories: new Map() };
        entry.n += 1;
        const name = row.category?.name;
        if (name) entry.categories.set(name, (entry.categories.get(name) ?? 0) + 1);
        counts.set(row.partner_id, entry);
      }
      return counts;
    },
  });
}

/**
 * EVERY live store, not the top twelve.
 *
 * `useTopStores` slices to 12, which is correct for the row on Home and wrong
 * here — this page IS that row's "See all", so cutting it at the same twelve
 * makes the link a no-op. Ordering still puts stocked shops first, so the
 * page opens on something to buy rather than on a coming-soon placeholder.
 */
function useAllStores() {
  return useQuery({
    queryKey: ["stores", "all-live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, is_live, products(id)")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.is_active", true)
        .order("name");
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        id: string;
        name: string;
        slug: string | null;
        logo_url: string | null;
        cover_image_url: string | null;
        products?: { id: string }[];
      }[];
      return rows.sort((a, b) => (b.products?.length ?? 0) - (a.products?.length ?? 0));
    },
  });
}

export function Stores() {
  const stores = useAllStores();
  const counts = useStoreProductCounts();
  const list = stores.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-h1">Stores on CADO</h1>
      <p className="mt-2 max-w-sm text-body text-muted">
        Real Lebanese shops, one checkout. Tap a store to see everything it sells.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stores.isLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-[12px]" />)
          : list.map((s) => {
              const entry = counts.data?.get(s.id);
              // The store's own biggest category, not a made-up label.
              const topCategory = entry
                ? [...entry.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
                : undefined;
              return (
                <Link
                  key={s.id}
                  to={storePath(s)}
                  className="block overflow-hidden rounded-[12px] bg-surface shadow-rest transition-transform duration-press ease-out active:scale-[0.98]"
                >
                  <span className="block aspect-square w-full bg-surface-sunk">
                    <Img
                      src={s.cover_image_url ?? s.logo_url}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="block bg-canvas px-2.5 py-2">
                    <span className="block truncate text-[13px] font-bold leading-tight text-ink">
                      {s.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted">
                      {topCategory ?? " "}
                    </span>
                    {/* A real count, or nothing. "0 gifts" on a shop that is
                        still loading its catalogue reads as a broken store. */}
                    {entry?.n ? (
                      <span className="mt-0.5 block text-[11px] leading-tight text-muted">
                        {entry.n} {entry.n === 1 ? "gift" : "gifts"}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
