import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { useHomeSignals } from "../../../hooks/useHomeEndless";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { Img } from "../../Img";
import { StaggeredGrid, CollectionTile, type CollectionCard } from "../StaggeredGrid";
import { StoreLogoCircle } from "../StoreLogoCircle";
import { storePath } from "../../../lib/routes";
import { formatMoney } from "../../../lib/money";
import { productImageUrl } from "../../../lib/images";
import { circleArt, heroArt, tileArt, typeTileArt } from "../../../lib/tabArt";
import { UNDER_TILE_MAX, type TileId } from "../../../lib/facets";
import { browseHref, type Lookup } from "../../../lib/browseParams";
import { categoryStores, storeDisplayName } from "../../../lib/browse";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * THE FASHION TAB.
 *
 * NO FILTERS LIVE ON THIS PAGE. Not a sort row, not a chip, not a Filter
 * button. Everything here is a door: a hero button, a store, a circle, a tile,
 * a "See all", a collection card — and every one of them opens the results
 * page, which is the only place a filter exists. The tab's job is to show what
 * is in the shop; narrowing it is a different screen.
 *
 * WHITE, AND NO LINES. The background is white, sections are separated by
 * space alone, and the only rules on the page are the edges of the grid's own
 * cards against its light gutter. Every `border-bottom` that used to divide a
 * section is gone.
 */

/**
 * STORE LOGOS ARE FILES ON DISK, KEYED BY SLUG — never generated, never
 * downloaded, never drawn.
 *
 * A glob rather than eleven imports: dropping `nike.png` into
 * `src/assets/stores/` is then the ENTIRE change needed to give Nike its
 * logo, and a slug with no file is simply absent from this map, which is what
 * selects the text fallback below. Measured: dropping a PNG into the folder
 * with the dev server already running hot-reloaded this module and the circle
 * swapped from text to the file with no restart.
 *
 * The folder ships with only a README, so today every circle is the fallback.
 * That is the correct state: we do not have the marks, and inventing one is
 * worse than a name in text. See `assets/stores/README.md`.
 */
const STORE_LOGO_FILES = import.meta.glob("../../../assets/stores/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const STORE_LOGOS = new Map(
  Object.entries(STORE_LOGO_FILES).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/i, ""),
    url,
  ])
);

/** How many circles the row shows: four across, two rows, nothing hidden. */
const STORE_ROW_MAX = 8;

/** The "Shop for" order, by subcategory slug. See `circles` below. */
/**
 * "Shop for" is DEPARTMENTS only now — who you are shopping for.
 *
 * Bags, Caps, Belts and Scarves were here too, which made the row a mix of two
 * different questions: who is it for, and what is it. They moved to the type
 * row below, where the second question is asked properly.
 */
const CIRCLE_ORDER = ["women", "men", "kids-fashion"];

/**
 * "WHAT ARE YOU LOOKING FOR?" — the second question, asked properly.
 *
 * Seven types in a stated order. Four are real Fashion subcategories and
 * filter on `type`; three are garment cuts that filter on a tag written by
 * migration 0099, because `subcategory_id` holds one value and a `tops`
 * subcategory would have emptied the department circles above.
 *
 * `kind` is what decides which URL a tile writes. Both land on the same
 * results page with the same sort row and facet chips.
 */
const TYPE_TILES: { key: string; label: string; kind: "type" | "tile" }[] = [
  { key: "tshirts", label: "T-shirts", kind: "tile" },
  { key: "sets", label: "Sets", kind: "tile" },
  { key: "shirts", label: "Shirts", kind: "tile" },
  { key: "bags", label: "Bags", kind: "type" },
  { key: "caps", label: "Caps", kind: "type" },
  { key: "belts", label: "Belts", kind: "type" },
  { key: "scarves", label: "Scarves", kind: "type" },
];

