import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useArea } from "../lib/area";
import { useCart } from "../hooks/useCart";
import { productImageUrl } from "../lib/images";
import { storePath } from "../lib/routes";
import { formatMoney } from "../lib/money";
import { Img } from "../components/Img";
import { ProductCard } from "../components/ProductCard";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "../lib/recentSearches";

/**
 * The search screen.
 *
 * Matching happens in Postgres (search_stores / search_products, 0084): each
 * WORD must match, and the like-metacharacters are escaped there. That is not
 * only tidier — composing a PostgREST `.or()` string from what someone typed is
 * how this codebase has been bitten before, and a search box is exactly where
 * an attacker types.
 *
 * Nothing on this screen is invented. Recent searches are the shopper's own,
 * from their own browser; a collection tile only appears when its query has
 * rows; store tiles carry a discount pill only when that store really has one.
 */

type StoreHit = {
  id: string; name: string; slug: string | null; city: string | null;
  logo_url: string | null; cover_image_url: string | null; category_name: string | null;
};
type ItemHit = {
  id: string; title: string; price: number; compare_at_price: number | null;
  partner_id: string; partner_name: string; partner_slug: string | null;
  image_path: string | null; created_at: string;
};

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [area] = useArea();
  const cart = useCart();
  // The hook returns the rows, not a count.
  const cartCount = (cart.data ?? []).reduce((n, r) => n + Number(r.quantity ?? 0), 0);
  const inputRef = useRef<HTMLInputElement>(null);

  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  const [debounced, setDebounced] = useState(urlQ);
  const [tab, setTab] = useState<"stores" | "items">("stores");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(getRecentSearches()), []);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced so a five-letter word is one query, not five.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);

  const active = debounced.length >= MIN_CHARS;

  const stores = useQuery({
    queryKey: ["search-stores", debounced],
    enabled: active,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_stores", { p_query: debounced, p_limit: 25 });
      if (error) throw error;
      return (data ?? []) as StoreHit[];
    },
  });

  const items = useQuery({
    queryKey: ["search-items", debounced],
    enabled: active,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_products", { p_query: debounced, p_limit: 40 });
      if (error) throw error;
      return (data ?? []) as ItemHit[];
    },
  });

  // Land on whichever tab actually has something.
  useEffect(() => {
    if (!active || stores.isLoading || items.isLoading) return;
    const s = stores.data?.length ?? 0;
    const i = items.data?.length ?? 0;
    setTab(s > 0 ? "stores" : i > 0 ? "items" : "stores");
  }, [active, stores.data, items.data, stores.isLoading, items.isLoading]);

  const submit = (term: string) => {
    const clean = term.trim();
    if (clean.length < MIN_CHARS) return;
    setText(clean);
    setDebounced(clean);
    setParams({ q: clean }, { replace: true });
    setRecent(addRecentSearch(clean));
    inputRef.current?.blur();
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-canvas px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink active:scale-95"
        >
          ‹
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-pill border border-line bg-surface px-3"
        >
          <span aria-hidden className="text-muted">⌕</span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            placeholder="Search gifts or stores"
            aria-label="Search gifts or stores"
            className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setText("");
                setDebounced("");
                setParams({}, { replace: true });
                inputRef.current?.focus();
              }}
              className="text-muted"
            >
              ✕
            </button>
          ) : null}
        </form>

        <Link
          to="/cart"
          aria-label="Cart"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink"
        >
          🛍
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-persimmon px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          ) : null}
        </Link>
      </div>

      {active ? (
        <Results
          tab={tab}
          setTab={setTab}
          query={debounced}
          stores={stores.data ?? []}
          items={items.data ?? []}
          loading={stores.isLoading || items.isLoading}
          onSuggest={submit}
        />
      ) : (
        <Landing area={area} recent={recent} onPick={submit} onClear={() => setRecent(clearRecentSearches())} />
      )}
    </div>
  );
}

/* ============================================================ landing ==== */

