import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { TabHero } from "./TabHero";
import { TallTiles, type ResolvedTile } from "./TallTiles";
import {
  OccasionChips,
  ProductStrip,
  StoresRow,
  SubcategoryCircles,
  SuperDeals,
  TabGrid,
  TabSectionHead,
  primaryPhoto,
  type CircleItem,
  type StoreItem,
} from "./CategorySections";
import { themeFor, type CategoryTile } from "../../../lib/categoryTheme";
import { browseHref } from "../../../lib/browseParams";
import { RECIPIENTS, priceTierId, type TileId } from "../../../lib/facets";
import { categoryTileArt, recipientArt, tileArt } from "../../../lib/tabArt";
import { useHomeSignals } from "../../../hooks/useHomeEndless";
import { FilterGridSection, useTabFilters, type TabFilters } from "./FilterableGrid";
import { AiLine } from "./AiLine";
import type { BrowseState, Lookup } from "../../../lib/browseParams";
import { TabTemplate } from "./TabTemplate";
import { FlowersTab } from "./FlowersTab";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * ONE category tab.
 *
 * Section order, and nothing else on the page:
 *   1 hero · 2 gift for… · 3 entry tiles · 4 shop by category ·
 *   5 stores · 6 super deals · 7 new arrivals · 8 best sellers ·
 *   9 ready to gift · 10 occasions · 11 the grid
 *
 * A section with nothing real behind it renders NOTHING. The page gets
 * shorter, never padded.
 *
 * Everything is derived from this category's real products, so a tab is
 * correct the moment a product moves into it — there is no editor row to keep
 * in step and nothing to seed.
 *
 * EVERY FILTERED ENTRY POINT — a tile, a circle, an occasion chip, the deals
 * "See all" — sets the SAME filter object the sheet edits. That is what makes
 * them combine instead of replacing each other.
 */
/**
 * Tabs already moved to the new template.
 *
 * Fashion is the rollout tab: it is the one being reviewed, and the other ten
 * are deliberately left on the old layout until it is signed off. Adding a
 * slug here is the whole migration — there is no per-tab code below it.
 */
const REBUILT = new Set(["fashion"]);

/**
 * Tabs whose bottom grid is the filtered one rather than a plain shelf.
 *
 * Flowers keeps its whole existing layout — hero, circles, tiles, stores,
 * strips — and swaps only the "All flowers" section at the bottom for the
 * filter bar and grid. Everything above it now applies its filter to that grid
 * and scrolls down to it instead of navigating away.
 */
const FILTERED_GRID = new Set<string>([]);

/**
 * The Flowers rose, for the one element the brief asks to carry it.
 *
 * Tab accents were removed app-wide when persimmon became the single accent —
 * a page of eleven differently-coloured tabs read as eleven products. This is
 * the one exception, on instruction, and it is scoped to the AI line.
 */
const ROSE = "201 106 130";

export function CategoryTab({ tab }: { tab: BrowseTab }) {
  const slug = tab.filter.category_slug ?? "";
  if (slug === "flowers-gifts") return <FlowersTab tab={tab} />;
  if (REBUILT.has(slug)) return <TabTemplate tab={tab} />;
  return <LegacyCategoryTab tab={tab} />;
}