export function TabTemplate({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug ?? "";
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryName = category?.name ?? "";

  const sections = useTabSections(category?.id);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();
  const signals = useHomeSignals();

  const all = sections.all;

  /*
   * THE ROW IS `display_rank`-DRIVEN, AND IT IS THE ONE PLACE A SHOP WITH NO
   * PRODUCTS IS SHOWN ON PURPOSE.
   *
   * The rule itself is `categoryStores` in lib/browse.ts, shared with the
   * `/stores/:cat` directory this section's "See all" opens, so the row and
   * the page behind it cannot disagree about who is in Fashion. Both take:
   * a shop stocking the category, OR a shop pinned to it by
   * `display_category_id` + `display_rank` (migration 0096). Pinned shops lead
   * in rank order.
   *
   * NO NAME LIST LIVES HERE. The order used to come from a hardcoded array of
   * recognisable brands, which meant moving a shop up the row was a deploy.
   * It is an UPDATE now.
   */
  const stores = useMemo(
    () =>
      categoryStores({
        stores: directory.data ?? [],
        products: all,
        categoryId: category?.id,
      }).map((s) => ({
        id: s.id,
        slug: s.slug as string,
        name: storeDisplayName(s.name),
        logo_url: s.logo_url,
      })),
    [directory.data, all, category?.id]
  );

  const lookup = useMemo<Lookup>(
    () => ({
      typeId: (s) => (subcategoriesQuery.data ?? []).find((x) => x.slug === s)?.id,
      storeId: (s) => (directory.data ?? []).find((x) => x.slug === s)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((s) => s.recentOrders > 0),
    }),
    [subcategoriesQuery.data, directory.data, signals.data]
  );

  /**
   * "Shop for" — only values that actually have products, in a stated order.
   *
   * The order used to be whatever PostgREST returned, which put Scarves and
   * Belts ahead of Bags because of the order the rows were inserted in. It is
   * a merchandising decision, not a database artefact: people first, then the
   * things they carry, then the things they wear on top. Anything not named
   * here keeps its natural position at the end rather than disappearing.
   */
  const circles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) if (p.subcategory_id) counts.set(p.subcategory_id, (counts.get(p.subcategory_id) ?? 0) + 1);
    const rank = (s: string) => {
      const i = CIRCLE_ORDER.indexOf(s);
      return i === -1 ? CIRCLE_ORDER.length : i;
    };
    return (subcategoriesQuery.data ?? [])
      .filter((s) => (counts.get(s.id) ?? 0) > 0 && CIRCLE_ORDER.includes(s.slug))
      .sort((a, b) => rank(a.slug) - rank(b.slug))
      .map((s) => ({ slug: s.slug, name: s.name, photo: circleArt(slug, s.slug) }));
  }, [subcategoriesQuery.data, all, slug]);

  const deals = useMemo(
    () =>
      all
        .filter((p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price))
        .sort((a, b) => off(b) - off(a)),
    [all]
  );

  /* The newest-first ordering went with the "New arrivals" row when it was
     deleted from this tab. The New in tile still leads to the same products
     through the results page, which sorts them there. */
  const bestPicks = useMemo(
    () => [...all].sort((a, b) => lookup.orders(b.id) - lookup.orders(a.id)),
    [all, lookup]
  );

  const collections = useMemo<CollectionCard[]>(() => {
    const under50 = all.filter((p) => Number(p.price) < 50).slice(0, 2);
    const top = bestPicks.slice(0, 2);
    const out: CollectionCard[] = [];
    if (under50.length === 2) {
      out.push({
        key: "under-50",
        title: "Under $50",
        href: browseHref(slug, { price: ["under-50"] }),
        items: under50.map((p) => ({
          photo: photoOf(p),
          price: Number(p.price),
          note: off(p) ? `-${off(p)}%` : "",
        })),
      });
    }
    if (top.length === 2) {
      out.push({
        key: "top-ranking",
        title: "Top ranking",
        href: browseHref(slug, { tile: "most-gifted" }),
        // "#1" and "#2" are positions in THIS list, which is a real ordering of
        // real order counts — not a rank invented for the card.
        items: top.map((p, i) => ({ photo: photoOf(p), price: Number(p.price), note: `#${i + 1}` })),
      });
    }
    return out;
  }, [all, bestPicks, slug]);

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[200px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <ProductGridSkeleton count={4} />
        </div>
      </>
    );
  }
  if (all.length === 0) {
    return (
      <p className="px-[var(--page-x)] py-16 text-center text-[14px] text-muted">
        No {categoryName.toLowerCase()} on CADO yet.
      </p>
    );
  }

  const maxOff = deals.length ? off(deals[0]) : 0;
  const underCount = all.filter((p) => Number(p.price) < UNDER_TILE_MAX).length;
  const newCount = all.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000
  ).length;

  /*
   * STORES: FOUR ACROSS, TWO ROWS, NO SWIPE.
   *
   * Eight ranked shops fill the grid exactly. It is a wrapping flex row rather
   * than `grid-cols-4` so that a count which is not a multiple of four centres
   * its last row instead of stranding circles hard left — which is the state
   * the tab is in until the six new partners exist.
   *
   * The 31 rather than 30 in the width is slack, not arithmetic: four columns
   * plus three 10px gaps come to exactly 100%, and a sub-pixel rounding error
   * at that width wraps the fourth circle onto a line of its own.
   */
  const shownStores = stores.slice(0, STORE_ROW_MAX);
  const storeCircleW = "calc((100% - 31px) / 4)";

  /*
   * The four shortcuts. `note` is the second line on each card and every one
   * of them is a real number off this tab: how many arrived in the window, how
   * many are under the threshold, the largest live discount. Nothing here is
   * typed in, and a card whose number is zero does not render.
   */
  const tiles: { id: TileId; label: string; note: string; show: boolean }[] = [
    { id: "new-in", label: "New in", note: `${newCount} just landed`, show: newCount > 0 },
    { id: "most-gifted", label: "Most gifted", note: "Popular picks", show: all.length > 0 },
    {
      id: "under-75",
      label: `Under ${UNDER_TILE_MAX}`,
      note: `${underCount} under ${UNDER_TILE_MAX}`,
      show: underCount > 0,
    },
    { id: "deals", label: "Deals", note: `Up to -${maxOff}%`, show: deals.length > 0 && maxOff > 0 },
  ];

  return (
    <div className="bg-white">
      <Hero cat={slug} />

      {/* 2 — stores: eight logo circles, four across, nothing behind a swipe.
          Not rendered at all with nothing to show: a heading, a line of copy
          and a "See all 0" over an empty strip is worse than the section being
          absent, and it is a state the tab really can reach — the directory
          query is a single request that can fail. */}
      {shownStores.length > 0 ? (
      <section className="px-[var(--page-x)] pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-bold tracking-[-0.2px] text-persimmon">
            Stores in {categoryName}
          </h2>
          <Link to={`/stores/${slug}`} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
            See all {stores.length}
          </Link>
        </div>
        <p className="mb-3 mt-1 text-[12px] text-muted">
          Shop Lebanon&rsquo;s boutiques and brands in one order
        </p>
        <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-3.5">
          {shownStores.map((s) => (
            <Link
              key={s.id}
              to={storePath({ slug: s.slug })}
              style={{ width: storeCircleW }}
              className="min-w-0 text-center"
            >
              <StoreLogoCircle name={s.name} logoUrl={s.logo_url ?? STORE_LOGOS.get(s.slug)} />
              {/* ONE LINE, ALWAYS. "Pull & Bear" and "LC Waikiki" both fit at
                  12px inside a quarter of the gutter; anything longer clips
                  with an ellipsis rather than pushing its circle out of line
                  with the seven beside it. */}
              <span className="mt-1.5 block truncate text-[12px] leading-[16px] text-ink">
                {s.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
      ) : null}

      {/* 3 — Shop for. FIRST OF THE TINTED BANDS: persimmon at about 4%, which
          is enough to separate a section from the one above it without
          becoming a second colour. White is still the base; these bands and
          the deals band are the only three places it is broken. */}
      {circles.length ? (
        <section className="mt-5 bg-[#FFF6F4] pb-5 pt-5">
          <h2 className="px-[var(--page-x)] pb-3 text-[16px] font-bold tracking-[-0.2px] text-persimmon">
            Shop for
          </h2>
          {/* FOUR ACROSS, WRAPPING — not a swipe row. Seven values fit in two
              rows at 375px, and a row you have to drag hides half of what the
              tab sells behind a gesture nobody is told about. The last row is
              left-aligned rather than centred so the columns line up with the
              row above it. */}
          {/* THREE, so they sit across the row rather than bunching left.
              Fixed 80px discs with the space distributed between them: a
              1fr-column grid would blow each circle up to 110px and make the
              row shout louder than the tab. */}
          <div className="flex justify-evenly gap-x-2 px-[var(--page-x)]">
            {circles.map((c) => (
              <Link
                key={c.slug}
                to={browseHref(slug, { type: [c.slug] })}
                style={{ width: 80 }}
                className="min-w-0 text-center transition-transform duration-press ease-out active:scale-[0.96]"
              >
                <span className="block aspect-square w-full overflow-hidden rounded-pill bg-[#EEEAE4]">
                  {c.photo ? <Img src={c.photo} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="mt-1.5 block truncate text-[12px] font-semibold text-ink">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4 — "What are you looking for?", the same tall tile the four
          shortcuts used to be. Directly under the department circles, because
          it is the natural follow-on question. Seven of them, so this one IS a
          swipe row — four across would make each tile 88px wide. */}
      <section className="pt-5">
        <h2 className="px-[var(--page-x)] pb-3 text-[16px] font-bold tracking-[-0.2px] text-persimmon">
          What are you looking for?
        </h2>
        <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
          {TYPE_TILES.map((t) => (
            <Link
              key={t.key}
              to={
                t.kind === "type"
                  ? browseHref(slug, { type: [t.key] })
                  : browseHref(slug, { tile: t.key as TileId })
              }
              className="relative block h-[196px] w-[148px] shrink-0 overflow-hidden rounded-[12px] bg-[#EEEAE4] transition-transform duration-press ease-out active:scale-[0.97]"
            >
              <Img
                src={typeTileArt(slug, t.key) ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 z-[1]"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,.62) 0%, rgba(0,0,0,0) 55%)" }}
              />
              <span className="absolute bottom-[12px] left-[12px] right-[12px] z-[2] text-[15px] font-semibold leading-tight text-white">
                {t.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4b — the four shortcuts, now horizontal cards in a 2x2 grid.
          They were tall tiles in a swipe row, which hid two of the four behind
          a drag. All four are on screen at once now, at one size, and the row
          cannot scroll sideways. */}
      <section className="px-[var(--page-x)] pt-5">
        <div className="grid grid-cols-2 gap-2">
          {tiles
            .filter((t) => t.show)
            .map((t) => (
              <Link
                key={t.id}
                to={browseHref(slug, { tile: t.id })}
                className="flex items-center gap-2.5 overflow-hidden rounded-[12px] border border-[#EFEBE5] bg-white p-2 transition-transform duration-press ease-out active:scale-[0.97]"
              >
                <span className="block h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[9px] bg-[#EEEAE4]">
                  <Img src={tileArt(t.id, slug) ?? ""} className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold leading-tight text-ink">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-muted">
                    {t.note}
                  </span>
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* 5 — Super deals, on its own pale band.
          PALE PEACH, NOT PALE BLUE. The band used to be a pale steel blue, and
          a cool field is the one thing on this page that cannot sit next to a
          persimmon badge without both of them looking wrong. The peach below is
          the same brightness, on the warm side of the page. */}
      {deals.length >= 3 ? (
        <section className="mt-5 px-[var(--page-x)] pb-[18px] pt-4" style={{ background: "#FFF4EF" }}>
          <div className="flex items-baseline justify-between gap-3 pb-3">
            <h2 className="text-[17px] font-bold text-persimmon">Super deals</h2>
            <Link to={browseHref(slug, { tile: "deals" })} className="text-[12.5px] font-semibold text-persimmon">
              See all
            </Link>
          </div>
          {/* The big card sets the row height (1 : 1.25) and the right-hand
              column stretches to it, so the two small cards stack to exactly
              the same total. Before this the big card had no cap and a tall
              scarf photograph made it a full screen high. */}
          <div className="grid grid-cols-[1.35fr_1fr] items-stretch gap-2.5">
            <DealBig p={deals[0]} />
            <div className="flex min-h-0 flex-col gap-2.5">
              <DealSmall p={deals[1]} />
              <DealSmall p={deals[2]} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 6 — one swipe row. "New arrivals" was deleted from this tab: it and
          Best picks were two rows of the same shape doing the same job, and
          the new-in tile above already leads to everything recent. */}
      {/* Second tinted band. */}
      <div className="mt-5 bg-[#FFF6F4] pb-5">
        <Strip
          title="Best picks"
          products={bestPicks}
          seeAll={browseHref(slug, { tile: "most-gifted" })}
        />
      </div>

      {/* 7 — the two collection cards, side by side, immediately above the
          grid they introduce. They used to be the first two items INSIDE the
          staggered grid, which put them in a column flow that could stack them
          one above the other and made them read as two unusually smart product
          cards rather than as a pair. */}
      {collections.length ? (
        <section className="px-[var(--page-x)] pt-5">
          <div className="grid grid-cols-2 gap-2">
            {collections.map((c) => (
              <CollectionTile key={c.key} card={c} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 8 — the staggered grid, directly beneath them. */}
      <section className="pt-4">
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-2">
          <h2 className="text-[17px] font-bold text-persimmon">All {categoryName.toLowerCase()}</h2>
          <Link to={browseHref(slug)} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
            See all {all.length} →
          </Link>
        </div>
        <StaggeredGrid products={all} tone="fashion" />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

const off = (p: FeedProduct) =>
  p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
    : 0;

function photoOf(p: FeedProduct) {
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  return path ? productImageUrl(path) : null;
}

/*
 * The hardcoded list of recognisable brand names that used to order the store
 * row lived here. It is gone: the order is `partners.display_rank` now, so
 * moving a shop is an UPDATE and not a deploy. See `categoryStores` in
 * lib/browse.ts.
 */

/**
 * 200px, full-bleed, one slide per entry in HERO_ART, swiped by hand.
 *
 * It was ~300px, and the reason was that SHOP NOW and the AI line were stacked.
 * Side by side on one row they cost one line instead of two, which is the
 * whole hundred pixels.
 */
function Hero({ cat }: { cat: string }) {
  const slides = heroArt(cat);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement | null>(null);

  const COPY = [
    { a: "Dressed for", b: "the occasion" },
    { a: "Something he", b: "will actually wear" },
    { a: "New season,", b: "new wardrobe" },
  ];
  if (slides.length === 0) return null;

  return (
    <section>
      <div
        ref={rail}
        className="scroll-row"
        style={{ ["--row-gap" as string]: "0px", paddingInline: 0, scrollPaddingInline: 0 }}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {slides.map((src, i) => (
          <div
            key={src}
            className="relative h-[200px] w-full shrink-0 snap-start overflow-hidden bg-[#8E8474]"
          >
            <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
            {/* Scrim from the LEFT, because the type is left-aligned; a bottom
                scrim would dim the photograph where the type is not. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,.5), rgba(0,0,0,.02) 76%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-[18px]">
              <h2 className="max-w-[230px] text-[25px] font-bold leading-[1.1] tracking-[-0.4px] text-white">
                {COPY[i % COPY.length].a}
                <br />
                {COPY[i % COPY.length].b}
              </h2>
              <div className="mt-3 flex items-center gap-3.5">
                <Link
                  to={browseHref(cat)}
                  className="bg-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-ink"
                >
                  Shop now
                </Link>
                <Link
                  to="/assistant"
                  className="border-b border-white/60 pb-0.5 text-[12.5px] font-semibold text-white"
                >
                  ✨ Let AI help me choose
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* One slide has nothing to page between, so the dots would be a single
          dead dot under the photograph. Not rendered rather than `hidden`:
          the row's own `flex` class beats the UA's `[hidden]{display:none}`. */}
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5 pb-0.5 pt-2">
          {slides.map((s, i) => (
            <span
              key={s}
              aria-hidden
              className="h-[5px] rounded-pill"
              style={{
                width: i === active ? 14 : 5,
                background: i === active ? "rgb(var(--persimmon))" : "#E3DCD3",
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The lead deal, capped at 1 : 1.25 (w : h).
 *
 * The cap is a padding-bottom sizer rather than `aspect-ratio`, and the reason
 * matters: this card is an `fr` grid item whose default `align-self: stretch`
 * competes with an aspect ratio for the block size. A percentage padding
 * resolves against the ALREADY-SIZED column, so it contributes a definite
 * height to row sizing — which is what makes the right-hand column stretch to
 * exactly this card's height instead of the other way round.
 */
function DealBig({ p }: { p: FeedProduct }) {
  return (
    <Link
      to={`/product/${p.id}`}
      className="relative block overflow-hidden rounded-[12px] bg-white"
    >
      <span aria-hidden className="block w-full pb-[125%]" />
      <span className="absolute inset-0 flex flex-col">
        <Flag pct={off(p)} />
        {/* The photo is taken OUT OF FLOW. `h-full` on an in-flow image is
            indefinite, so the image falls back to its intrinsic height and
            becomes the card's max-content contribution — which is how a tall
            scarf photograph used to set the height of this whole row. */}
        <span className="relative min-h-0 flex-1 overflow-hidden bg-[#EFEBE5]">
          <Img src={photoOf(p)} className="absolute inset-0 h-full w-full object-cover" />
        </span>
        <span className="block px-2.5 pb-3 pt-2">
          <span className="line-clamp-2 block h-[30px] text-[12.5px] leading-tight text-ink">
            {p.title}
          </span>
          <span className="block text-[17px] font-extrabold text-persimmon">
            {formatMoney(p.price)}
            <s className="ml-1.5 text-[12px] font-normal text-muted">
              {formatMoney(p.compare_at_price!)}
            </s>
          </span>
        </span>
      </span>
    </Link>
  );
}

function DealSmall({ p }: { p: FeedProduct }) {
  return (
    <Link to={`/product/${p.id}`} className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-white">
      <Flag pct={off(p)} />
      {/* Out of flow, for the reason spelled out in DealBig: an in-flow
          `h-full` image contributes its intrinsic height, and two of them
          stacked here were setting the height of the big card beside them. */}
      <span className="relative min-h-0 flex-1 overflow-hidden bg-[#EFEBE5]">
        <Img src={photoOf(p)} className="absolute inset-0 h-full w-full object-cover" />
      </span>
      <span className="block px-2.5 pb-2 pt-1.5">
        <span className="block text-[14px] font-extrabold text-persimmon">
          {formatMoney(p.price)}
          <s className="ml-1 text-[10.5px] font-normal text-muted">
            {formatMoney(p.compare_at_price!)}
          </s>
        </span>
      </span>
    </Link>
  );
}

/** Square on two corners, rounded bottom-right — a corner flag, not a pill. */
function Flag({ pct }: { pct: number }) {
  if (!pct) return null;
  return (
    <span className="absolute left-0 top-0 z-[3] rounded-br-[10px] bg-persimmon px-2.5 py-1.5 text-[11.5px] font-extrabold leading-none text-white">
      -{pct}%
    </span>
  );
}

/** MIN 4: a rail shorter than the screen is a row with a gap on the right. */
const MIN_STRIP = 4;

function Strip({
  title,
  products,
  seeAll,
}: {
  title: string;
  products: FeedProduct[];
  seeAll: string;
}) {
  if (products.length < MIN_STRIP) return null;
  return (
    <section className="pt-5">
      <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-3">
        <h2 className="text-[16px] font-bold tracking-[-0.2px] text-persimmon">{title}</h2>
        <Link to={seeAll} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
          See all
        </Link>
      </div>
      <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
        {products.slice(0, 10).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="w-[134px] shrink-0">
            <span className="relative block aspect-[1/1.2] overflow-hidden rounded-[10px] bg-[#F0ECE6]">
              <Img src={photoOf(p)} className="h-full w-full object-cover" />
              {off(p) ? (
                <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-persimmon px-1.5 py-0.5 text-[10px] font-bold text-white">
                  -{off(p)}%
                </span>
              ) : null}
            </span>
            <span className="mt-1.5 line-clamp-2 block h-[30px] text-[12.5px] leading-tight text-ink">
              {p.title}
            </span>
            <span className="block text-[14px] font-extrabold text-ink">
              {formatMoney(p.price)}
              {off(p) ? (
                <s className="ml-1.5 text-[11px] font-normal text-muted">
                  {formatMoney(p.compare_at_price!)}
                </s>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
