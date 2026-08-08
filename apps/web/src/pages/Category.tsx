import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProductsByCategory } from "../hooks/useProducts";
import { useStoresByCategory, useSubcategories } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton, Skeleton } from "../components/Skeleton";

type Sort = "popular" | "newest" | "price_asc" | "price_desc";

const SORT_LABELS: Record<Sort, string> = {
  popular: "Popular",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

// Same ranges as the gift finder and the homepage budget pills.
const PRICE_RANGES = [
  { label: "Any price", min: 0, max: null as number | null },
  { label: "Under $20", min: 0, max: 20 },
  { label: "$20 – $50", min: 20, max: 50 },
  { label: "$50 – $100", min: 50, max: 100 },
  { label: "$100 – $200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: null },
];

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [subcategory, setSubcategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<Sort>("popular");
  const [priceIndex, setPriceIndex] = useState(0);
  const [storeId, setStoreId] = useState<string>("");

  const categories = useCategories();
  const subcategories = useSubcategories(slug);
  const stores = useStoresByCategory(slug);
  const products = useProductsByCategory(slug, { subcategorySlug: subcategory, sort });

  const categoryName =
    categories.data?.find((c) => c.slug === slug)?.name ?? slug?.replace(/-/g, " ") ?? "";

  // Price and store are filtered client-side: the row set is already capped
  // at 100 by the query, so this avoids a refetch on every filter tweak.
  const visible = useMemo(() => {
    const range = PRICE_RANGES[priceIndex];
    return (products.data ?? []).filter((p) => {
      if (p.price < range.min) return false;
      if (range.max !== null && p.price > range.max) return false;
      if (storeId && p.partner?.id !== storeId) return false;
      return true;
    });
  }, [products.data, priceIndex, storeId]);

  const filtersActive = priceIndex !== 0 || storeId !== "" || subcategory !== undefined;

  const resetFilters = () => {
    setPriceIndex(0);
    setStoreId("");
    setSubcategory(undefined);
  };

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink/40">
          <Link to="/" className="hover:text-ink/70">
            Home
          </Link>
          <span>›</span>
          <span className="capitalize text-ink/60">{categoryName}</span>
        </nav>

        <h1 className="mt-2 font-display text-2xl font-semibold capitalize sm:text-3xl">{categoryName}</h1>
        {products.isLoading ? (
          <Skeleton className="mt-1.5 h-3 w-20" />
        ) : (
          <p className="mt-1 text-sm text-ink/40">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </p>
        )}
      </div>

      {/* Subcategory chips */}
      {subcategories.data && subcategories.data.length > 0 ? (
        <div className="scroll-row mt-5 gap-2 px-6">
          <button
            onClick={() => setSubcategory(undefined)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 active:scale-95 ${
              !subcategory ? "bg-ink text-cream" : "bg-white text-ink/70 ring-1 ring-ink/10"
            }`}
          >
            All
          </button>
          {subcategories.data.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubcategory(sub.slug)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 active:scale-95 ${
                subcategory === sub.slug ? "bg-ink text-cream" : "bg-white text-ink/70 ring-1 ring-ink/10"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Sticky filter + sort bar. top-[57px] clears the sticky header so the
          two never overlap or double-stack. */}
      <div className="sticky top-[57px] z-10 mt-5 border-y border-ink/8 bg-cream/95 backdrop-blur">
        <div className="scroll-row gap-2 px-6 py-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink/70 outline-none ring-1 ring-ink/10"
          >
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            value={priceIndex}
            onChange={(e) => setPriceIndex(Number(e.target.value))}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink/70 outline-none ring-1 ring-ink/10"
          >
            {PRICE_RANGES.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>

          {stores.data && stores.data.length > 0 ? (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink/70 outline-none ring-1 ring-ink/10"
            >
              <option value="">All stores</option>
              {stores.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}

          {filtersActive ? (
            <button
              onClick={resetFilters}
              className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-ink/50 underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-6 pt-6">
        {products.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : visible.length > 0 ? (
          <div className="grid animate-fade-in grid-cols-2 gap-5 md:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-display text-lg font-semibold">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink/50">
              {filtersActive
                ? "No gifts match these filters. Try widening them, or browse everything in this category."
                : "We're still adding gifts to this category. Have a look at what else is on CADO."}
            </p>
            {filtersActive ? (
              <button
                onClick={resetFilters}
                className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream transition-transform duration-150 active:scale-95"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/browse"
                className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream transition-transform duration-150 active:scale-95"
              >
                Browse all categories
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Stores in this category */}
      {stores.data && stores.data.length > 0 ? (
        <div className="mt-12 px-6">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">STORES IN THIS CATEGORY</h2>
          <div className="flex flex-col gap-4">
            {stores.data.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.id}`}
                className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl bg-ink transition-transform duration-150 active:scale-[0.98]"
              >
                <img
                  src={store.cover_image_url ?? `/categories/${slug}.jpg`}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="relative p-5">
                  <p className="font-display text-xl font-semibold text-white sm:text-2xl">{store.name}</p>
                  {store.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-white/70">{store.description}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
