import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { useHomeSignals } from "../../../hooks/useHomeEndless";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { Img } from "../../Img";
import { storePath } from "../../../lib/routes";
import { heroArt, tileArt } from "../../../lib/tabArt";
import { AiLine } from "./AiLine";
import { FilterGridSection, useTabFilters } from "./FilterableGrid";
import { UNDER_TILE_MAX, type TileId } from "../../../lib/facets";
import { type BrowseState, type Lookup } from "../../../lib/browseParams";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * THE TAB TEMPLATE — currently Fashion only, and the shape the other ten will
 * take once it is approved.
 *
 * WHAT CHANGED, AND WHY THE PAGE IS SO MUCH SHORTER.
 *
 * The old tab was a stack of browse rows: a recipient circle row, a shop-by-
 * category circle row, an occasion chip block, a Super deals carousel and a
 * New arrivals carousel, and then a grid at the bottom. Every one of those is
 * a filter wearing a different hat — "Gift for… Her" and the `For: Her` facet
 * return the same products — so the page asked the same question five times in
 * five shapes and answered it in a grid you had to scroll past all of them to
 * reach.
 *
 * Now there is one grid, and everything above it is a way into that grid:
 * three hero chips, four tiles, and the facet bar. The rows that duplicated
 * filters are gone rather than restyled.
 *
 * FILTERING NEVER NAVIGATES. The state lives in this page's own query string,
 * the grid re-renders in place and the page scrolls to it. That matters on a
 * pager: a category tab is a panel inside a horizontal scroller, and sending
 * the shopper to a separate results page to tick a box lost their place in the
 * strip and their scroll position in the panel.
 */
