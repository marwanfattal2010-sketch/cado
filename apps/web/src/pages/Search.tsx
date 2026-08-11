import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchProducts } from "../hooks/useProducts";
import { useSearchStores } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { SearchIcon } from "../components/Icons";
import { RibbonEmpty } from "../components/ui";

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

  const productList = useMemo(() => products.data ?? [], [products.data]);
  const storeList = useMemo(() => stores.data ?? [], [stores.data]);

  useEffect(() => setShown(PAGE), [query, tab]);

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
        if (e[0].isIntersecting) setShown((n) => (n >= productList.length ? n : n + PAGE));
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [productList.length]);

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
          <TabButton value="items" label="Gifts" count={productList.length} />
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
            <ProductGridSkeleton count={6} />
          </div>
        ) : productList.length > 0 ? (
          <>
            <div className="mt-6 grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {productList.slice(0, shown).map((p) => (
                <ProductCard key={p.id} {...(p as Parameters<typeof ProductCard>[0])} />
              ))}
            </div>
            <div ref={sentinel} className="h-8" />
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