function LegacyCategoryTab({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug;
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryId = category?.id;
  const categoryName = category?.name ?? "";
  const theme = themeFor(slug);

  const sections = useTabSections(categoryId);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();

  const cat = slug ?? "";

  const subcategories = useMemo(
    () => (subcategoriesQuery.data ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    [subcategoriesQuery.data]
  );

  /**
   * ONE PHOTO ALLOCATOR FOR THE WHOLE PAGE.
   *
   * The hero, the five tall tiles and the shop-by-category circles all want
   * "a real product photo that matches this label", and left to themselves
   * they each pick the best-looking product in the category — which is the
   * same one. The page then shows the same necklace three times in its first
   * screen and reads as a placeholder mock-up.
   *
   * So the slots are filled IN ORDER from one shared pool, each taking the
   * first matching photo nobody above it has used. A slot that cannot find an
   * unused matching photo gets null and renders its neutral mark rather than
   * borrowing a picture of something else.
   */
  const art = useMemo(() => {
    const used = new Set<string>();

    /**
     * Unique first; a correct repeat before a blank.
     *
     * The rule is no photo twice on a page, and on most tabs that holds. It
     * cannot hold on the thin ones: Perfume has SEVEN products, every product
     * has exactly one image, and the page has nine decorative slots — one
     * hero, three circles, five tiles. Two of them are going to want a photo
     * that does not exist.
     *
     * Faced with that, showing the same correct photo in a small circle and
     * on a tile is a much smaller cost than two blank diamonds in a row of
     * five. So: take an unused photo if there is one; otherwise take a photo
     * that still MATCHES the label even though a slot above used it; only
     * return null — and get the neutral mark — when nothing matches at all.
     *
     * `row` keeps a repeat out of the row it would be most obvious in: a
     * photo is never used twice inside the tiles, or twice inside the
     * circles, only across two different sections.
     *
     * The real fix is more product photography, not more code.
     */
    const perRow = new Map<string, Set<string>>();
    const take = (pool: FeedProduct[], row = "page"): string | null => {
      const inRow = perRow.get(row) ?? new Set<string>();
      perRow.set(row, inRow);

      let fallback: string | null = null;
      for (const p of pool) {
        const photo = primaryPhoto(p);
        if (!photo || inRow.has(photo)) continue;
        if (!used.has(photo)) {
          used.add(photo);
          inRow.add(photo);
          return photo;
        }
        if (!fallback) fallback = photo;
      }
      if (fallback) inRow.add(fallback);
      return fallback;
    };

    const all = sections.all;
    /*
     * 1 — THREE HERO SLIDES, and they go first because they take the best
     * photographs. Slide 1 sells the category; slides 2 and 3 each carry a
     * real product and its real price.
     */
    const named = theme.heroProduct ? all.filter((p) => p.slug === theme.heroProduct) : [];
    const heroPool = named.length
      ? [...named, ...all.filter((p) => p.slug !== theme.heroProduct)]
      : [...all].sort((a, b) => Number(!!b.is_pick) - Number(!!a.is_pick));
    /*
     * PHOTOGRAPHS ONLY. The hero used to carry a headline and a price per
     * slide — slide 2 sold a product, slide 3 another — which meant three
     * different sets of words fading over each other while the title above
     * them stayed put. The shared hero shows one title over a crossfade, so
     * all this has to produce now is up to three pictures.
     */
    const heroSlides: string[] = [];
    for (let i = 0; i < 3; i++) {
      const photo = take(heroPool, "hero");
      if (!photo) break;
      heroSlides.push(photo);
    }

    /*
     * 2 — THE CIRCLES GO BEFORE THE TILES, and the order is the point.
     *
     * A "Rings" circle can only ever use a photo of a ring: its pool is
     * whatever is in that subcategory, often two or three items. A "For him"
     * tile can use any of a dozen. Filling the wide pools first starves the
     * narrow ones — Watches ended up with the neutral mark while a real watch
     * photo sat on a tile that had ten other options. Narrowest first.
     */
    const circles: CircleItem[] = [];
    for (const s of subcategories) {
      const pool = all.filter((p) => p.subcategory_id === s.id);
      // One product is enough for a circle: it is a shortcut into the grid,
      // not a claim about depth.
      if (pool.length === 0) continue;
      circles.push({ id: s.id, slug: s.slug, name: s.name, photo: take(pool, "circles") });
    }

    /*
     * 3 — THE ENTRY TILES, and the set is now the same on every tab:
     * New in · Best sellers · Under $X · Ready to gift · Deals.
     *
     * They used to be chosen per category, so no two tabs offered the same
     * shortcuts and none of them was predictable. "Under $X" is the one that
     * varies, and it is computed from that category's real price spread, so
     * it can never open an empty grid. "Best sellers" becomes "Store picks"
     * where there is no order history to justify the claim.
     */
    const tier = sections.tier;
    /*
     * THE TAB'S OWN FIVE, out of its own theme.
     *
     * This was a hardcoded list — New in, Arrives today, Under $X, Gift
     * wrapped, Deals — built the same way on every tab, which is why eleven
     * categories all showed the same five tiles and `theme.tiles` was written,
     * maintained and never read. Jewelry's theme has said
     * "For her · For him · Best sellers · Under $100 · New in" the whole time.
     *
     * It also fixes the photographs, and for a reason worth stating: a saved
     * view like "Arrives today" has no product that IS it, so it wears curated
     * art — which on the jewellery tab was a stock photo of a courier holding
     * a cardboard box. A recipient or a subcategory tile is different: it can
     * take a real photo from the very pool it opens, so "For her" is a
     * photograph of something actually tagged for her. The label and the
     * picture cannot disagree because they come from the same query.
     *
     * The generic list survives only as the fallback for a category nobody has
     * written a theme for yet.
     */
    const entryTiles: CategoryTile[] = theme.tiles.length
      ? theme.tiles
      : [
          { label: "New in", kind: { type: "new" } },
          { label: "Arrives today", kind: { type: "sameDay" } },
          ...(tier ? [{ label: tier.label, kind: { type: "price" as const, max: tier.max } }] : []),
          { label: "Gift wrapped", kind: { type: "giftWrap" } },
          { label: "Deals", kind: { type: "sale" } },
          ...(sections.bestSellersAreReal
            ? [{ label: "Best sellers", kind: { type: "picks" as const } }]
            : []),
          { label: "Ready to gift", kind: { type: "giftReady" } },
        ];
    // slug -> id, so a subcategory tile can match products without a second
    // pass over the subcategory list for every tile.
    const subBySlug = new Map(subcategories.map((x) => [x.slug, x.id]));

    const tiles: ResolvedTile[] = [];
    for (const t of entryTiles) {
      let pool: FeedProduct[] = [];
      let href = "";
      // The tile's own id, captured here rather than re-derived, so the
      // picture, the link and the saved view can never name different things.
      let tileId: TileId | null = null;
      // Switched on a local alias of the whole `kind`, not on `t.kind.type`.
      // TypeScript only narrows a discriminated union through a stable
      // reference; switching on the property path leaves each branch holding
      // the full union and `kind.max` stops existing.
      const kind = t.kind;
      switch (kind.type) {
        /*
         * THE TWO CASES THAT WERE MISSING, and their absence is why every
         * theme's first two tiles silently vanished: with no branch, `pool`
         * stayed empty and `href` stayed "", so the drop-if-empty guard below
         * threw them away before anything could render them.
         */
        case "recipient":
          pool = all.filter((p) => (p.recipient_tags ?? []).includes(kind.value));
          href = browseHref(cat, { for: [kind.value] });
          break;
        case "subcategory":
          pool = all.filter((p) => p.subcategory_id === subBySlug.get(kind.slug));
          href = browseHref(cat, { type: [kind.slug] });
          break;
        case "price":
          pool = all.filter((p) => p.price < kind.max);
          href = browseHref(cat, { price: [priceTierId(kind.max)] });
          break;
        case "new": {
          // The tile is a SAVED VIEW, so it must show what the view will show:
          // added in the last 30 days, not simply "the newest we have".
          const cutoff = Date.now() - 30 * 86400000;
          pool = all.filter((p) => new Date(p.created_at).getTime() >= cutoff);
          tileId = "new-in";
          break;
        }
        case "sameDay":
          pool = all.filter((p) => p.same_day === true);
          tileId = "arrives-today";
          break;
        case "giftWrap":
          pool = all.filter((p) => p.gift_wrap_available === true);
          tileId = "gift-wrapped";
          break;
        case "picks":
          pool = sections.bestSellers;
          tileId = sections.bestSellersAreReal ? "best-sellers" : "store-picks";
          break;
        case "giftReady":
          pool = sections.giftReady;
          tileId = "ready-to-gift";
          break;
        case "sale":
          pool = sections.deals;
          tileId = "deals";
          break;
        default:
          break;
      }
      if (tileId) href = browseHref(cat, { tile: tileId });
      // A tile with nothing behind it is dropped, not shown empty — and never
      // opens a results page with no results.
      if (pool.length === 0 || !href) continue;
      // CURATED ART, not a borrowed product photo. A tile names a view rather
      // than an object, so there is no product that "is" New in; the picture
      // has to be chosen. See lib/tabArt.ts.
      // The price tile is the one without a TileId — it is a price filter, not
      // a saved view — so it keeps a real photo of something inside the tier.
      tiles.push({
        label: t.label,
        photo: tileId ? tileArt(tileId) : take(pool, "tiles"),
        href,
      });
    }

    /*
     * The Gift for… row is curated too, and for the two reasons the brief
     * gives: "For Him" was picking a girls' t-shirt because that was the first
     * product tagged `him` in Fashion, and Perfume & Beauty had nothing tagged
     * `father` at all, so Dad rendered as an empty disc. A recipient is not a
     * thing in the catalogue, so nothing in the catalogue can stand for one.
     */
    const recipientPhoto = new Map<string, string | null>();
    for (const r of RECIPIENTS) recipientPhoto.set(r.value, recipientArt(r.value));

    return { heroSlides, tiles, circles, recipientPhoto };
  }, [sections.all, sections.bestSellers, sections.giftReady, sections.deals, subcategories, slug, theme]);

  /** The shops that actually stock this category, with their real artwork. */
  const stores = useMemo<StoreItem[]>(() => {
    const ids = new Set(sections.all.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo_url: s.logo_url,
        cover_image_url: s.cover_image_url,
      }));
  }, [directory.data, sections.all]);

  const signals = useHomeSignals();
  const filterLookup = useMemo<Lookup>(
    () => ({
      typeId: (s) => (subcategoriesQuery.data ?? []).find((x) => x.slug === s)?.id,
      storeId: (s) => (directory.data ?? []).find((x) => x.slug === s)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((x) => x.recentOrders > 0),
    }),
    [subcategoriesQuery.data, directory.data, signals.data]
  );

  /*
   * FLOWERS FILTERS ITS OWN GRID, using the same engine as Fashion.
   *
   * `useTabFilters` is the one filter implementation — same hook, same sheets,
   * same BrowseState — so a URL built here means what it means on Fashion. The
   * hook is called unconditionally because hooks must be; only the Flowers
   * branch renders anything with it.
   */
  const filters = useTabFilters({
    slug: cat,
    tabSlug: tab.slug,
    all: sections.all,
    subcategories: subcategories.map((s) => ({ slug: s.slug, name: s.name })),
    stores: stores.map((s) => ({ slug: s.slug ?? "", name: s.name.replace(/\[.*?\]\s*/g, "") })),
    lookup: filterLookup,
  });
  const filtered = FILTERED_GRID.has(cat);
  /*
   * ONE apply() FOR EVERY CONTROL ON THE PAGE.
   *
   * Hero SHOP NOW, the recipient circles, the category circles, the occasion
   * chips and the tiles all call this. It merges into the CURRENT selection
   * rather than replacing it, so tapping Birthday and then Roses leaves you
   * with both — which is the whole point of the chip row below.
   */
  const apply = filtered
    ? (patch: Record<string, unknown>) =>
        filters.push({ ...filters.state, ...(patch as Partial<BrowseState>) })
    : undefined;

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[260px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <Skeleton className="h-[172px] w-full rounded-[10px]" />
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
      {/* 1 — hero: three slides, full-bleed photography. */}
      {/* THE SHARED HERO. Three per-tab inputs and no more: photographs,
          title, destination. The accent no longer reaches it — an
          accent-tinted scrim made a green bouquet olive and a gold
          necklace brown, and every tab was a different height. */}
      <TabHero
        slides={art.heroSlides}
        title={theme.heroTitle}
        shopHref={browseHref(cat)}
        onShopAll={filtered ? () => filters.push(filters.state) : undefined}
      />

      {/*
        ONE spacing token between every section, top to bottom. Nothing below
        sets its own vertical margin, so the rhythm cannot drift section by
        section, and every section carries the same page gutter.
      */}
      <div className="space-y-6 px-[var(--page-x)] pt-5">
        {/* 1b — the gift finder, offered once, directly under the hero. */}
        {filtered ? <AiLine accent={ROSE} /> : null}

        {/* 2 — the entry tiles come STRAIGHT after the hero.
            "Gift for…" used to sit here: five flat circles reading Her, Him,
            Mom, Dad, Partner, directly above five photo tiles whose first two
            are For Her and For Him. Two rows asking the same question in the
            same screen, one of them without pictures. The tiles win — they
            carry a real photograph of the thing they lead to. */}

        {/*
          3 — entry tiles. On a tab that filters its own grid the tiles narrow
          it in place; everywhere else they still link to the results page.
        */}
        <TallTiles tiles={filtered ? flowerTiles(cat, filters) : art.tiles} theme={theme} />

        {/* 4 — shop by category */}
        <SubcategoryCircles circles={art.circles} theme={theme} cat={cat} apply={apply} />

        {/* 5 — super deals */}
        <SuperDeals sections={sections} theme={theme} cat={cat} />

        {/* 7 — new arrivals */}
        <ProductStrip
          title="New arrivals"
          products={sections.newArrivals}
          theme={theme}
          fullCards={filtered}
          seeAllHref={browseHref(cat, { tile: "new-in" })}
        />

        {/* 8 — best sellers, or store picks where there is no order history
            to justify the stronger claim. */}
        <ProductStrip
          title={sections.bestSellersAreReal ? "Best sellers" : "Store picks"}
          products={sections.bestSellers}
          theme={theme}
          seeAllHref={browseHref(cat, {
            tile: sections.bestSellersAreReal ? "best-sellers" : "store-picks",
          })}
        />

        {/* 9 — ready to gift */}
        <ProductStrip
          title="Ready to gift"
          products={sections.giftReady}
          theme={theme}
          seeAllHref={browseHref(cat, { tile: "ready-to-gift" })}
        />

        {/* 10 — occasion chips */}
        <OccasionChips sections={sections} theme={theme} cat={cat} apply={apply} />

        {/*
          11 — STORES, and they are the last section before the grid now.
          Mid-page they interrupted a run of product rows with a row of logos;
          at the bottom they read as "and here is who you would be buying
          from", which is the question a shopper has once they have seen the
          goods rather than before.
        */}
        <StoresRow
          categoryName={categoryName}
          stores={stores}
          theme={theme}
          cat={cat}
          swipe={filtered}
        />

        {/*
          11 — PURE BROWSE. No sort row, no filter button, no applied chips
          and no result count: all of that now lives on /browse, where a
          selection can be described, stacked and undone. What is left here
          is a plain look at the shelf, and one door to the filtered view.
        */}
        {filtered ? null : (
          <div>
            <TabSectionHead title={`All ${categoryName.toLowerCase()}`} theme={theme} />
            <TabGrid products={sections.all} />
            <Link
              to={browseHref(cat)}
              className="mt-4 flex min-h-[46px] w-full items-center justify-center rounded-pill border border-ink/[0.12] bg-canvas text-body font-semibold text-ink transition-transform duration-press ease-out active:scale-[0.99]"
            >
              See all {categoryName.toLowerCase()} gifts
            </Link>
          </div>
        )}
      </div>

      {/*
        The filtered grid sits OUTSIDE the padded column, because its sticky
        bar has to run the full width of the panel — a bar inset by the page
        gutter reads as a floating card rather than a toolbar.
      */}
      {filtered ? (
        <FilterGridSection
          filters={filters}
          heading={`All ${categoryName.toLowerCase()}`}
          subcategories={subcategories.map((s) => ({ slug: s.slug, name: s.name }))}
          stores={stores.map((s) => ({
            slug: s.slug ?? "",
            name: s.name.replace(/\[.*?\]\s*/g, ""),
          }))}
        />
      ) : null}
    </>
  );
}

