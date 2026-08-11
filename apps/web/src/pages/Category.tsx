import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCategoryCounts, useProductsByCategory, useVariantOptionsByCategory } from "../hooks/useProducts";
import { useStoresByCategory } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { CategoryChips, tidyCategory } from "../components/CategoryChips";
import { ProductCard } from "../components/ProductCard";
import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { ProductGridSkeleton, ProductRowSkeleton } from "../components/Skeleton";
import { Button, RibbonEmpty } from "../components/ui";
import {
  ActiveFilterChips,
  FilterBar,
  SortSheet,
  sortProducts,
  type SortValue,
} from "../components/FilterBar";
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
} from "../components/CategoryFilterPanel";

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
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>("suggested");
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
    setSort("suggested");
  }, [slug]);

  /** The shared matcher — the same function the panel counts with and the
   *  same one the homepage's in-place category view uses. */
  const matches = (p: Row, f: CategoryFilters) =>
    productMatches(p as unknown as FilterableProduct, f, sizes);

  /**
   * Rows arrive newest-first from the query (see categoryProductsQuery), so
   * "Suggested" — editorially flagged first, then whatever order we already
   * had — resolves to trending-then-newest without a second comparator here.
   * There is no sales or view data the storefront can read, so nothing on
   * this page claims a popularity rank.
   */
  const visible = useMemo(
    () => sortProducts(rows.filter((p) => matches(p, filters)), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters, sort]
  );

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

  const clearOne = (key: keyof CategoryFilters, value?: string) =>
    setFilters((f) => removeFilter(f, key, value));

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

  /**
   * One gate for the whole body.
   *
   * Products and stores are the two queries that decide WHICH sections exist,
   * and "New in …" / "Stores for …" sit above the grid — so a section that
   * mounts (or vanishes) late drags everything below it. Resolving them
   * separately is what made every category page shift: the grid was pushed
   * down when the store row grew, and yanked up 580px on /category/shoes when
   * both sections turned out not to qualify.
   *
   * The two branches carry different keys on purpose. React then replaces the
   * subtree instead of reconciling <section> onto <section>, so no painted
   * node straddles the swap — the placeholder is replaced where it stands
   * rather than being moved.
   */
  const dataReady = !products.isLoading && !stores.isLoading;

  /**
   * How much space the placeholder should reserve.
   *
   * useCategoryCounts is not an extra request: the chip rail pinned at the top
   * of this page already blocks on it (useStockedCategories), so it is in
   * flight from the first render and normally lands before the product rows
   * do. When it has, the loading state reserves what this category is actually
   * going to need. That is why /category/shoes — one gift, no qualifying
   * sections — no longer draws a three-section page and then throws most of it
   * away. When it hasn't landed yet we fall back to a full page, which is the
   * common case.
   */
  /*
   * Frozen on the first render for this slug, and deliberately never revised.
   * Reading it live is a shift of its own: on a cold load the count query
   * lands mid-skeleton, and /category/shoes went from an eight-card
   * placeholder to a one-card placeholder while still loading — 0.32 of CLS
   * inside the loading state. A placeholder that changes its mind is worse
   * than one that guesses.
   */
  const expected = useRef<{ slug?: string; count?: number }>({});
  if (expected.current.slug !== slug) {
    expected.current = { slug, count: slug ? categoryCounts.data?.get(slug) : undefined };
  }
  const expectedCount = expected.current.count;
  const expectSections = expectedCount == null || expectedCount >= MIN_SECTION_ITEMS;
  const skeletonCards = Math.max(1, Math.min(expectedCount ?? 8, PAGE));

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
        {/* The bar lives INSIDE the real <p>, so the line box is the same
            12px/1.4 whether it holds a placeholder or "8 gifts". The old
            version swapped a 12px block for a 16.8px line of text and pushed
            every section below it down by 4px. */}
        <p className="mt-1 text-caption text-muted">
          {products.isLoading ? (
            <span className="skeleton inline-block h-[9px] w-16 rounded-pill align-middle" />
          ) : (
            `${visible.length} ${visible.length === 1 ? "gift" : "gifts"}`
          )}
        </p>
      </div>

      {!dataReady ? (
        /* The loading view. Same sections in the same order at the same
           heights — see ProductRowSkeleton / StoreCardSkeleton, which are
           sized off the real type scale and the real card widths. */
        <div key="loading" aria-busy="true">
          {expectSections ? (
            <>
              <section className="pt-6">
                <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">New in {categoryName}</h2>
                <ProductRowSkeleton />
              </section>
              <section className="pt-7">
                <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
                <div className="scroll-row">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <StoreCardSkeleton key={i} />
                  ))}
                </div>
                {/* The real section carries this line, so the placeholder
                    reserves its height too — leaving it out is what made the
                    store row 26px shorter while loading. */}
                <p className="mx-auto max-w-6xl px-4 pt-2 text-caption text-muted">
                  <span className="skeleton inline-block h-[9px] w-44 rounded-pill align-middle" />
                </p>
              </section>
            </>
          ) : null}

          <div className="mx-auto max-w-6xl px-4 pt-7">
            {/* Mirrors <FilterBar/> exactly — two flex-1 pills either side of
                a 1px divider. A placeholder that isn't the same shape as the
                control is a layout shift with extra steps. */}
            <div className="flex items-center gap-2">
              <span className="skeleton h-11 flex-1 rounded-pill" />
              <span className="h-6 w-px shrink-0 bg-line" />
              <span className="skeleton h-11 flex-1 rounded-pill" />
            </div>
            <div className="pt-5">
              <ProductGridSkeleton count={skeletonCards} />
            </div>
          </div>
        </div>
      ) : (
        <div key="content">
        {/* 2 — HIGHLIGHTS. Only when there is enough here to fill a row. */}
        {showHighlights ? (
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
        {showStores ? (
          <section className="pt-7">
            <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
            <div className="scroll-row">
              {stores.data?.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    setFilters((f) => toggleFilter(f, "storeId", store.id));
                    document
                      .getElementById("category-grid")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-pressed={filters.storeId.includes(store.id)}
                  className={`shrink-0 rounded-card ${
                    filters.storeId.includes(store.id)
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas"
                      : ""
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

        {/* 4 — THE BAR, then the grid. Two buttons, both opening a sheet.
            What you picked comes back as chips underneath, so the bar itself
            is always exactly one row tall. */}
        <div id="category-grid" className="mx-auto max-w-6xl px-4 pt-7">
          <FilterBar
            activeCount={countActive(filters)}
            sort={sort}
            onOpenFilter={() => setSheetOpen(true)}
            onOpenSort={() => setSortOpen(true)}
          />

          <ActiveFilterChips
            chips={activeChips}
            onRemove={clearOne}
            onClear={() => setFilters(NO_FILTERS)}
          />

          <div className="pt-5">
            {visible.length > 0 ? (
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
        </div>
      )}

      {/* No `categories` prop: this page is already inside one category, so
          that group would offer exactly one option and filter nothing. */}
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

      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} sort={sort} onChange={setSort} />
    </div>
  );
}