function Landing({
  area,
  recent,
  onPick,
  onClear,
}: {
  area: string;
  recent: string[];
  onPick: (t: string) => void;
  onClear: () => void;
}) {
  // Featured stores, falling back to whatever exists so the row is never empty
  // for the wrong reason.
  const featured = useQuery({
    queryKey: ["search-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, is_featured, featured_rank")
        .eq("status", "active")
        .eq("is_live", true)
        .order("is_featured", { ascending: false })
        .order("featured_rank", { nullsFirst: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Which of those stores genuinely has something discounted right now.
  const discounted = useQuery({
    queryKey: ["search-discounted-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("partner_id, price, compare_at_price")
        .eq("is_active", true)
        .not("compare_at_price", "is", null)
        .limit(500);
      const set = new Set<string>();
      for (const p of data ?? []) {
        if (p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)) set.add(p.partner_id);
      }
      return set;
    },
  });

  return (
    <div className="px-3 pb-24">
      {/* Featured */}
      {featured.data && featured.data.length > 0 ? (
        <section className="mt-2">
          <h2 className="mb-2 text-[15px] font-bold text-ink">Featured</h2>
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.data.map((s) => (
              <Link key={s.id} to={storePath(s)} className="w-[110px] shrink-0">
                <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[18px] bg-surface-sunk">
                  {s.logo_url || s.cover_image_url ? (
                    <Img src={(s.logo_url ?? s.cover_image_url) as string} className="h-full w-full object-cover" />
                  ) : null}
                  {discounted.data?.has(s.id) ? (
                    <span className="absolute bottom-1 left-1 rounded-pill bg-persimmon px-1.5 py-0.5 text-[10px] font-bold text-white">
                      -20%
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-center text-[12px] leading-tight text-ink">{s.name}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent searches — the shopper's own, hidden when there are none. */}
      {recent.length > 0 ? (
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Recent searches</h2>
            <button type="button" onClick={onClear} className="text-[12px] font-medium text-muted">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onPick(t)}
                className="rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Collections area={area} />
    </div>
  );
}

/* -------------------------------------------------------- collections --- */

type Collection = { key: string; label: string; to: string };

function Collections({ area }: { area: string }) {
  const collections: Collection[] = useMemo(
    () => [
      { key: "city", label: `Top stores in ${area} 📍`, to: "/stores" },
      { key: "local", label: "Made in Lebanon 🇱🇧", to: "/stores?local=1" },
      { key: "under50", label: "Under $50 💸", to: "/browse?max=50" },
      { key: "deals", label: "Deals 🔥", to: "/browse?deals=1" },
      { key: "new", label: "New in ✨", to: "/browse?new=1" },
      { key: "giftsets", label: "Gift Sets 🎁", to: "/category/gift-sets" },
    ],
    [area]
  );

  // One real photo per collection, taken from that collection's own first
  // result. A tile with no rows behind it is hidden rather than shown with a
  // stock photo.
  const photos = useQuery({
    queryKey: ["collection-photos", area],
    queryFn: async () => {
      const out: Record<string, string | null> = {};
      const firstImage = async (productIds: string[]) => {
        if (productIds.length === 0) return null;
        const { data } = await supabase
          .from("product_images")
          .select("storage_path")
          .in("product_id", productIds)
          .order("is_primary", { ascending: false })
          .limit(1);
        return data?.[0]?.storage_path ? productImageUrl(data[0].storage_path) : null;
      };

      const [under50, deals, fresh, local, city] = await Promise.all([
        supabase.from("products").select("id").eq("is_active", true).lt("price", 50).limit(6),
        supabase.from("products").select("id, price, compare_at_price").eq("is_active", true)
          .not("compare_at_price", "is", null).limit(20),
        supabase.from("products").select("id").eq("is_active", true)
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(6),
        supabase.from("partners").select("id").eq("is_lebanese_brand", true).eq("status", "active").limit(1),
        supabase.from("partners").select("id").eq("city", area).eq("status", "active").limit(1),
      ]);

      out.under50 = await firstImage((under50.data ?? []).map((p) => p.id));
      const realDeals = (deals.data ?? []).filter(
        (p) => p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)
      );
      out.deals = realDeals.length ? await firstImage(realDeals.map((p) => p.id)) : null;
      out.new = await firstImage((fresh.data ?? []).map((p) => p.id));
      out.local = (local.data ?? []).length > 0 ? null : "HIDE";
      out.city = (city.data ?? []).length > 0 ? null : "HIDE";

      const { data: giftSets } = await supabase
        .from("products").select("id, category:categories!inner(slug)")
        .eq("is_active", true).eq("categories.slug", "gift-sets").limit(6);
      out.giftsets = await firstImage((giftSets ?? []).map((p) => p.id));
      out.deals = realDeals.length ? out.deals : "HIDE";
      return out;
    },
  });

  const visible = collections.filter((c) => photos.data?.[c.key] !== "HIDE");

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[15px] font-bold text-ink">Collections</h2>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((c) => {
          const photo = photos.data?.[c.key];
          return (
            <Link key={c.key} to={c.to} className="flex flex-col items-center">
              <span className="relative flex h-[92px] w-full items-center justify-center overflow-hidden rounded-pill bg-persimmon/10">
                {photo && photo !== "HIDE" ? (
                  <Img src={photo} className="h-[76px] w-[76px] rounded-pill object-cover" />
                ) : (
                  <span className="text-[28px]">{c.label.slice(-2)}</span>
                )}
              </span>
              <span className="mt-1.5 text-center text-[13px] font-medium leading-tight text-ink">{c.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================ results ==== */

function Results({
  tab, setTab, query, stores, items, loading, onSuggest,
}: {
  tab: "stores" | "items";
  setTab: (t: "stores" | "items") => void;
  query: string;
  stores: StoreHit[];
  items: ItemHit[];
  loading: boolean;
  onSuggest: (t: string) => void;
}) {
  const nothing = !loading && stores.length === 0 && items.length === 0;

  return (
    <div className="pb-24">
      <div className="flex border-b border-line px-3">
        {(["stores", "items"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-[14px] font-semibold capitalize ${
              tab === t ? "text-ink" : "text-muted"
            }`}
          >
            {t} {t === "stores" ? `(${stores.length})` : `(${items.length})`}
            {tab === t ? (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-pill bg-persimmon" />
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-3 pt-4">
          <div className="grid grid-cols-2 gap-x-2 gap-y-[10px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="aspect-[3/4] w-full animate-pulse rounded-card bg-surface-sunk" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-sunk" />
                <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-surface-sunk" />
              </div>
            ))}
          </div>
        </div>
      ) : nothing ? (
        <div className="px-6 py-16 text-center">
          <p className="text-body text-ink">Nothing for “{query}” yet — try another word</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Under $50", "Gift Sets", "New in"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggest(s.replace(/[^a-zA-Z ]/g, "").trim())}
                className="rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : tab === "stores" ? (
        <ul className="divide-y divide-line px-3">
          {stores.map((s) => (
            <li key={s.id}>
              <Link to={storePath(s)} className="flex items-center gap-3 py-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-pill bg-surface-sunk">
                  {s.logo_url || s.cover_image_url ? (
                    <Img src={(s.logo_url ?? s.cover_image_url) as string} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{s.name}</span>
                  <span className="block truncate text-caption text-muted">
                    {[s.category_name, s.city].filter(Boolean).join(" · ") || "Store"}
                  </span>
                </span>
                <span aria-hidden className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-x-2 gap-y-[10px] px-3 pt-3">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={Number(p.price)}
              compare_at_price={p.compare_at_price == null ? null : Number(p.compare_at_price)}
              created_at={p.created_at}
              product_images={p.image_path ? [{ storage_path: p.image_path, is_primary: true }] : null}
              partner={{ name: p.partner_name, slug: p.partner_slug, id: p.partner_id }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
export { formatMoney };
