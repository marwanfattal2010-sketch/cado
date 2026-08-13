import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, useStoreProducts } from "../hooks/useStores";
import { useVariantOptionsForProducts } from "../hooks/useProducts";
import { useIsFavoriteStore, toggleFavoriteStore } from "../hooks/useStoreFavorites";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { Img } from "../components/Img";
import { Button, ButtonLink, RibbonEmpty } from "../components/ui";
import { ChevronLeftIcon, HeartIcon, SearchIcon } from "../components/Icons";
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
  type CategoryFilters,
  type FilterableProduct,
} from "../components/CategoryFilterPanel";

const PAGE = 12;
/** Where the compact bar takes over from the cover. Just past the header
 *  block, so the two never overlap and the swap reads as one movement. */
const STICKY_AFTER = 150;

type Row = NonNullable<ReturnType<typeof useStoreProducts>["data"]>[number];

/**
 * /store/:slug — one store's own page.
 *
 * Tapping a store used to tick a filter on whatever page you were already on.
 * That kept the comparison on one screen, which is the right call inside a
 * category, but it meant a store had nowhere of its own: no cover, no
 * description, no way to share a link to it, and no way to see everything it
 * sells rather than the slice matching the current category.
 *
 * Everything below the header is the same machinery the category page uses —
 * the same `CategoryFilterPanel`, the same `productMatches`, the same
 * `sortProducts`, the same removable chips. That is deliberate: a second
 * filter UI is a second set of rules about what "under $50" means, and the
 * repo already has one place where that is decided.
 */
