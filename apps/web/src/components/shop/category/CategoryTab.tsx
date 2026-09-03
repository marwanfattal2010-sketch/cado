import { useMemo, useRef, useState } from "react";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { TabFilterBar } from "./TabFilterBar";
import { CategoryHero } from "./CategoryHero";
import { TallTiles, type ResolvedTile } from "./TallTiles";
import {
  OccasionChips,
  StoresRow,
  SubcategoryCircles,
  SuperDeals,
  TabGrid,
  TabSectionHead,
  primaryPhoto,
  type CircleItem,
  type StoreItem,
} from "./CategorySections";
import { filterForTile, themeFor } from "../../../lib/categoryTheme";
import { EMPTY_FILTER, applyFilter, sortProducts, type Sort, type TabFilter } from "../../../lib/tabFilter";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * ONE category tab.
 *
 * Section order, and nothing else on the page:
 *   1 hero · 2 tall tiles · 3 shop by category · 4 super deals ·
 *   5 stores · 6 occasions · 7 the grid
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

    // 1 — the hero takes the best photo in the category first, because it is
    // the biggest thing on the page and the only one shown at full width.
    const hero = take(
      [...all].sort((a, b) => Number(!!b.is_pick) - Number(!!a.is_pick))
    );

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

    // 3 — the five tall tiles, in the theme's order.
    const tiles: ResolvedTile[] = [];
    for (const t of themeFor(slug).tiles) {
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

    return { hero, tiles, circles };
  }, [sections.all, sections.bestSellers, sections.giftReady, sections.deals, subcategories, slug]);

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
      {/* 1 — hero, full-bleed. */}
      <CategoryHero
        theme={theme}
        photo={art.hero}
        onShopNow={() => apply(EMPTY_FILTER, true)}
      />

      {/*
        ONE spacing token between every section, top to bottom. `space-y-6`
        is 24px on this scale; nothing below sets its own vertical margin, so
        the rhythm cannot drift section by section.
      */}
      <div className="space-y-6 px-[var(--page-x)] pt-6">
        {/* 2 — tall tiles, on the plain background. */}
        <TallTiles tiles={art.tiles} theme={theme} onSelect={(f) => apply(f, true)} />

        {/* 3 — card */}
        <SubcategoryCircles circles={art.circles} theme={theme} onFilter={apply} />

        {/* 4 — card */}
        <SuperDeals sections={sections} theme={theme} onFilter={apply} />

        {/* 5 — plain */}
        <StoresRow categoryName={categoryName} stores={stores} theme={theme} />

        {/* 6 — card */}
        <OccasionChips
          sections={sections}
          theme={theme}
          active={filter.occasions}
          onFilter={apply}
        />

        {/* 7 — the grid */}
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