/**
 * The Flowers tile row: Under $50 · Under $100 · Best picks · New in.
 *
 * Anniversary and Get Well used to sit here, directly under circles for the
 * same two occasions — the same control twice on one screen. These four are
 * things the circles above cannot say.
 *
 * Every one narrows the grid at the bottom of this page and scrolls to it. The
 * two price tiles go through the shared price tiers, which run on
 * `inBudgetRange()`; "Best picks" is the popularity view, which ranks on real
 * delivered orders and, with none yet, leaves the catalogue order alone rather
 * than inventing a score.
 */
function flowerTiles(cat: string, filters: TabFilters): ResolvedTile[] {
  const { state, push } = filters;
  const defs: { key: string; label: string; next: () => BrowseState }[] = [
    { key: "under-50", label: "Under $50", next: () => ({ ...state, price: ["under-50"] }) },
    { key: "under-100", label: "Under $100", next: () => ({ ...state, price: ["under-100"] }) },
    { key: "best-picks", label: "Best picks", next: () => ({ ...state, tile: "best-picks" }) },
    { key: "new-in", label: "New in", next: () => ({ ...state, tile: "new-in" }) },
  ];
  return defs.map((d) => ({
    label: d.label,
    photo: categoryTileArt(cat, d.key),
    onSelect: () => push(d.next()),
  }));
}
