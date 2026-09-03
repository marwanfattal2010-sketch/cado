import { useMemo, useRef, useState } from "react";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { TabFilterBar } from "./TabFilterBar";
import {
  ArrivalsAndBest,
  GiftForRow,
  OccasionChips,
  QuickTiles,
  ReadyToGift,
  SubcategoryCircles,
  SuperDeals,
  TabGrid,
  TabHero,
  TabSectionHead,
  TabStoresRow,
} from "./CategorySections";
import { EMPTY_FILTER, applyFilter, sortProducts, type Sort, type TabFilter } from "../../../lib/tabFilter";
import type { BrowseTab } from "../../../lib/browse";

/**
 * ONE category tab, built to the Part 2 template.
 *
 * Section order is the spec's and the spec's reasoning is worth keeping in
 * view: a gift shopper thinks WHO → WHAT OCCASION → WHAT BUDGET → then what.
 * So "Gift for…" comes before the departments, the price chips are in the
 * hero, and occasions — which lead on the All tab — are demoted to a chip row
 * near the bottom, because on Flowers the occasion is usually already decided.
 *
 * Every filtered entry point on this page calls the SAME `apply`, which sets
 * the same filter object the sheet edits. That is why "For Him" and "Under
 * $50" and "Necklaces" combine instead of replacing each other — the bug in
 * the chip bar this replaces.
 */
export function CategoryTab({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const category = categories.data?.find((c) => c.slug === tab.filter.category_slug);
  const categoryId = category?.id;
  const categoryName = category?.name ?? "";

  const sections = useTabSections(categoryId);
  const subcategoriesQuery = useSubcategories(tab.filter.category_slug);

  const [filter, setFilter] = useState<TabFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<Sort>("recommended");
  const gridRef = useRef<HTMLDivElement | null>(null);

  /**
   * Filtering from a tile scrolls to the grid, because otherwise the tap
   * appears to do nothing: the change is 900px below the fold. `smooth` and
   * not `auto` — the movement is the feedback.
   */
  const apply = (next: TabFilter, scroll = false) => {
    setFilter(next);
    if (scroll) {
      requestAnimationFrame(() =>
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  };

  const subcategories = useMemo(
    () => (subcategoriesQuery.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [subcategoriesQuery.data]
  );

  /** The stores that actually stock this category, from the tab's own rows. */
  const stores = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; slug: string | null; logo_url: string | null }>();
    for (const p of sections.all) {
      if (p.partner && !seen.has(p.partner.id)) {
        seen.set(p.partner.id, {
          id: p.partner.id,
          name: p.partner.name,
          slug: p.partner.slug,
          // The card columns do not carry the logo; TabStoresRow falls back to
          // initials, which is honest — 25 of 27 shops have no logo file.
          logo_url: null,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [sections.all]);

  const results = useMemo(
    () => sortProducts(applyFilter(sections.all, filter), sort),
    [sections.all, filter, sort]
  );

  if (sections.isLoading) {
    return (
      <div className="space-y-2 px-[var(--page-x)] pt-2">
        <Skeleton className="h-[190px] w-full rounded-[16px]" />
        <Skeleton className="h-[110px] w-full rounded-[12px]" />
        <ProductGridSkeleton count={4} />
      </div>
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
      {/* 2 — hero. Full-bleed, so it sits outside the 8px section rhythm. */}
      <div className="px-[var(--page-x)]">
        <TabHero categoryName={categoryName} sections={sections} onFilter={apply} />
      </div>

      <div className="space-y-2 px-[var(--page-x)] pt-2">
        {/* 3 */}
        <GiftForRow sections={sections} onFilter={apply} />
        {/* 4 */}
        <QuickTiles sections={sections} onFilter={apply} />
        {/* 5 */}
        <SubcategoryCircles
          sections={sections}
          subcategories={subcategories}
          onFilter={apply}
        />
        {/* 6 — one stores row. The "More stores" banners are deleted (2.6). */}
        <TabStoresRow categoryName={categoryName} stores={stores} />
        {/* 7 */}
        <SuperDeals sections={sections} onFilter={apply} />
        {/* 8 */}
        <ArrivalsAndBest sections={sections} onFilter={apply} />
        {/* 9 */}
        <ReadyToGift sections={sections} onFilter={apply} />
        {/* 10 */}
        <OccasionChips sections={sections} onFilter={apply} />

        {/* 11 — All {Category} */}
        <div ref={gridRef} className="pt-1">
          <TabSectionHead title={`All ${categoryName.toLowerCase()}`} />
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
