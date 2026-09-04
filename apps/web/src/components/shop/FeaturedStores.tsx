import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useStockedStoreDirectory } from "../../hooks/useCatalogue";
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
  // Sliced from the one store request the whole page shares. STOCKED only:
  // "Stores on CADO" is a row of shops you can buy from, and since 0096 an
  // active, live store is allowed to exist with an empty shelf.
  const directory = useStockedStoreDirectory();
  return {
    data: useMemo(
      () =>
        (directory.data ?? [])
          .slice()
          .sort(
            (a, b) =>
              Number(!!b.is_featured) - Number(!!a.is_featured) || a.name.localeCompare(b.name)
          ) as unknown as StoreRow[],
      [directory.data]
    ),
    isLoading: directory.isLoading,
  };
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
        /* NO touch-action here, deliberately. A rail with pan-x can only be
           panned sideways, so a finger landing on a card could not scroll the
           page at all — that was the whole scroll bug. The browser locks the
           axis itself, and usePager already ignores any gesture that starts
           inside a horizontal scroller. */
        className="grid auto-cols-[60px] grid-flow-col grid-rows-2 gap-x-4 gap-y-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((s) => (
          <Link key={s.id} to={storePath(s)} className="flex w-[60px] flex-col items-center gap-1">
            <span className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-pill border border-line bg-surface">
              {/* THE SHOP'S OWN PHOTO FIRST. This preferred the logo, and
                  since only two shops have one the row was mostly letters in
                  circles. A real logo file still wins over nothing, but a
                  photograph of the shop beats both — and there is no
                  lettered fallback: a shop with no picture shows an empty
                  tint and goes on the list to be photographed. */}
              {s.cover_image_url ? (
                <Img src={s.cover_image_url} className="h-full w-full object-cover" />
              ) : s.logo_url ? (
                <Img src={s.logo_url} className="h-full w-full object-contain p-1.5" />
              ) : null}
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink">{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