export function TabTemplate({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug ?? "";
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryName = category?.name ?? "";

  const sections = useTabSections(category?.id);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();
  const signals = useHomeSignals();


  const subcategories = useMemo(
    () => (subcategoriesQuery.data ?? []).map((s) => ({ slug: s.slug, name: s.name })),
    [subcategoriesQuery.data]
  );

  const stores = useMemo(() => {
    const ids = new Set(sections.all.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id) && s.slug)
      .map((s) => ({
        id: s.id,
        slug: s.slug as string,
        name: s.name.replace(/\[.*?\]\s*/g, ""),
        art: s.cover_image_url ?? s.logo_url,
        isLogo: !s.cover_image_url,
      }));
  }, [directory.data, sections.all]);

  const lookup = useMemo<Lookup>(
    () => ({
      typeId: (s) => (subcategoriesQuery.data ?? []).find((x) => x.slug === s)?.id,
      storeId: (s) => (directory.data ?? []).find((x) => x.slug === s)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((s) => s.recentOrders > 0),
    }),
    [subcategoriesQuery.data, directory.data, signals.data]
  );

  /*
   * THE SAME HOOK THE FLOWERS TAB USES. Not a copy of it.
   *
   * This component had its own state, its own push and its own applied-chip
   * list until Flowers needed the same thing; two of them is exactly the fork
   * that let a filter behave differently on two tabs. The shared hook also
   * carries the tab-slug fix, which this file's own version had wrong and got
   * away with only because Fashion's tab slug and category slug are the same
   * word.
   */
  const filters = useTabFilters({
    slug,
    tabSlug: tab.slug,
    all: sections.all,
    subcategories,
    stores,
    lookup,
  });
  const { state, push } = filters;

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[300px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <Skeleton className="h-[46px] w-full rounded-[12px]" />
          <ProductGridSkeleton count={4} />
        </div>
      </>
    );
  }

  if (sections.all.length === 0) {
    return (
      <p className="px-[var(--page-x)] py-16 text-center text-[14px] text-muted">
        No {categoryName.toLowerCase()} on CADO yet.
      </p>
    );
  }

  return (
    <>
      <Hero cat={slug} state={state} push={push} />

      <div className="space-y-5 px-[var(--page-x)] pt-4">
        <AiLine />
        <StoresBlock categoryName={categoryName} cat={slug} stores={stores} />
        <Tiles all={sections.all} lookup={lookup} state={state} push={push} />
      </div>

      <FilterGridSection
        filters={filters}
        heading={`All ${categoryName.toLowerCase()}`}
        subcategories={subcategories}
        stores={stores}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Three slides, swiped by hand. No auto-rotate and no motion: a carousel that
 * moves on its own steals the tap you were about to make, and this one's
 * chips are the tap.
 */
function Hero({
  cat,
  state,
  push,
}: {
  cat: string;
  state: BrowseState;
  push: (s: BrowseState, scroll?: boolean) => void;
}) {
  const slides = heroArt(cat);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const COPY = [
    { headline: "Dressed for the\noccasion", sub: "Clothing from Lebanese shops, delivered tonight" },
    { headline: "Something he will\nactually wear", sub: "Shirts, knits and jackets, picked for gifting" },
    { headline: "New season,\nnew wardrobe", sub: "Fresh arrivals across women, men and kids" },
  ];

  const chips: { label: string; apply: BrowseState }[] = [
    { label: "For her", apply: { ...state, for: ["her"] } },
    { label: "For him", apply: { ...state, for: ["him"] } },
    { label: "Under $100", apply: { ...state, price: ["under-100"] } },
  ];

  if (slides.length === 0) return null;

  return (
    <section>
      <div
        ref={railRef}
        className="scroll-row"
        style={{ ["--row-gap" as string]: "0px", paddingInline: 0, scrollPaddingInline: 0 }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {slides.map((src, i) => (
          <div
            key={src}
            className="relative h-[340px] w-full shrink-0 snap-start overflow-hidden bg-surface-sunk"
          >
            {/*
              EAGER, all three.
              Lazy loading never fired for these: the slide was on screen, the
              file served 200, and `naturalWidth` stayed 0 — a blank hero over
              a perfectly good photograph. Img's own comment warns that a lazy
              hero is a blank hero for the first paint, and slides two and
              three live inside a horizontal scroller where the observer is no
              more reliable. The sources are 1200px rather than 1600 to keep
              the three of them affordable.
            */}
            <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
            {/* A scrim rising from the bottom, so white type is legible over
                any photograph without dimming the whole picture. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 34%, rgba(0,0,0,0) 62%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 px-[var(--page-x)] pb-4">
              <h2 className="whitespace-pre-line text-[27px] font-bold leading-[1.12] text-white">
                {COPY[i % COPY.length].headline}
              </h2>
              <p className="mt-1 text-[13px] text-white/85">{COPY[i % COPY.length].sub}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => push(c.apply)}
                    className="flex h-9 items-center rounded-pill bg-white px-3.5 text-[13px] font-semibold text-ink transition-transform duration-press ease-out active:scale-[0.97]"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 py-2.5">
        {slides.map((s, i) => (
          <span
            key={s}
            aria-hidden
            className="h-1 rounded-pill transition-all"
            style={{
              width: i === active ? 16 : 6,
              background: i === active ? "rgb(var(--persimmon))" : "rgb(var(--ink) / 0.18)",
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The rest of the page                                                       */
/* -------------------------------------------------------------------------- */


function StoresBlock({
  categoryName,
  cat,
  stores,
}: {
  categoryName: string;
  cat: string;
  stores: { id: string; slug: string; name: string; art: string | null; isLogo: boolean }[];
}) {
  if (stores.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <h2 className="text-h2 text-ink">Stores in {categoryName}</h2>
        <Link to={`/stores/${cat}`} className="shrink-0 text-caption font-semibold text-persimmon">
          See all
        </Link>
      </div>
      {/* Four across, two rows: eight shops is a real choice and still leaves
          the tab short. The squares are 68px — deliberately smaller than the
          old 56px circles looked, because they sit in a denser grid. */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {stores.slice(0, 8).map((s) => (
          <StoreSquare key={s.id} store={s} />
        ))}
      </div>
    </section>
  );
}

export function StoreSquare({
  store,
}: {
  store: { slug: string; name: string; art: string | null; isLogo: boolean };
}) {
  return (
    <Link
      to={storePath({ slug: store.slug })}
      className="flex min-w-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
    >
      <span className="aspect-square w-full overflow-hidden rounded-[12px] border border-line bg-white">
        {store.art ? (
          <Img
            src={store.art}
            className={store.isLogo ? "h-full w-full object-contain p-1.5" : "h-full w-full object-cover"}
          />
        ) : null}
      </span>
      {/* Two lines then ellipsis, and break-words so "Anchor & Oak" wraps at
          the space instead of being cut to "Anchor &". */}
      <span className="line-clamp-2 w-full break-words text-center text-[11px] font-medium leading-tight text-ink">
        {store.name}
      </span>
    </Link>
  );
}

/**
 * Four tiles, each opening the grid pre-filtered.
 *
 * Every sub-line is computed from the products on screen. "Up to -62%" is the
 * real live maximum discount; "24 pieces" is a real count. A tile whose view
 * is empty is not rendered — it would open a grid with nothing in it — and the
 * Deals tile disappears rather than saying "Up to -0%".
 */
function Tiles({
  all,
  lookup,
  state,
  push,
}: {
  all: FeedProduct[];
  lookup: Lookup;
  state: BrowseState;
  push: (s: BrowseState, scroll?: boolean) => void;
}) {
  const maxOff = Math.max(
    0,
    ...all.map((p) =>
      p.compare_at_price && p.compare_at_price > p.price
        ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
        : 0
    )
  );
  const newCount = all.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000
  ).length;
  const underCount = all.filter((p) => p.price < UNDER_TILE_MAX).length;
  const dealCount = all.filter((p) => p.compare_at_price && p.compare_at_price > p.price).length;
  const gifted = lookup.anyOrders();

  const tiles: { id: TileId; label: string; sub: string; show: boolean }[] = [
    { id: "new-in", label: "New in", sub: "Added this month", show: newCount > 0 },
    {
      id: "most-gifted",
      label: "Most gifted",
      // No order history yet, so the label does not claim any. It ranks by the
      // only real signal there is and says what it is doing.
      sub: gifted ? "Ordered most this month" : "Popular picks",
      show: all.length > 0,
    },
    {
      id: "under-75",
      label: `Under $${UNDER_TILE_MAX}`,
      sub: `${underCount} ${underCount === 1 ? "piece" : "pieces"}`,
      show: underCount > 0,
    },
    { id: "deals", label: "Deals", sub: `Up to -${maxOff}%`, show: dealCount > 0 && maxOff > 0 },
  ];

  const shown = tiles.filter((t) => t.show);
  if (shown.length === 0) return null;

  return (
    <section className="grid grid-cols-2 gap-2">
      {shown.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => push({ ...state, tile: t.id })}
          className="overflow-hidden rounded-[12px] border border-line bg-surface text-left transition-transform duration-press ease-out active:scale-[0.98]"
        >
          <Img src={tileArt(t.id) ?? ""} className="h-[96px] w-full object-cover" />
          <span className="block px-2.5 py-2">
            <span className="block text-[14px] font-bold leading-tight text-ink">{t.label}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-muted">{t.sub}</span>
          </span>
        </button>
      ))}
    </section>
  );
}



