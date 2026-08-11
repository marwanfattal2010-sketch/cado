import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useProductsByCategory, useVariantOptionsByCategory } from "../hooks/useProducts";
import { useStoresByCategory } from "../hooks/useStores";
import { tidyCategory } from "./CategoryChips";
import { ProductCard } from "./ProductCard";
import { StoreCard, StoreCardSkeleton } from "./StoreCard";
import { ProductGridSkeleton, Skeleton } from "./Skeleton";
import { SlidersIcon } from "./Icons";
import { RibbonEmpty } from "./ui";
import { ActiveFilterChips } from "./FilterBar";
import {
  CategoryFilterPanel,
  NO_FILTERS,
  countActive,
  filterLabels,
  productMatches,
  removeFilter,
  toggleFilter,
  type CategoryFilters,
  type FilterableProduct,
} from "./CategoryFilterPanel";

const MIN_SECTION_STORES = 2;
const PAGE = 12;

/**
 * The homepage's in-place category browse.
 *
 * Tapping a category chip on the homepage does NOT navigate. The homepage
 * keeps its scroll position, its header and its sticky rail, and swaps the
 * body for this. /category/<slug> still exists and still works — it is what
 * "See all" and every shared link point at — this is only the chip
 * interaction.
 *
 * State lives in a hook rather than inside the view because the filter
 * button has to render up in the sticky rail, several levels away from the
 * grid it controls.
 */
export function useCategoryBrowse(slug: string | null) {
  const products = useProductsByCategory(slug ?? undefined);
  const stores = useStoresByCategory(slug ?? undefined);
  const variants = useVariantOptionsByCategory(slug ?? undefined);
  const categories = useCategories();

  const [filters, setFilters] = useState<CategoryFilters>(NO_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);

  // Carrying "Woman" from Fashion into Chocolate is how a shelf ends up
  // mysteriously empty.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setPanelOpen(false);
  }, [slug]);

  const rows = useMemo(() => (products.data ?? []) as unknown as FilterableProduct[], [products.data]);
  const sizes = variants.data?.byProduct;

  const visible = useMemo(
    () => rows.filter((p) => productMatches(p, filters, sizes)),
    [rows, filters, sizes]
  );

  const subcategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products.data ?? []) {
      const sub = (p as { subcategory?: { slug?: string; name?: string } | null }).subcategory;
      if (sub?.slug && sub.name) map.set(sub.slug, sub.name);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [products.data]);

  const storeList = useMemo(
    () => (stores.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [stores.data]
  );

  const category = categories.data?.find((c) => c.slug === slug);
  const name = category ? tidyCategory(category.name) : (slug?.replace(/-/g, " ") ?? "");

  return {
    slug,
    name,
    products,
    stores,
    storeList,
    subcategories,
    variants,
    rows,
    visible,
    filters,
    setFilters,
    panelOpen,
    setPanelOpen,
    activeCount: countActive(filters),
  };
}

export type CategoryBrowse = ReturnType<typeof useCategoryBrowse>;

/**
 * The filter control, pinned to the top-right corner of the sticky rail so
 * it stays reachable however far the grid is scrolled. Right rather than
 * left: the left edge of that row is where the category chips start, and a
 * control sitting in front of them reads as "the first chip".
 *
 * 44x44. Shows the number of applied filters rather than only a dot, so you
 * can tell at a glance whether the thin grid you're looking at is the whole
 * category or the result of something you ticked.
 */
export function CategoryFilterButton({ browse }: { browse: CategoryBrowse }) {
  return (
    <button
      onClick={() => browse.setPanelOpen(true)}
      aria-label={browse.activeCount ? `Filters, ${browse.activeCount} applied` : "Filters"}
      aria-haspopup="dialog"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-line bg-surface text-ink shadow-rest transition-all duration-press ease-out active:scale-[0.94]"
    >
      <SlidersIcon className="h-[20px] w-[20px]" />
      {browse.activeCount ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-semibold text-inverse">
          {browse.activeCount}
        </span>
      ) : null}
    </button>
  );
}

export function CategoryInline({ browse }: { browse: CategoryBrowse }) {
  const { slug, name, products, stores, visible, filters, setFilters } = browse;
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setShown(PAGE), [slug, filters]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => (n >= visible.length ? n : n + PAGE));
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible.length]);

  const chips = filterLabels(filters, { stores: browse.storeList, subcategories: browse.subcategories });
  const clearOne = (key: keyof CategoryFilters, value?: string) =>
    setFilters((f) => removeFilter(f, key, value));

  const showStores = (stores.data?.length ?? 0) >= MIN_SECTION_STORES;

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-h1">{name}</h1>
            {products.isLoading ? (
              <Skeleton className="mt-1.5 h-3 w-20" />
            ) : (
              <p className="mt-1 text-caption text-muted">
                {visible.length} {visible.length === 1 ? "gift" : "gifts"}
              </p>
            )}
          </div>
          {/* The full page is still there — same URL people can share, and
              the place the whole grid lives without the homepage above it. */}
          <Link
            to={`/category/${slug}`}
            className="tap-44 shrink-0 pb-1 text-caption font-medium text-ink underline underline-offset-4"
          >
            See all
          </Link>
        </div>

        <ActiveFilterChips chips={chips} onRemove={clearOne} onClear={() => setFilters(NO_FILTERS)} />
      </div>

      {/* Stores for the category, on a soft band so the row reads as its own
          shelf. Same set the category page shows — kept because it answers
          "who near me actually sells this". */}
      {stores.isLoading ? (
        <section className="mt-5 bg-tint-sage py-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {name}</h2>
          <div className="scroll-row">
            {Array.from({ length: 2 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : showStores ? (
        <section className="mt-5 bg-tint-sage py-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {name}</h2>
          <div className="scroll-row">
            {stores.data?.map((store) => (
              <button
                key={store.id}
                onClick={() => setFilters((f) => toggleFilter(f, "storeId", store.id))}
                aria-pressed={filters.storeId.includes(store.id)}
                className={`shrink-0 rounded-card ${
                  filters.storeId.includes(store.id)
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-tint-sage"
                    : ""
                }`}
              >
                {/* Non-linking: here the card filters the grid, and an <a>
                    inside a <button> is invalid markup that swallows the
                    click in some browsers. */}
                <StoreCard store={store} interactive={false} />
              </button>
            ))}
          </div>
          <p className="mx-auto max-w-6xl px-4 pt-2 text-caption text-muted">
            Tap a store to filter the gifts below.
          </p>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 pt-6">
        {products.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : visible.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {visible.slice(0, shown).map((p) => (
                <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
              ))}
            </div>
            <div ref={sentinel} className="h-8" />
          </>
        ) : (
          <div className="py-12 text-center">
            <RibbonEmpty className="mx-auto h-14 w-14" />
            <p className="mt-3 font-display text-h2">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">
              {chips.length
                ? "No gifts match these filters. Try widening them."
                : `We're still adding gifts to ${name}.`}
            </p>
            {chips.length ? (
              <button
                onClick={() => setFilters(NO_FILTERS)}
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/browse"
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
              >
                Browse all categories
              </Link>
            )}
          </div>
        )}
      </div>

      <CategoryFilterPanel
        open={browse.panelOpen}
        onClose={() => browse.setPanelOpen(false)}
        rows={browse.rows}
        stores={browse.storeList}
        subcategories={browse.subcategories}
        variants={browse.variants.data}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