export function Store() {
  // Named `slug`, but a uuid works too — see useStore. Old /store/<uuid>
  // links are already out in the world.
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const store = useStore(slug);
  const storeId = store.data?.id;
  const products = useStoreProducts(storeId);

  const [filters, setFilters] = useState<CategoryFilters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>("suggested");
  const [shown, setShown] = useState(PAGE);
  const [tab, setTab] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  const favorite = useIsFavoriteStore(storeId);
  const rows = useMemo(() => (products.data ?? []) as Row[], [products.data]);
  const variants = useVariantOptionsForProducts(useMemo(() => rows.map((p) => p.id), [rows]));
  const sizes = variants.data?.byProduct;

  // A different store is a different shelf; carrying "Under $20" across is how
  // a page ends up mysteriously empty.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setSort("suggested");
    setTab(null);
    setQuery("");
    setSearchOpen(false);
  }, [slug]);

  /**
   * The compact bar appears once the cover has scrolled past.
   *
   * This is window scroll, not a scroll container: /store/:slug renders inside
   * the shared Layout, which is one long page. The bar itself is
   * `position: fixed`, and Layout's PageTransition applies a transform for
   * 260ms after every navigation — a transformed ancestor becomes the
   * containing block for a fixed child, so during those 260ms the bar would be
   * positioned against the animating wrapper rather than the viewport.
   * PageTransition already removes the class when the animation ends, which is
   * what makes this safe; the threshold being 150px means it is not on screen
   * during the transition anyway.
   */
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > STICKY_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** The categories this store actually sells in — not the global list. */
  const tabs = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of rows) {
      const c = p.category as { slug?: string; name?: string } | null;
      if (!c?.slug) continue;
      const seen = map.get(c.slug);
      if (seen) seen.count += 1;
      else map.set(c.slug, { slug: c.slug, name: c.name ?? c.slug, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  const matches = (p: Row, f: CategoryFilters) =>
    productMatches(p as unknown as FilterableProduct, f, sizes);

  /**
   * Search inside the store is a plain title match over rows already fetched.
   * No query is built from what is typed — the term never reaches PostgREST,
   * so there is nothing to escape and no `.or()` string to get wrong.
   */
  const term = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let list = rows.filter((p) => matches(p, filters));
    if (tab) list = list.filter((p) => (p.category as { slug?: string } | null)?.slug === tab);
    if (term) list = list.filter((p) => p.title.toLowerCase().includes(term));
    return sortProducts(list, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, sort, tab, term, sizes]);

  const subcategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of rows) {
      const s = p.subcategory as { slug?: string; name?: string } | null;
      if (s?.slug) map.set(s.slug, s.name ?? s.slug);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const categoryOptions = useMemo(
    () => tabs.map((t) => ({ value: t.slug, label: t.name })),
    [tabs]
  );

  const activeChips = useMemo(
    () => filterLabels(filters, { subcategories, categories: categoryOptions }),
    [filters, subcategories, categoryOptions]
  );

  useEffect(() => setShown(PAGE), [slug, filters, sort, tab, term]);
  const sentinel = useRef<HTMLDivElement>(null);
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

  if (store.isLoading) {
    return (
      <div key="store-loading" aria-busy="true">
        <div className="skeleton aspect-[5/2] w-full" />
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="skeleton h-6 w-40 rounded-pill" />
          <div className="skeleton mt-2 h-4 w-64 rounded-pill" />
          <div className="pt-6">
            <ProductGridSkeleton count={6} />
          </div>
        </div>
      </div>
    );
  }

  // A missing store is a 404, not a permanent spinner.
  if (!store.data) {
    return (
      <div key="store-missing" className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Store not found</h1>
        <p className="mt-2 text-body text-muted">This store may have closed, or the link is wrong.</p>
        <ButtonLink to="/browse" className="mt-6">
          Browse stores
        </ButtonLink>
      </div>
    );
  }

  const s = store.data;
  const heartLabel = favorite ? `Unfavorite ${s.name}` : `Favorite ${s.name}`;

  return (
    <div className="pb-12">
      {/* 2 — THE COMPACT BAR. Fixed, and only once the cover is behind you.
          It carries the same four controls the header block does, so nothing
          becomes unreachable when the big version scrolls away. */}
      <div
        className={`fixed inset-x-0 top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur transition-opacity duration-base ${
          stuck ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          {searchOpen ? (
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="search-field flex h-10 flex-1 items-center gap-2 rounded-pill border border-line bg-surface px-3.5"
            >
              <input
                autoFocus
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${s.name}`}
                aria-label={`Search ${s.name}`}
                className="h-full w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-muted"
              />
              <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden />
            </form>
          ) : (
            <p className="min-w-0 flex-1 truncate font-display text-h2">{s.name}</p>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Close search" : `Search ${s.name}`}
            aria-expanded={searchOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink"
          >
            {searchOpen ? <span aria-hidden>×</span> : <SearchIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => storeId && toggleFavoriteStore(storeId)}
            aria-label={heartLabel}
            aria-pressed={favorite}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink"
          >
            <HeartIcon className="h-5 w-5" filled={favorite} />
          </button>
        </div>
      </div>

      {/* 1 — THE HEADER. Cover, logo, name, one line, heart. */}
      <header className="relative">
        <div className="relative aspect-[5/2] w-full overflow-hidden bg-surface-sunk">
          <Img
            src={s.cover_image_url ?? s.logo_url}
            className="absolute inset-0 h-full w-full object-cover"
            eager
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl px-4">
          <div className="-mt-8 flex items-end gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-canvas bg-surface shadow-rest">
              {s.logo_url ? (
                <Img src={s.logo_url} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden className="font-display text-h1 text-muted">
                  {s.name.charAt(0)}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => storeId && toggleFavoriteStore(storeId)}
              aria-label={heartLabel}
              aria-pressed={favorite}
              className="mb-0.5 ml-auto flex h-11 items-center gap-1.5 rounded-pill border border-line bg-surface px-4 text-caption font-medium text-ink shadow-rest transition-transform duration-press ease-out active:scale-[0.97]"
            >
              <HeartIcon className="h-4 w-4" filled={favorite} />
              {favorite ? "Saved" : "Save"}
            </button>
          </div>

          <h1 className="mt-2.5 font-display text-h1">{s.name}</h1>
          {s.description ? (
            <p className="mt-1 line-clamp-2 text-body text-muted">{s.description}</p>
          ) : null}
          <p className="mt-1 text-caption text-muted">
            {products.isLoading ? (
              <span className="skeleton inline-block h-[9px] w-16 rounded-pill align-middle" />
            ) : (
              `${visible.length} ${visible.length === 1 ? "gift" : "gifts"}`
            )}
          </p>
        </div>
      </header>

      {/* 3 — THIS STORE'S CATEGORIES. Built from what it actually sells, so a
          store with one category shows no rail rather than a lone "All". */}
      {tabs.length > 1 ? (
        <div className="scroll-row pt-5">
          {[{ slug: null as string | null, name: "All" }, ...tabs].map((t) => {
            const on = tab === t.slug;
            return (
              <button
                key={t.slug ?? "all"}
                type="button"
                onClick={() => setTab(t.slug)}
                aria-pressed={on}
                className={`flex h-[38px] shrink-0 items-center whitespace-nowrap rounded-[10px] px-[15px] text-[13.5px] font-medium transition-colors ${
                  on ? "bg-primary text-inverse" : "border border-line bg-surface text-ink"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 4 + 5 — the shared filter bar, then the grid. */}
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <FilterBar
          activeCount={countActive(filters)}
          sort={sort}
          onOpenFilter={() => setSheetOpen(true)}
          onOpenSort={() => setSortOpen(true)}
        />

        <ActiveFilterChips
          chips={activeChips}
          onRemove={(key, value) => setFilters((f) => removeFilter(f, key, value))}
          onClear={() => setFilters(NO_FILTERS)}
        />

        <div className="pt-5">
          {products.isLoading ? (
            <ProductGridSkeleton count={6} />
          ) : visible.length > 0 ? (
            <>
              <div className="animate-fade-in columns-2 gap-3 md:columns-4">
                {visible.slice(0, shown).map((p) => (
                  <ProductCard key={p.id} {...(p as Parameters<typeof ProductCard>[0])} />
                ))}
              </div>
              <div ref={sentinel} className="h-8" />
            </>
          ) : (
            /* 6 — EMPTY. Never padded with anything invented. */
            <div className="py-14 text-center">
              <RibbonEmpty className="mx-auto h-14 w-14" />
              <p className="mt-3 font-display text-h2">Nothing here yet</p>
              <p className="mx-auto mt-2 max-w-xs text-body text-muted">
                {activeChips.length || tab || term
                  ? "No gifts match these filters. Try widening them."
                  : `${s.name} hasn't listed anything yet.`}
              </p>
              {activeChips.length || tab || term ? (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setTab(null);
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link
                  to="/browse"
                  className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
                >
                  See other stores
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No `stores` group: this page is already one store, so it would offer
          exactly one option and filter nothing. */}
      <CategoryFilterPanel
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        rows={rows as unknown as FilterableProduct[]}
        categories={categoryOptions}
        subcategories={subcategories}
        variants={variants.data}
        filters={filters}
        onApply={setFilters}
      />

      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} sort={sort} onChange={setSort} />
    </div>
  );
}
