import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Img } from "../../Img";
import { storePath } from "../../../lib/routes";

const MIN_ITEMS = 3;

type StripStore = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

/**
 * Stores that actually have something in stock in this tab.
 *
 * `products!inner(...)` makes the join a filter: a partner with no active,
 * in-stock product in this category is not in the result at all, so the strip
 * can never offer a shop that would open empty. Coming-soon partners
 * (`is_live = false`) are excluded for the same reason — they are only ever
 * shown as a non-clickable card on the homepage.
 */
function useStripStores(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["shop-stores", categoryId ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, products!inner(id)")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.is_active", true)
        .gt("products.stock_quantity", 0)
        .limit(60);
      if (categoryId) q = q.eq("products.category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;

      // The join repeats a partner once per matching product, so de-dupe —
      // and keep the count while we are here, to lead with the fullest shops.
      const seen = new Map<string, StripStore & { count: number }>();
      for (const row of (data ?? []) as (StripStore & { products?: { id: string }[] })[]) {
        const existing = seen.get(row.id);
        const count = row.products?.length ?? 1;
        if (existing) existing.count += count;
        else seen.set(row.id, { ...row, count });
      }
      return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 20);
    },
  });
}

/**
 * The store rail. Rectangles, not circles — circles were tried and rejected.
 *
 * Tapping one opens that store's own page. It used to tick a filter on the
 * feed below, which kept you on the tab but gave the shop nowhere of its own
 * — no cover, no description, nothing to link to, and only the slice of its
 * catalogue that matched the current tab.
 *
 * `minItems: 3` — two shops is not a rail, it is two cards with a gap.
 */
export function StoreStrip({
  categoryId,
  title,
}: {
  categoryId?: string;
  title: string | null;
}) {
  const stores = useStripStores(categoryId);
  const rows = stores.data ?? [];
  if (rows.length < MIN_ITEMS) return null;

  return (
    <section className="pt-5">
      {title ? (
        <h2 className="px-[var(--page-x)] pb-2 text-[15px] font-bold tracking-[-0.01em] text-persimmon">{title}</h2>
      ) : null}
      <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
        {rows.map((store) => (
          <Link
            key={store.id}
            to={storePath(store)}
            className="relative block h-[110px] w-[160px] shrink-0 overflow-hidden rounded-[10px] bg-surface-sunk text-left transition-transform duration-press ease-out active:scale-[0.97]"
          >
            <Img
              src={store.logo_url ?? store.cover_image_url}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
            />
            <span className="absolute inset-x-0 bottom-0 truncate px-2.5 pb-2 text-[13px] font-bold text-inverse drop-shadow">
              {store.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
