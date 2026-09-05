import { useEffect, useMemo, useState } from "react";
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
import { productImageUrl } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { circleArt, heroArt, typeTileArt } from "../../../lib/tabArt";
import { UNDER_TILE_MAX, type TileId } from "../../../lib/facets";
import { inBudgetRange, type Budget } from "../../../lib/filters";
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

/** The "Shop for" order, by subcategory slug. See `circles` below. */
/**
 * "Shop for" is DEPARTMENTS only now — who you are shopping for.
 *
 * Bags, Caps, Belts and Scarves were here too, which made the row a mix of two
 * different questions: who is it for, and what is it. They moved to the type
 * row below, where the second question is asked properly.
 */
const CIRCLE_ORDER = ["men", "women", "kids-fashion"];

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
/**
 * THE FOUR QUICK CARDS ARE WHITE, and that is the point.
 *
 * They were four pastel grounds — green, pink, blue, amber. Under the colour
 * system exactly ONE row per page may be colourful, and on a category tab that
 * row is "Gift for…" above. Two colourful rows and the page is a patchwork
 * again, which is the thing being fixed.
 *
 * So these carry a photo thumbnail and a hairline instead. The photograph is
 * where their colour comes from now, which is the rule for the whole app.
 */

/**
 * The band the "Under $75" banner counts and the results page filters by.
 *
 * Built from UNDER_TILE_MAX so the label, the count and the destination can
 * never name different numbers, and passed through `inBudgetRange` so the
 * count uses the SAME predicate the results page applies — written twice they
 * drift, and a banner reading "12 under 75" that opens a page showing 11 is
 * the kind of small lie that costs trust.
 *
 * `max` is EXCLUSIVE in `inBudgetRange`, so a product at exactly $75 is not
 * under $75. That is the reading a shopper expects and the one the results
 * page already used.
 */
const UNDER_BAND: Budget = {
  slug: `under-${UNDER_TILE_MAX}`,
  label: `Under $${UNDER_TILE_MAX}`,
  min: 0,
  max: UNDER_TILE_MAX,
};

