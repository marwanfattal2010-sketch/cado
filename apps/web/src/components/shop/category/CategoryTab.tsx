import { useMemo, useRef, useState } from "react";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { TabFilterBar } from "./TabFilterBar";
import { CategoryHero, type HeroSlide } from "./CategoryHero";
import { TallTiles, type ResolvedTile } from "./TallTiles";
import {
  GIFT_FOR,
  GiftForRow,
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
import { filterForTile, themeFor, type CategoryTile } from "../../../lib/categoryTheme";
import { EMPTY_FILTER, applyFilter, sortProducts, type Sort, type TabFilter } from "../../../lib/tabFilter";
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
export function CategoryTab({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug;
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryId = category?.id;
  const categoryName = category?.name ?? "";
  const theme = themeFor(slug);

  const sections = useTabSections(categoryId);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();

  const [filter, setFilter] = useState<TabFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<Sort>("recommended");
  const gridRef = useRef<HTMLDivElement | null>(null);

  /**
   * Filtering from a tile scrolls to the grid, because otherwise the tap
   * appears to do nothing: the change is a screen and a half below the fold.
   * `smooth`, not `auto` — the movement IS the feedback.
   */
  const apply = (next: TabFilter, scroll = false) => {
    setFilter(next);
    if (!scroll) return;
    /*
     * Scrolled by hand rather than with `scrollIntoView` inside a
     * requestAnimationFrame. rAF does not fire in a hidden tab, and
     * `scrollIntoView` on an element inside a nested scroller also nudges
     * every ancestor scroller it can reach — including the pager, which
     * would drag the page sideways to a neighbouring tab. This moves exactly
     * one container: the panel the grid lives in.
     */
    const el = gridRef.current;
    const panel = el?.closest<HTMLElement>(".panel");
    if (!el || !panel) return;
    const top = el.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
    const target = Math.max(0, top - 8);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    panel.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });

    /*
     * The animation is not allowed to be the only thing that lands it.
     *
     * Smooth scrolling is a browser animation, and a browser does not run
     * animations in a hidden or backgrounded tab — tap a chip, switch apps,
     * come back, and the grid never moved. It can also be cancelled outright
     * by any scroll that happens while it is in flight. A short timer checks
     * whether we actually arrived and finishes the job if not, so tapping a
     * chip always ends with the grid on screen.
     */
    window.setTimeout(() => {
      if (Math.abs(panel.scrollTop - target) > 4) panel.scrollTop = target;
    }, 500);
  };

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
    const bySub = (subSlug: string) => {
      const id = subcategories.find((s) => s.slug === subSlug)?.id;
      return id ? all.filter((p) => p.subcategory_id === id) : [];
    };

    /*
     * 1 — THREE HERO SLIDES, and they go first because they take the best
     * photographs. Slide 1 sells the category; slides 2 and 3 each carry a
     * real product and its real price.
     */
    const named = theme.heroProduct ? all.filter((p) => p.slug === theme.heroProduct) : [];
    const heroPool = named.length
      ? [...named, ...all.filter((p) => p.slug !== theme.heroProduct)]
      : [...all].sort((a, b) => Number(!!b.is_pick) - Number(!!a.is_pick));
    const heroSlides: HeroSlide[] = [];
    for (let i = 0; i < 3; i++) {
      const photo = take(heroPool, "hero");
      if (!photo) break;
      const product = heroPool.find((x) => primaryPhoto(x) === photo);
      heroSlides.push(
        i === 0
          ? { key: "lead", photo, headline: theme.heroTitle, subline: theme.heroSubtitle }
          : {
              key: product?.id ?? String(i),
              photo,
              headline: product?.title ?? theme.heroTitle,
              subline: product?.partner?.name ?? theme.heroSubtitle,
              productId: product?.id,
              price: product?.price,
            }
      );
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
      circles.push({ id: s.id, name: s.name, photo: take(pool, "circles") });
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
    const entryTiles: CategoryTile[] = [
      { label: "New in", kind: { type: "new" } },
      {
        label: sections.bestSellersAreReal ? "Best sellers" : "Store picks",
        kind: { type: "picks" },
      },
      ...(tier ? [{ label: tier.label, kind: { type: "price" as const, max: tier.max } }] : []),
      { label: "Ready to gift", kind: { type: "giftReady" } },
      { label: "Deals", kind: { type: "sale" } },
    ];
    const tiles: ResolvedTile[] = [];
    for (const t of entryTiles) {
      let pool: FeedProduct[] = [];
      let subId: string | undefined;
      // Switched on a local alias of the whole `kind`, not on `t.kind.type`.
      // TypeScript only narrows a discriminated union through a stable
      // reference; switching on the property path leaves each branch holding
      // the full union and `kind.value` stops existing.
      const kind = t.kind;
      switch (kind.type) {
        case "recipient":
          pool = all.filter((p) => (p.recipient_tags ?? []).includes(kind.value));
          break;
        case "price":
          pool = all.filter((p) => p.price < kind.max);
          break;
        case "new":
          pool = all;
          break;
        case "picks":
          pool = sections.bestSellers.length ? sections.bestSellers : all;
          break;
        case "giftReady":
          pool = sections.giftReady;
          break;
        case "sale":
          pool = sections.deals;
          break;
        case "sameDay":
          pool = all.filter((p) => p.same_day === true);
          break;
        case "subcategory":
          subId = subcategories.find((x) => x.slug === kind.slug)?.id;
          pool = bySub(kind.slug);
          break;
      }
      // A tile with nothing behind it is dropped, not shown empty.
      if (pool.length === 0) continue;
      tiles.push({ label: t.label, photo: take(pool, "tiles"), apply: filterForTile(t.kind, subId) });
    }

    // A real product photo per recipient, for the Gift for… row.
    const recipientPhoto = new Map<string, string | null>();
    for (const r of GIFT_FOR) {
      const pool = all.filter((x) => (x.recipient_tags ?? []).includes(r.value));
      recipientPhoto.set(r.value, pool.length ? take(pool, "giftfor") : null);
    }

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

  const results = useMemo(
    () => sortProducts(applyFilter(sections.all, filter), sort),
    [sections.all, filter, sort]
  );

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
      <CategoryHero slides={art.heroSlides} onShopNow={() => apply(EMPTY_FILTER, true)} />

      {/*
        ONE spacing token between every section, top to bottom. Nothing below
        sets its own vertical margin, so the rhythm cannot drift section by
        section, and every section carries the same page gutter.
      */}
      <div className="space-y-6 px-[var(--page-x)] pt-5">
        {/* 2 — Gift for… */}
        <GiftForRow
          sections={sections}
          theme={theme}
          photoFor={(v) => art.recipientPhoto.get(v) ?? null}
          onFilter={apply}
        />

        {/* 3 — entry tiles */}
        <TallTiles tiles={art.tiles} onSelect={(f) => apply(f, true)} />

        {/* 4 — shop by category */}
        <SubcategoryCircles circles={art.circles} theme={theme} onFilter={apply} />

        {/* 5 — stores */}
        <StoresRow categoryName={categoryName} stores={stores} theme={theme} />

        {/* 6 — super deals */}
        <SuperDeals sections={sections} theme={theme} onFilter={apply} />

        {/* 7 — new arrivals */}
        <ProductStrip
          title="New arrivals"
          products={sections.newArrivals}
          theme={theme}
          onSeeAll={() => apply(EMPTY_FILTER, true)}
        />

        {/* 8 — best sellers, or store picks where there is no order history
            to justify the stronger claim. */}
        <ProductStrip
          title={sections.bestSellersAreReal ? "Best sellers" : "Store picks"}
          products={sections.bestSellers}
          theme={theme}
        />

        {/* 9 — ready to gift */}
        <ProductStrip
          title="Ready to gift"
          products={sections.giftReady}
          theme={theme}
          onSeeAll={() => apply({ ...EMPTY_FILTER, giftReady: true }, true)}
        />

        {/* 10 — occasion chips */}
        <OccasionChips
          sections={sections}
          theme={theme}
          active={filter.occasions}
          onFilter={apply}
        />

        {/* 11 — the endless grid */}
        <div ref={gridRef}>
          <TabSectionHead title={`All ${categoryName.toLowerCase()}`} theme={theme} />
          <TabFilterBar
            products={sections.all}
            filter={filter}
            onFilter={setFilter}
            sort={sort}
            onSort={setSort}
            resultCount={results.length}
            stores={stores}
            subcategories={subcategories}
          />
          <div className="pt-3">
            <TabGrid products={results} />
          </div>
        </div>
      </div>
    </>
  );
}
