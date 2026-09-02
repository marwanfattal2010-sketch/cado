import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { SectionHead } from "../SectionHead";
import { Img } from "../Img";
import { Skeleton } from "../Skeleton";
import { storePath } from "../../lib/routes";

/**
 * "Stores on CADO" (spec 1.6) — circles only.
 *
 * The big 300x208 rectangle cards are gone. They showed two stores per screen
 * and repeated, one section later, everything the circles already said.
 *
 * The circles are now a TWO-ROW grid in one shared scroll container, filled
 * COLUMN BY COLUMN: store 1 top, store 2 below it, store 3 top of the next
 * column. That is what makes one sideways swipe reveal two more shops instead
 * of one, and it is why this is a grid with `grid-flow-col` rather than two
 * separate rows — two rows scrolling independently drift out of alignment the
 * moment one is nudged.
 */

type StoreRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

function useAllLiveStores() {
  return useQuery({
    queryKey: ["stores-on-cado"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url")
        .eq("status", "active")
        .eq("is_live", true)
        .order("is_featured", { ascending: false })
        .order("name");
      return (data ?? []) as StoreRow[];
    },
  });
}

export function FeaturedStores() {
  const stores = useAllLiveStores();

  if (stores.isLoading) {
    return (
      <section className="pt-7">
        <SectionHead title="Stores on CADO" />
        <div className="flex gap-3 px-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[84px] w-[60px] shrink-0 rounded-pill" />
          ))}
        </div>
      </section>
    );
  }

  const list = stores.data ?? [];
  if (list.length === 0) return null;

  return (
    <section className="pt-7">
      <SectionHead title="Stores on CADO" to="/stores" />
      <div
        // pan-x so a vertical scroll over this row still scrolls the page
        // (spec 1.8), and the touchmove stops here so a sideways drag inside
        // the row never reaches the tab-swipe handler.
        style={{ touchAction: "pan-x" }}
        onTouchMove={(e) => e.stopPropagation()}
        className="grid auto-cols-[60px] grid-flow-col grid-rows-2 gap-x-4 gap-y-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((s) => (
          <Link key={s.id} to={storePath(s)} className="flex w-[60px] flex-col items-center gap-1">
            <span className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-pill border border-line bg-surface">
              {s.logo_url ? (
                /* The real logo file, contained rather than cropped — a logo
                   blown up to fill a circle is the pixelated look 2.6 bans. */
                <Img src={s.logo_url} className="h-full w-full object-contain p-1.5" />
              ) : s.cover_image_url ? (
                <Img src={s.cover_image_url} className="h-full w-full object-cover" />
              ) : (
                <span className="text-caption font-bold text-persimmon">
                  {s.name.replace(/\[.*?\]\s*/g, "").slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink">{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
