import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { storePath } from "../../../lib/routes";
import { Img } from "../../Img";
import { SectionHead } from "../../SectionHead";

/**
 * The shops behind one category tab, in the two places a shopper looks for
 * them.
 *
 * WHY THEY MOVED. They used to sit inside the product grid, eight cards down
 * — the middle of nowhere, and an interruption of the one thing the grid is
 * for. SHEIN and Trendyol both put store entry points ABOVE the feed, and
 * that is the arrangement here now: a row of round logos directly under Shop
 * by category, and the bigger browsable cards further down, before the grid
 * starts. Stores never break a grid again.
 */
function useTabStores(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["tab-stores", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select(
          "id, name, slug, logo_url, cover_image_url, tagline, description, products!inner(id)"
        )
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.is_active", true)
        .eq("products.category_id", categoryId as string)
        .gt("products.stock_quantity", 0)
        .limit(20);
      if (error) throw error;
      // PostgREST returns one row per matching product; fold them into one
      // row per store and keep the count as "how much of this category they
      // actually carry", which is what orders the row.
      const seen = new Map<
        string,
        {
          id: string;
          name: string;
          slug: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          tagline: string | null;
          description: string | null;
          count: number;
        }
      >();
      for (const r of data ?? []) {
        const cur = seen.get(r.id);
        if (cur) cur.count += r.products?.length ?? 0;
        else seen.set(r.id, { ...r, count: r.products?.length ?? 0 });
      }
      return [...seen.values()].sort((a, b) => b.count - a.count);
    },
  });
}

/**
 * Position 4: round logos under Shop by category. Small, quiet, and the
 * first thing after the categories — brands where brands belong.
 */
export function TabStoreCircles({ categoryId }: { categoryId?: string }) {
  const stores = useTabStores(categoryId);
  const list = stores.data ?? [];
  /* Even a single shop gets its circle: the row is a shortcut, not a claim
     about how many partners a category has, and every tab carrying the same
     sections is the point of this layout. Only a category with no live shop
     at all loses it. */
  if (list.length === 0) return null;
  return (
    <section className="pt-6">
      <SectionHead title="Stores" to="/stores" />
      <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
        {list.slice(0, 12).map((s) => (
          <Link
            key={s.id}
            to={storePath(s)}
            className="flex w-[56px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[48px] w-[48px] overflow-hidden rounded-pill border border-line bg-surface">
              {s.logo_url || s.cover_image_url ? (
                <Img
                  src={(s.logo_url ?? s.cover_image_url) as string}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-persimmon/10 text-[15px] font-bold text-persimmon">
                  {s.name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Position 8: the bigger cards, for browsing rather than for recognising.
 * Cover photo, name, the store's own line about itself, and a chevron —
 * every card the same size, like every other row on the page.
 */
export function TabStoreBanners({ categoryId, accent }: { categoryId?: string; accent: string }) {
  const stores = useTabStores(categoryId);
  const list = (stores.data ?? []).slice(0, 3);
  if (list.length === 0) return null;
  return (
    <section className="pt-7">
      <SectionHead title="More stores" to="/stores" />
      <div className="flex flex-col gap-3 px-[var(--page-x)]">
        {list.map((s) => (
          <Link
            key={s.id}
            to={storePath(s)}
            className="relative block h-[92px] overflow-hidden rounded-card shadow-rest transition-transform duration-press ease-out active:scale-[0.98]"
            style={{ background: accent }}
          >
            {s.cover_image_url ? (
              <Img src={s.cover_image_url} className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${accent}E6 0%, ${accent}99 45%, transparent 85%)`,
              }}
            />
            <span className="absolute inset-y-0 left-0 flex items-center gap-3 px-4">
              {s.logo_url ? (
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-pill bg-white/90">
                  <Img src={s.logo_url} className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold text-white">{s.name}</span>
                {s.tagline || s.description ? (
                  <span className="block truncate text-[11px] text-white/85">
                    {s.tagline ?? s.description}
                  </span>
                ) : null}
              </span>
            </span>
            <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-white/90">
              ›
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