const TYPE_TILES: { key: string; label: string; kind: "type" | "tile" }[] = [
  { key: "tops", label: "Tops", kind: "tile" },
  { key: "bottoms", label: "Bottoms", kind: "tile" },
  { key: "sets", label: "Sets", kind: "tile" },
  { key: "caps", label: "Caps", kind: "type" },
  { key: "bags", label: "Bags", kind: "type" },
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
        // The boutique/brand axis. It is a column on `partners`, not a guess
        // made from the name — see `brandRail` below for what reads it.
        local: s.is_lebanese_brand === true,
      })),
    [directory.data, all, category?.id]
  );

  /**
   * THE RAIL'S ORDER, laid out so each COLUMN is a pair of like shops.
   *
   * The rail is a two-row grid with `grid-auto-flow: column`, so it fills
   * top-then-bottom of one column before starting the next. That means the
   * flat array here IS the column layout: two local boutiques, then two
   * brands, then two boutiques, and so on.
   *
   * Both lists arrive already sorted — `categoryStores` orders by
   * `display_rank` (migration 0096), the same field the /stores directory
   * behind "See all" uses — so "most popular first" needs no second sort and
   * no name list. Whichever kind runs out first, the other simply continues
   * to the end rather than leaving gaps mid-rail.
   */
  const brandRail = useMemo(() => {
    const local = stores.filter((s) => s.local);
    const brands = stores.filter((s) => !s.local);
    const out: typeof stores = [];
    let i = 0;
    let j = 0;
    // Alternate PAIRS, not singles: a column is two tiles, and taking one
    // from each list in turn would pair a boutique with a brand in every
    // column instead of pairing like with like.
    while (i < local.length || j < brands.length) {
      out.push(...local.slice(i, i + 2));
      i += 2;
      out.push(...brands.slice(j, j + 2));
      j += 2;
    }
    return out;
  }, [stores]);

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

  /**
   * NO PRODUCT APPEARS TWICE ON THIS PAGE.
   *
   * Every rail was drawing from the same 22 products by its own rule, so the
   * Merino Crewneck could be a Super Deal, a Best pick, an Under $50 tile AND
   * a grid card on one screen. That does not read as a well-stocked shop; it
   * reads as a shop with four products.
   *
   * Claim order is the brief's, and it is a priority order rather than a
   * layout order: Super deals first because a discount is the strongest
   * reason to look, then Best picks, then the two collection cards, and the
   * grid takes whatever is left. A rail left with fewer than three unique
   * products is HIDDEN rather than padded — a half-empty rail is worse than
   * no rail, and inventing a filler product is the one thing never allowed
   * here.
   *
   * The grid is deliberately exempt from the three-minimum: it is the
   * catalogue, not a rail, and it is allowed to be short.
   */
  const MIN_RAIL = 3;

  const claimed = useMemo(() => {
    const taken = new Set<string>();
    const take = (list: FeedProduct[], n: number) => {
      const out = list.filter((p) => !taken.has(p.id)).slice(0, n);
      for (const p of out) taken.add(p.id);
      return out;
    };

    const dealRow = take(deals, 3);

    /*
     * THE THREE COLLECTION CARDS CLAIM BEFORE BEST PICKS, and that ordering is
     * the whole reason the row has three cards in it.
     *
     * Best picks used to take ten products off a nineteen-product catalogue
     * before these were built, which left under $50 and New arrivals with
     * fewer than the two photographs a card needs — so both hid, and the row
     * that is meant to be a set of three showed one card.
     *
     * A card is not a rail. It needs exactly two products and it stands for a
     * whole destination — every product under fifty dollars, everything that
     * landed this month — while Best picks is one swipe row that reads
     * perfectly well at six. Six is what it gets, and the grid still keeps
     * what nothing else claimed.
     */
    const under50 = take(
      all.filter((p) => Number(p.price) < 50),
      2
    );
    const top = take(bestPicks, 2);
    /* The newest two, and "newest" is the product's own created_at inside the
       same 30-day window the New in tile counts — not a hand-picked pair. */
    const newest = take(
      [...all]
        .filter((p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      2
    );

    const picks = take(bestPicks, 6);
    return { dealRow, picks, under50, top, newest, taken };
  }, [deals, bestPicks, all]);

  const collections = useMemo<CollectionCard[]>(() => {
    const out: CollectionCard[] = [];
    if (claimed.under50.length === 2) {
      out.push({
        key: "under-50",
        title: "Under $50",
        href: browseHref(slug, { price: ["under-50"] }),
        items: claimed.under50.map((p) => ({
          photo: photoOf(p),
          price: Number(p.price),
          note: off(p) ? `-${off(p)}%` : "",
        })),
      });
    }
    if (claimed.top.length === 2) {
      out.push({
        key: "top-ranking",
        title: "Top ranking",
        href: browseHref(slug, { tile: "most-gifted" }),
        // "#1" and "#2" are positions in THIS list, which is a real ordering of
        // real order counts — not a rank invented for the card.
        items: claimed.top.map((p, i) => ({
          photo: photoOf(p),
          price: Number(p.price),
          note: `#${i + 1}`,
        })),
      });
    }
    if (claimed.newest.length === 2) {
      out.push({
        key: "new-arrivals",
        title: "New arrivals",
        href: browseHref(slug, { tile: "new-in" }),
        items: claimed.newest.map((p) => ({
          photo: photoOf(p),
          price: Number(p.price),
          note: "New",
        })),
      });
    }
    return out;
  }, [claimed, slug]);

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

  /*
   * `inBudgetRange` rather than a bare `< 75`, so the number under the banner
   * is produced by the SAME predicate the results page filters with. Written
   * twice they drift, and a banner reading "12 under 75" that opens a page
   * showing 11 is the kind of small lie that costs trust.
   *
   * The upper bound is exclusive: a product priced at exactly $75 is not
   * under $75.
   */
  const underPool = all.filter((p) => inBudgetRange(Number(p.price), UNDER_BAND));
  /*
   * FOURTEEN DAYS, not thirty. "Just landed" has to mean recently, and on a
   * catalogue seeded in one sitting a thirty-day window counts the entire
   * shop — a number that is technically true and tells the shopper nothing.
   */
  const newest14 = all.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 14 * 86400000
  );

  /*
   * NO CAP ON THE RAIL any more.
   *
   * The row showed the top eight because eight was what fitted in a static
   * four-by-two grid. A rail that scrolls has no such ceiling, and truncating
   * it now would hide shops for a reason that stopped being true the moment
   * the grid became a carousel. The count in "See all" already speaks for the
   * whole directory, and it now matches what the rail itself holds.
   */
  /* 64px discs on a rail that PEEKS: the next circle is deliberately part
     visible at the right edge, which is the only honest way to say "this
     scrolls". A row that ends flush looks complete and never gets dragged. */
  const storeCircleW = "64px";

  /*
   * THE FOUR COLOUR TILES.
   *
   * These replaced four full-width photo banners, and the reason is worth
   * keeping: the banners were stock models on studio grounds, and four of
   * them stacked made the top of the tab look like a lookbook rather than a
   * shop. A flat colour with the shop's OWN product in the corner says the
   * same thing in a quarter of the height, and the product is real stock.
   *
   * NO COUNTS IN THE COPY. "4 just landed" is a number that changes hourly,
   * ages badly in a screenshot, and tells a shopper nothing they can act on.
   * The subtitles are fixed strings.
   *
   * A TILE NEVER OPENS AN EMPTY GRID. Fewer than two products in a collection
   * and the tile is not rendered at all — see `show` below — which is the same
   * rule every other rail on this page follows.
   */
  const tileDefs: {
    id: TileId;
    label: string;
    subtitle: string;
    fill: string;
    well: string;
    labelColor: string;
    subColor: string;
    pool: FeedProduct[];
  }[] = [
    {
      id: "new-in",
      label: "New in",
      subtitle: "Just landed this week",
      fill: "#FAECE7",
      well: "#F0997B",
      labelColor: "#712B13",
      subColor: "#993C1D",
      pool: newest14,
    },
    {
      /*
       * THE HONEST FALLBACK, and `best-picks` rather than `store-picks`.
       *
       * `most-gifted` ranks by delivered orders. With no order history there
       * is no ranking to show, so the tile has to point somewhere that does
       * not claim one. `store-picks` was the obvious candidate and it is the
       * wrong one — measured, it returns ZERO Fashion products, because
       * nothing in the category carries the is_pick flag, and a tile that
       * opens an empty grid is the one outcome this page forbids outright.
       *
       * `best-picks` returns all 22 and titles the page "Best picks", which
       * claims curation rather than popularity. The tile's own label stays
       * "Most gifted" either way.
       */
      id: sections.bestSellersAreReal ? "most-gifted" : "best-picks",
      label: "Most gifted",
      subtitle: "What people send",
      fill: "#FAEEDA",
      well: "#FAC775",
      labelColor: "#633806",
      subColor: "#854F0B",
      pool: sections.bestSellers.length ? sections.bestSellers : all,
    },
    {
      id: "under-75",
      label: `Under $${UNDER_TILE_MAX}`,
      subtitle: "Good gifts, small price",
      fill: "#E1F5EE",
      well: "#9FE1CB",
      labelColor: "#085041",
      subColor: "#0F6E56",
      pool: underPool,
    },
    {
      id: "deals",
      label: "Deals",
      subtitle: "This week's discounts",
      fill: "#F94E33",
      // The one tile whose fill IS the accent, so its well is white and its
      // type is white — there is no darker persimmon that stays legible on
      // persimmon.
      well: "#FFFFFF",
      labelColor: "#FFFFFF",
      subColor: "#FFE1DA",
      pool: deals,
    },
  ];

  /*
   * Each tile carries a REAL PRODUCT from its own collection — the newest one
   * that has a photograph. Not a stock image and not a letter: a Deals tile
   * showing something that is not discounted is a small lie, and this is the
   * cheapest possible way to avoid telling it.
   */
  const tilePhotosUsed = new Set<string>();
  const tiles = tileDefs
    .map((t) => {
      const byNewest = [...t.pool].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
      /*
       * NO TWO TILES SHOW THE SAME PRODUCT. The collections overlap by
       * design — a new arrival is often also a best pick — so taking "newest
       * with a photo" independently put the identical scarf in New in and in
       * Most gifted, side by side, which reads as a rendering bug rather than
       * as two collections. Each tile takes the newest photo no tile above it
       * has claimed, and only falls back to a repeat if that would otherwise
       * leave it blank.
       */
      const fresh = byNewest.find((p) => {
        const photo = photoOf(p);
        return photo && !tilePhotosUsed.has(photo);
      });
      const chosen = fresh ?? byNewest.find((p) => photoOf(p));
      const photo = chosen ? photoOf(chosen) : null;
      if (photo) tilePhotosUsed.add(photo);
      return { ...t, photo };
    })
    // Two is the floor: one product behind a tile is a collection in name
    // only, and the grid reflows to 3 / 2 / 0 tiles on its own below.
    .filter((t) => t.pool.length >= 2 && t.photo);

  return (
    <div className="bg-white">
      <Hero cat={slug} />

      {/* 2 — POPULAR BRANDS: one rail, two rows, everything in the category.
          Not rendered at all with nothing to show: a heading and a "See all 0"
          over an empty rail is worse than the section being absent, and it is
          a state the tab really can reach — the directory query is a single
          request that can fail. */}
      {brandRail.length > 0 ? (
      <section className="pt-4">
        {/* The padding is on the header row and on the rail SEPARATELY, not on
            the section: the rail has to be able to run its last column off the
            right edge, and a padded section would stop it short of the screen
            and kill the peek that says it scrolls. */}
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-3">
          <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Popular brands</h2>
          <Link to={`/stores/${slug}`} className="shrink-0 text-[15px] font-semibold text-ink">
            See all {stores.length}
          </Link>
        </div>
        {/* No line of copy between the heading and the tiles. "Shop Lebanon's
            boutiques and brands in one order" was explaining a distinction the
            row no longer draws — the two kinds are interleaved into one rail
            now, and a caption naming them put a label on something the shopper
            is not being asked to choose between. */}
        <div className="rail-2row" style={{ ["--row-gap" as string]: "14px" }}>
          {brandRail.map((s) => (
            <Link
              key={s.id}
              to={storePath({ slug: s.slug })}
              style={{ width: storeCircleW }}
              className="card-press shrink-0 text-center"
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

      {/* 3 — Shop for. ON WHITE. It was on the grey band, which put a tint
          behind three circular photographs whose own edges already separate
          them from the section above — the band was doing a job the shapes
          were already doing, and it made the tab's first content block look
          like an aside. */}
      {circles.length ? (
        <section className="mt-5 bg-white pb-5 pt-5">
          <h2 className="px-[var(--page-x)] pb-3 text-[22px] font-bold tracking-[-0.01em] text-ink">
            Shop for
          </h2>
          {/* FOUR ACROSS, WRAPPING — not a swipe row. Seven values fit in two
              rows at 375px, and a row you have to drag hides half of what the
              tab sells behind a gesture nobody is told about. The last row is
              left-aligned rather than centred so the columns line up with the
              row above it. */}
          {/* THREE, sat across the row rather than bunching left.
              104px discs, up from 80. At three across on a 375px screen the
              row was mostly gutter and the department photographs — the one
              place a face or a whole outfit has to read — were the smallest
              pictures on the tab. 104 fills the row without touching the type
              tiles below, which stay the larger element. */}
          <div className="flex justify-evenly gap-x-2 px-[var(--page-x)]">
            {circles.map((c) => (
              <Link
                key={c.slug}
                to={browseHref(slug, { type: [c.slug] })}
                style={{ width: 104 }}
                className="min-w-0 text-center transition-transform duration-press ease-out active:scale-[0.96]"
              >
                <span
                  className="block aspect-square w-full overflow-hidden rounded-pill bg-photo-bed"
                  style={{ boxShadow: "0 0 0 1px rgb(var(--line))" }}
                >
                  {c.photo ? <Img src={c.photo} className="h-full w-full object-cover" /> : null}
                </span>
                <span
                  className="mt-2 block truncate text-[12px] font-semibold"
                  style={{ color: "rgb(var(--ink))" }}
                >
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* NO COLOURFUL TILE SET ON THIS TAB. The "one per page" rule caps how
          many a page may have; it does not oblige a page to have one. A
          category tab sells departments and product types, and a second row of
          the same seven recipients the All tab already carries added a colour
          block here for no new destination. */}

      {/* 4b — THE FOUR COLOUR TILES, two across.
          They were four full-width photo banners of stock models on studio
          grounds, which made the top of the tab read as a lookbook rather
          than a shop. A flat colour with the shop's own product tucked into
          the corner says the same thing in a quarter of the height, and the
          product in it is real stock.

          THE LAST TILE SPANS when there are three: an odd tile left hanging
          in a two-column grid reads as one that failed to load, and a
          collection is hidden here only when it genuinely has nothing. */}
      {tiles.length >= 2 ? (
        <section className="mt-4 grid grid-cols-2 gap-2.5 px-[var(--page-x)]">
          {tiles.map((t, i) => (
            <Link
              key={t.id}
              to={browseHref(slug, { tile: t.id })}
              className={`card-press relative block h-[104px] overflow-hidden rounded-[12px] p-3 ${
                tiles.length === 3 && i === 2 ? "col-span-2" : ""
              }`}
              style={{ background: t.fill }}
            >
              <span
                className="block pr-[58px] text-[15px] font-semibold leading-tight"
                style={{ color: t.labelColor }}
              >
                {t.label}
              </span>
              <span
                className="mt-0.5 block pr-[58px] text-[12px] leading-tight"
                style={{ color: t.subColor }}
              >
                {t.subtitle}
              </span>

              {/* The arrow sits at the foot of the tile rather than beside the
                  label: level with the well, it reads as the pair of them
                  pointing at the same destination. */}
              <span
                aria-hidden
                className="absolute bottom-3 left-3 text-[16px] leading-none"
                style={{ color: t.labelColor }}
              >
                →
              </span>

              {/* THE WELL. A coloured box behind the cutout, so a product
                  photographed on white does not dissolve into a pale tile —
                  and so all four wells are the same shape whatever shape the
                  product is. */}
              <span
                className="absolute bottom-3 right-3 block h-[56px] w-[46px] overflow-hidden rounded-[8px]"
                style={{ background: t.well }}
              >
                <Img src={t.photo ?? ""} className="h-full w-full object-cover" />
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {/* 5 — Super deals: THE ONE COOL BLOCK on a warm page.
          Every other section here is white, persimmon or one of the four tile
          colours above. A pale blue band is the only thing on the tab that is
          not warm, which is what makes the deepest discounts in the shop stop
          the scroll without a second accent colour being invented for them.
          Exactly one block gets this; a second would cancel the first. */}
      {claimed.dealRow.length >= MIN_RAIL ? (
        <section className="mt-4 px-[var(--page-x)]">
          <div className="rounded-[12px] bg-deals-bg p-3">
            <div className="flex items-baseline justify-between gap-3 pb-3">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-deals-title">
                Super deals
              </h2>
              <Link
                to={browseHref(slug, { tile: "deals" })}
                className="text-[15px] font-medium text-deals-link"
              >
                See all
              </Link>
            </div>
            {/* The big card sets the row height (1 : 1.25) and the right-hand
                column stretches to it, so the two small cards stack to exactly
                the same total. Before this the big card had no cap and a tall
                scarf photograph made it a full screen high. */}
            <div className="grid grid-cols-[1.35fr_1fr] items-stretch gap-2.5">
              <DealBig p={claimed.dealRow[0]} />
              <div className="flex min-h-0 flex-col gap-2.5">
                <DealSmall p={claimed.dealRow[1]} />
                <DealSmall p={claimed.dealRow[2]} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 4 — "What are you looking for?", the same tall tile the four
          shortcuts used to be. Directly under the department circles, because
          it is the natural follow-on question. Seven of them, so this one IS a
          swipe row — four across would make each tile 88px wide. */}
      <section className="pt-5">
        <h2 className="px-[var(--page-x)] pb-3 text-[22px] font-bold tracking-[-0.01em] text-ink">
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
              className="relative block h-[196px] w-[148px] shrink-0 overflow-hidden rounded-[12px] bg-page transition-transform duration-press ease-out active:scale-[0.97]"
            >
              <Img
                src={typeTileArt(slug, t.key) ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 z-[1]"
                /* The accent, not black: the type row is the tab’s own shelf,
                   and a black scrim on every tab made all eleven look alike. */
                style={{ background: "linear-gradient(to top, rgba(0,0,0,.66) 0%, transparent 62%)" }}
              />
              <span className="absolute bottom-[12px] left-[12px] right-[12px] z-[2] text-[15px] font-semibold leading-tight text-white">
                {t.label}
              </span>
            </Link>
          ))}
        </div>
      </section>


      {/* 6 — one swipe row. "New arrivals" was deleted from this tab: it and
          Best picks were two rows of the same shape doing the same job, and
          the new-in tile above already leads to everything recent. */}
      {/* Best picks sits on WHITE — the section above it is now the deals
          band, and a second band straight after it would fight for the eye
          the first one just won. */}
      <div className="mt-5 pb-5" style={{ background: "rgb(var(--page))" }}>
        <Strip
          title="Best picks"
          products={claimed.picks}
          seeAll={browseHref(slug, { tile: "most-gifted" })}
        />
      </div>

      {/* 7 — the two collection cards, side by side, immediately above the
          grid they introduce. They used to be the first two items INSIDE the
          staggered grid, which put them in a column flow that could stack them
          one above the other and made them read as two unusually smart product
          cards rather than as a pair. */}
      {collections.length ? (
        <section className="mt-5 pb-5 pt-5" style={{ background: "rgb(var(--page))" }}>
          {/* A ROW, not a 2-up grid. There are three of these now — Under $50,
              Top ranking and New arrivals — and in a two-column grid the third
              lands underneath the first at half width, which reads as a card
              that fell off rather than a set. Side by side at one fixed width
              they stay a set, and the third peeks at the right edge to say the
              row drags. */}
          <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
            {collections.map((c) => (
              <div key={c.key} className="w-[158px] shrink-0">
                <CollectionTile card={c} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 8 — the staggered grid, directly beneath them. */}
      <section className="pt-4">
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-2">
          <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">All {categoryName.toLowerCase()}</h2>
          <Link to={browseHref(slug)} className="shrink-0 text-[15px] font-semibold text-ink">
            See all {all.length} →
          </Link>
        </div>
        {/* Whatever the rails above did not claim. The count in "See all"
            still speaks for the whole category, because that is what the
            results page behind it shows. */}
        <StaggeredGrid products={all.filter((p) => !claimed.taken.has(p.id))} tone="fashion" />
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

  const COPY = [
    { a: "Dressed for", b: "the occasion" },
    { a: "Something he", b: "will actually wear" },
    { a: "New season,", b: "new wardrobe" },
  ];

  /*
   * A CROSSFADE, NOT A SWIPE RAIL.
   *
   * The hero used to be a horizontal scroller: it only moved if you dragged
   * it, so most people saw slide one and never learned the other two existed.
   * Now it fades on its own every five seconds — and only when there is more
   * than one slide, because a lone banner animating to itself is a repaint
   * nobody asked for.
   *
   * Stacked and opacity-crossfaded rather than translated: a transform on an
   * ancestor breaks position:fixed for every descendant, which is a trap this
   * codebase has already been caught by once.
   */
  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      5000
    );
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section>
      <div className="relative h-[200px] w-full overflow-hidden bg-[#8E8474]">
        {slides.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: i === active ? 1 : 0 }}
            aria-hidden={i !== active}
          >
            <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
            {/* Bottom-up scrim, per the brief. Deep enough at the foot to hold
                white type over any photograph, gone by two-thirds up so the
                picture is still a picture. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.22) 45%, transparent 78%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 px-[18px] pb-4">
              <h2 className="max-w-[240px] text-[25px] font-bold leading-[1.1] tracking-[-0.4px] text-white">
                {COPY[i % COPY.length].a}
                <br />
                {COPY[i % COPY.length].b}
              </h2>
              <div className="mt-3 flex items-center gap-3.5">
                <Link
                  to={browseHref(cat)}
                  className="card-press bg-coral px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-white"
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
          the row own `flex` class beats the UA `[hidden]{display:none}`. */}
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5 pb-0.5 pt-2">
          {slides.map((sl, i) => (
            <button
              key={sl}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className="h-[5px] rounded-pill transition-all duration-300"
              style={{
                width: i === active ? 14 : 5,
                background: i === active ? "rgb(var(--coral))" : "#E3DCD3",
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
        <span className="relative min-h-0 flex-1 overflow-hidden bg-page">
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
      <span className="relative min-h-0 flex-1 overflow-hidden bg-page">
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
const MIN_STRIP = 3; // the brief’s floor: fewer than three unique products and the rail is hidden

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
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        <Link to={seeAll} className="shrink-0 text-[15px] font-semibold text-ink">
          See all
        </Link>
      </div>
      <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
        {products.slice(0, 10).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="card-press w-[134px] shrink-0">
            <span className="photo-4x5 relative block rounded-[16px]">
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
            {/* Regular prices are ink; a SALE price is coral with the old one
                struck through beside it. The colour is the discount signal, so
                a full-price product must never wear it. */}
            <span className={`block text-[14px] font-extrabold ${off(p) ? "text-accent" : "text-ink"}`}>
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
