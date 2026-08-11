import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCategoryCounts, useProductsByCategory, useVariantOptionsByCategory } from "../hooks/useProducts";
import { useStoresByCategory } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { CategoryChips, tidyCategory } from "../components/CategoryChips";
import { ProductCard } from "../components/ProductCard";
import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { ProductGridSkeleton, ProductRowSkeleton, Skeleton } from "../components/Skeleton";
import { SlidersIcon } from "../components/Icons";
import { Button, RemovableChip, RibbonEmpty } from "../components/ui";
import {
  CategoryFilterPanel,
  NO_FILTERS,
  countActive,
  filterLabels,
  productMatches,
  type CategoryFilters,
  type FilterableProduct,
} from "../components/CategoryFilterPanel";

type Sort = "popular" | "newest" | "price_asc" | "price_desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** Below these a section is hidden rather than shown half-empty. */
const MIN_SECTION_ITEMS = 4;
const MIN_SECTION_STORES = 2;
const PAGE = 12;

type Row = NonNullable<ReturnType<typeof useProductsByCategory>["data"]>[number];

export function Category() {
  const { slug } = useParams<{ slug: string }>();

  /** Applied filters. The draft lives inside the panel — this page only
   *  ever sees what was actually applied. */
  const [filters, setFilters] = useState<CategoryFilters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");
  const [shown, setShown] = useState(PAGE);

  const categories = useCategories();
  const categoryCounts = useCategoryCounts();
  const stores = useStoresByCategory(slug);
  const products = useProductsByCategory(slug);
  const variants = useVariantOptionsByCategory(slug);

  const category = categories.data?.find((c) => c.slug === slug);
  const categoryName = category ? tidyCategory(category.name) : (slug?.replace(/-/g, " ") ?? "");

  const rows = useMemo(() => (products.data ?? []) as Row[], [products.data]);
  const sizes = variants.data?.byProduct;

  // Reset when the category changes — carrying "Lumière Fine Jewelry" over
  // into Toys is how a page ends up mysteriously empty.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setSort("popular");
  }, [slug]);

  /** The shared matcher — the same function the panel counts with and the
   *  same one the homepage's in-place category view uses. */
  const matches = (p: Row, f: CategoryFilters) =>
    productMatches(p as unknown as FilterableProduct, f, sizes);

  const visible = useMemo(() => {
    const sorted = rows.filter((p) => matches(p, filters));
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
        sorted.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        break;
      case "popular":
        // Editorially flagged first, newest after. There is no sales or view
        // data the storefront can read, so this is a curated order — and
        // nothing on the page claims otherwise. No ranks, no "#1 seller".
        sorted.sort(
          (a, b) =>
            Number(!!b.is_trending) - Number(!!a.is_trending) ||
            String(b.created_at).localeCompare(String(a.created_at))
        );
        break;
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, sort]);

  const subcategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of rows) if (p.subcategory?.slug) map.set(p.subcategory.slug, p.subcategory.name);
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const storeList = useMemo(
    () => (stores.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [stores.data]
  );

  const activeChips = useMemo(
    () => filterLabels(filters, { stores: storeList, subcategories }),
    [filters, storeList, subcategories]
  );

  const clearOne = (key: keyof CategoryFilters) =>
    setFilters({ ...filters, [key]: key === "sameDayOnly" ? false : null } as CategoryFilters);

  // Reveal more as you reach the bottom rather than making anyone hunt for a
  // "load more" button with a thumb.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(PAGE), [slug, filters, sort]);
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

  /** A sibling category that actually has gifts in it. Pointing a thin shelf
   *  at another empty shelf is worse than not pointing anywhere. */
  const relatedCategory = useMemo(() => {
    const counts = categoryCounts.data;
    if (!counts || !categories.data) return null;
    return (
      categories.data
        .filter((c) => c.slug !== slug && (counts.get(c.slug) ?? 0) >= MIN_SECTION_ITEMS)
        .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))[0] ?? null
    );
  }, [categoryCounts.data, categories.data, slug]);

  const showHighlights = rows.length >= MIN_SECTION_ITEMS;
  const showStores = (stores.data?.length ?? 0) >= MIN_SECTION_STORES;

  /** Newest-first, and labelled as such. There is no order or view data the
   *  storefront can read under RLS, so calling this "Most popular" would be
   *  inventing a bestseller rank. */
  const highlights = useMemo(
    () => rows.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10),
    [rows]
  );

  return (
    <div className="pb-12">
      {/* The category rail stays pinned on every category page, so hopping
          from Toys to Perfumes is one tap and never a trip home. */}
      <div className="sticky top-[var(--header-h)] z-[15] border-b border-line bg-canvas/95 py-2.5 backdrop-blur">
        <CategoryChips activeSlug={slug} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-5">
        <nav className="flex items-center gap-1.5 text-caption text-muted">
          <Link to="/" className="tap-44 hover:text-ink">
            Home
          </Link>
          <span aria-hidden>›</span>
          <span>{categoryName}</span>
        </nav>

        <h1 className="mt-2 font-display text-h1">{categoryName}</h1>
        {products.isLoading ? (
          <Skeleton className="mt-1.5 h-3 w-20" />
        ) : (
          <p className="mt-1 text-caption text-muted">
            {visible.length} {visible.length === 1 ? "gift" : "gifts"}
          </p>
        )}

        {activeChips.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <RemovableChip key={c.key} onRemove={() => clearOne(c.key)}>
                {c.label}
              </RemovableChip>
            ))}
          </div>
        ) : null}
      </div>

      {/* 2 — HIGHLIGHTS. Only when there is enough here to fill a row. */}
      {products.isLoading ? (
        <section className="pt-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">New in {categoryName}</h2>
          <ProductRowSkeleton />
        </section>
      ) : showHighlights ? (
        <section className="pt-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">New in {categoryName}</h2>
          <div className="scroll-row">
            {highlights.map((p) => (
              <div key={p.id} className="w-[42vw] shrink-0 sm:w-[190px]">
                <ProductCard {...(p as Parameters<typeof ProductCard>[0])} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 — STORES. Tapping one filters the grid below rather than
          navigating away, so the comparison stays on one screen. */}
      {stores.isLoading ? (
        <section className="pt-7">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
          <div className="scroll-row">
            {Array.from({ length: 2 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : showStores ? (
        <section className="pt-7">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
          <div className="scroll-row">
            {stores.data?.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  setFilters({ ...filters, storeId: filters.storeId === store.id ? null : store.id });
                  document
                    .getElementById("category-grid")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-pressed={filters.storeId === store.id}
                className={`shrink-0 rounded-card ${
                  filters.storeId === store.id ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : ""
                }`}
              >
                {/* Non-linking variant on purpose: here the card filters the
                    grid, and an <a> inside a <button> is invalid markup that
                    swallows the click in some browsers. */}
                <StoreCard store={store} interactive={false} />
              </button>
            ))}
          </div>
          <p className="mx-auto max-w-6xl px-4 pt-2 text-caption text-muted">
            Tap a store to filter the gifts below.
          </p>
        </section>
      ) : null}

      {/* 4 — SORT + FILTER, then the grid. Sort is one dropdown, filters are
          one sheet. Mixing them into a single chip row is what made the old
          bar impossible to read at a glance. */}
      <div id="category-grid" className="mx-auto max-w-6xl px-4 pt-7">
        <div className="flex items-center gap-2">
          <label className="relative flex h-11 flex-1 items-center rounded-pill border border-line bg-surface">
            <span className="sr-only">Sort gifts</span>
            {/* The select fills the whole pill rather than sitting as a 17px
                line of text inside it — otherwise the actual tap target is
                the text, not the control. */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-full w-full appearance-none rounded-pill bg-transparent pl-4 pr-9 text-caption font-medium text-ink outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-4 text-[10px] text-muted">
              ▾
            </span>
          </label>

          {/* Same glyph and same panel as the homepage's in-place category
              view — only the placement differs, because this page has a sort
              control to sit beside. */}
          <button
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border border-line bg-surface px-5 text-caption font-medium text-ink transition-all duration-press ease-out active:scale-[0.97]"
          >
            <SlidersIcon className="h-[18px] w-[18px]" />
            Filters
            {countActive(filters) ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold text-inverse">
                {countActive(filters)}
              </span>
            ) : null}
          </button>
        </div>

        <div className="pt-5">
          {products.isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : visible.length > 0 ? (
            <>
              <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
                {visible.slice(0, shown).map((p) => (
                  <ProductCard key={p.id} {...(p as Parameters<typeof ProductCard>[0])} />
                ))}
              </div>
              <div ref={sentinel} className="h-8" />
              {/* Thin, but real. Never padded out with repeats. */}
              {visible.length < MIN_SECTION_ITEMS && activeChips.length === 0 ? (
                <p className="pt-1 text-caption text-muted">
                  More gifts arriving soon.
                  {relatedCategory ? (
                    <>
                      {" "}
                      In the meantime, try{" "}
                      {/* .tap-44 because this is a short word inside a
                          sentence — growing the link itself would break the
                          line. Nothing tappable sits next to it, so the
                          invisible overlay can't steal a neighbour's tap. */}
                      <Link
                        to={`/category/${relatedCategory.slug}`}
                        className="tap-44 font-medium text-ink underline underline-offset-4"
                      >
                        {tidyCategory(relatedCategory.name)}
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <div className="py-14 text-center">
              <RibbonEmpty className="mx-auto h-14 w-14" />
              <p className="mt-3 font-display text-h2">Nothing here yet</p>
              <p className="mx-auto mt-2 max-w-xs text-body text-muted">
                {activeChips.length
                  ? "No gifts match these filters. Try widening them."
                  : `We're still adding gifts to ${categoryName}.`}
              </p>
              {activeChips.length ? (
                <Button className="mt-5" onClick={() => setFilters(NO_FILTERS)}>
                  Clear filters
                </Button>
              ) : relatedCategory ? (
                <Link
                  to={`/category/${relatedCategory.slug}`}
                  className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
                >
                  Browse {tidyCategory(relatedCategory.name)}
                </Link>
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
      </div>

      <CategoryFilterPanel
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        rows={rows as unknown as FilterableProduct[]}
        stores={storeList}
        subcategories={subcategories}
        variants={variants.data}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
