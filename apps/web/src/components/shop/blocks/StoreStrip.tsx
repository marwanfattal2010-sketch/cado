import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Img } from "../../Img";

const MIN_ITEMS = 3;

type StripStore = {
  id: string;
  name: string;
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
        .select("id, name, logo_url, cover_image_url, products!inner(id)")
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
 * Tapping one narrows the feed below instead of leaving the page: the whole
 * point of the tab is that you stay in it.
 *
 * `minItems: 3` — two shops is not a rail, it is two cards with a gap.
 */
export function StoreStrip({
  categoryId,
  title,
  activePartnerId,
  onSelect,
}: {
  categoryId?: string;
  title: string | null;
  activePartnerId?: string;
  onSelect: (store: { id: string; name: string } | null) => void;
}) {
  const stores = useStripStores(categoryId);
  const rows = stores.data ?? [];
  if (rows.length < MIN_ITEMS) return null;

  return (
    <section className="pt-5">
      {title ? (
        <h2 className="px-[var(--page-x)] pb-2 text-[15px] font-bold tracking-[-0.01em]">{title}</h2>
      ) : null}
      <div className="scroll-row" style={{ ["--row-gap" as string]: "8px" }}>
        {rows.map((store) => {
          const active = store.id === activePartnerId;
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelect(active ? null : { id: store.id, name: store.name })}
              className={`relative h-[110px] w-[160px] shrink-0 overflow-hidden rounded-[10px] bg-surface-sunk text-left transition-transform duration-press ease-out active:scale-[0.97] ${
                active ? "ring-2 ring-ink" : ""
              }`}
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
            </button>
          );
        })}
      </div>
    </section>
  );
}
