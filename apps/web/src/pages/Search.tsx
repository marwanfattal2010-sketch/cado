import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchProducts, useVariantOptionsForProducts } from "../hooks/useProducts";
import { useSearchStores } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { tidyCategory } from "../components/CategoryChips";
import { SearchIcon } from "../components/Icons";
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
  type CategoryFilters,
  type FilterableProduct,
} from "../components/CategoryFilterPanel";

type Tab = "items" | "stores";

const RECENTS_KEY = "cado-recent-searches";
const PAGE = 12;

function readRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(v) ? v.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function Search() {
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("items");
  const [recents, setRecents] = useState<string[]>(readRecents);
  const [shown, setShown] = useState(PAGE);
  const [filters, setFilters] = useState<CategoryFilters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>("suggested");
  const input = useRef<HTMLInputElement>(null);

  // Debounce so results settle as you pause typing rather than firing a
  // request per keystroke. 200ms is below the threshold most people notice.
  useEffect(() => {
    const t = setTimeout(() => setQuery(raw), 200);
    return () => clearTimeout(t);
  }, [raw]);

  const stores = useSearchStores(query);
  const products = useSearchProducts(query);
  const searching = query.trim().length > 0;

  const productList = useMemo(
    () => (products.data ?? []) as unknown as FilterableProduct[],
    [products.data]
  );
  const storeList = useMemo(() => stores.data ?? [], [stores.data]);

  /**
   * Sizes for exactly the gifts on screen. product_variants is empty in
   * production, so this returns nothing and the Size group does not render —
   * it lights up by itself once a partner adds a variant.
   */
  const variants = useVariantOptionsForProducts(useMemo(
    () => productList.map((p) => p.id),
    [productList]
  ));

  /** Filter and sort happen over the response already in memory — no
   *  refetch, so a tick is instant and the panel's counts are exact. */
  const visible = useMemo(
    () => sortProducts(productList.filter((p) => productMatches(p, filters, variants.data?.byProduct)), sort),
    [productList, filters, sort, variants.data]
  );

  /** Options built from the results in view, never a hardcoded list. */
  const categoryOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of productList) {
      const c = (p as { category?: { slug?: string | null; name?: string | null } | null }).category;
      if (c?.slug && c.name) names.set(c.slug, tidyCategory(c.name));
    }
    return [...names.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [productList]);

  const partnerOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of productList) {
      const s = (p as { partner?: { id?: string | null; name?: string | null } | null }).partner;
      if (s?.id && s.name) names.set(s.id, s.name);
    }
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [productList]);

  const activeChips = useMemo(
    () => filterLabels(filters, { stores: partnerOptions, categories: categoryOptions }),
    [filters, partnerOptions, categoryOptions]
  );

  // A filter that survives into a different search is how a screen ends up
  // mysteriously empty — "Under $20" carried over from a term that had cheap
  // gifts into one that doesn't.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setSort("suggested");
  }, [query]);

  useEffect(() => setShown(PAGE), [query, tab, filters, sort]);

  // Remember a term only once it has clearly settled and returned something,
  // so half-typed fragments don't fill the recent list.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    if (products.isLoading || stores.isLoading) return;
    if (productList.length === 0 && storeList.length === 0) return;
    setRecents((prev) => {
      const next = [q, ...prev.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, [query, products.isLoading, stores.isLoading, productList.length, storeList.length]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) setShown((n) => (n >= visible.length ? n : n + PAGE));
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible.length]);

  const clearRecents = () => {
    localStorage.removeItem(RECENTS_KEY);
    setRecents([]);
  };

  const TabButton = ({ value, label, count }: { value: Tab; label: string; count: number }) => (
    <button
      onClick={() => setTab(value)}
      /* Same two states as every chip on the site: charcoal fill when
         selected, white with a hairline when not. */
      className={`tap-44 inline-flex h-9 items-center gap-1.5 rounded-pill border px-4 text-caption font-medium transition-all duration-press ease-out active:scale-[0.97] ${
        tab === value ? "border-primary bg-primary text-inverse" : "border-line bg-surface text-ink"
      }`}
    >
      {label}
      {searching ? <span className={tab === value ? "opacity-80" : "text-muted"}>{count}</span> : null}
    </button>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* A form, so enterKeyHint="search" is not a lie: the return key has
          something to submit, and submitting blurs the field and drops the
          keyboard. Results are already live as you type (see the debounce
          above), so submit deliberately does nothing else. */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
        className="relative"
      >
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          type="search"
          enterKeyHint="search"
          placeholder="Search gifts or stores…"
          /* .search-field: same neutral focus as the homepage bar — the global
             gold ring is suppressed and the hairline darkens instead. */
          className="search-field w-full rounded-pill border border-line bg-surface py-3.5 pl-12 pr-11 text-body outline-none transition"
        />
        {raw ? (
          <button
            type="button"
            onClick={() => setRaw("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-pill text-muted hover:bg-surface-sunk"
          >
            ✕
          </button>
        ) : null}
      </form>

      {searching ? (
        <div className="mt-4 flex gap-2">
          {/* Counts what is actually on screen, so it stays true as the
              filter sheet narrows the grid. */}
          <TabButton value="items" label="Gifts" count={visible.length} />
          <TabButton value="stores" label="Stores" count={storeList.length} />
        </div>
      ) : null}

      {!searching ? (
        recents.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-eyebrow uppercase text-muted">Recent</p>
              <button onClick={clearRecents} className="text-caption text-muted underline">
                Clear
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => setRaw(r)}
                  className="inline-flex h-9 items-center rounded-pill bg-surface-sunk px-4 text-caption font-medium"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <RibbonEmpty className="mx-auto h-14 w-14" />
            <p className="mt-3 text-body text-muted">Start typing to find a gift or a store.</p>
          </div>
        )
      ) : tab === "items" ? (
        products.isLoading ? (
          <div className="mt-6">
            {/* Reserve the bar too, so the first row of results does not get
                shoved down 44px when the response lands. */}
            <div className="flex items-center gap-2">
              <span className="skeleton h-11 flex-1 rounded-pill" />
              <span className="h-6 w-px shrink-0 bg-line" />
              <span className="skeleton h-11 flex-1 rounded-pill" />
            </div>
            <div className="pt-5">
              <ProductGridSkeleton count={6} />
            </div>
          </div>
        ) : productList.length > 0 ? (
          <>
            <div className="mt-6">
              <FilterBar
                activeCount={countActive(filters)}
                sort={sort}
                onOpenFilter={() => setFilterOpen(true)}
                onOpenSort={() => setSortOpen(true)}
              />
              <ActiveFilterChips
                chips={activeChips}
                onRemove={(key, value) => setFilters((f) => removeFilter(f, key, value))}
                onClear={() => setFilters(NO_FILTERS)}
              />
            </div>

            {visible.length > 0 ? (
              <>
                <div className="mt-5 grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {visible.slice(0, shown).map((p) => (
                    <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
                  ))}
                </div>
                <div ref={sentinel} className="h-8" />
              </>
            ) : (
              /* Filtered to nothing is the person's own doing and is one tap
                 to undo — it must never be dressed up as "we have nothing". */
              <div className="py-14 text-center">
                <RibbonEmpty className="mx-auto h-14 w-14" />
                <p className="mt-3 font-display text-h2">No gifts match these filters</p>
                <p className="mx-auto mt-2 max-w-xs text-body text-muted">
                  There {productList.length === 1 ? "is" : "are"} {productList.length}{" "}
                  {productList.length === 1 ? "result" : "results"} for "{query}" — just none matching
                  all of them.
                </p>
                <Button className="mt-5" onClick={() => setFilters(NO_FILTERS)}>
                  Clear filters
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyResult query={query} kind="gifts" />
        )
      ) : stores.isLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-card" />
          ))}
        </div>
      ) : storeList.length > 0 ? (
        <div className="mt-6 flex animate-fade-in flex-col gap-2">
          {storeList.map((s) => (
            <Link
              key={s.id}
              to={`/store/${s.id}`}
              className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-rest transition active:scale-[0.99]"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface-sunk">
                {s.cover_image_url ? (
                  <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-product-name">{s.name}</p>
                {s.description ? (
                  <p className="truncate text-caption text-muted">{s.description}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyResult query={query} kind="stores" />
      )}

      {/* Search spans every category, so unlike /category/:slug this panel
          DOES offer the Category group. */}
      <CategoryFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        rows={productList}
        stores={partnerOptions}
        categories={categoryOptions}
        variants={variants.data}
        filters={filters}
        onApply={setFilters}
      />

      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} sort={sort} onChange={setSort} />
    </div>
  );
}

function EmptyResult({ query, kind }: { query: string; kind: "gifts" | "stores" }) {
  return (
    <div className="py-14 text-center">
      <RibbonEmpty className="mx-auto h-14 w-14" />
      <p className="mt-3 font-display text-h2">No {kind} for "{query}"</p>
      <p className="mx-auto mt-2 max-w-xs text-body text-muted">
        Try a shorter word, or let us narrow it down for you.
      </p>
      <Link
        to="/gift-finder"
        className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
      >
        Find a gift
      </Link>
    </div>
  );
}
