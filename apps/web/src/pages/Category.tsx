import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProductsByCategory } from "../hooks/useProducts";
import { useStoresByCategory, useSubcategories } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton, Skeleton } from "../components/Skeleton";
import { Chip, RibbonEmpty } from "../components/ui";
import { BUDGETS, inBudgetRange } from "../lib/filters";

type Sort = "popular" | "newest" | "price_asc" | "price_desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

// Reuses the shared bands so this filter can't drift from the gift finder
// or the homepage budget pills.
const PRICE_RANGES = [{ slug: "any", label: "Any price", min: 0, max: null as number | null }, ...BUDGETS];

const PAGE = 12;

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [subcategory, setSubcategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<Sort>("popular");
  const [priceIndex, setPriceIndex] = useState(0);
  const [storeId, setStoreId] = useState<string>("");
  const [shown, setShown] = useState(PAGE);

  const categories = useCategories();
  const subcategories = useSubcategories(slug);
  const stores = useStoresByCategory(slug);
  const products = useProductsByCategory(slug, { subcategorySlug: subcategory, sort });

  const categoryName =
    categories.data?.find((c) => c.slug === slug)?.name ?? slug?.replace(/-/g, " ") ?? "";

  const rows = useMemo(() => products.data ?? [], [products.data]);

  const matches = (p: (typeof rows)[number], opts: { price?: number; store?: string }) => {
    const i = opts.price ?? priceIndex;
    if (i !== 0 && !inBudgetRange(p.price, PRICE_RANGES[i])) return false;
    const s = opts.store ?? storeId;
    if (s && p.partner?.id !== s) return false;
    return true;
  };

  // Price and store filter client-side: the query already caps the row set,
  // so this avoids a refetch on every tweak and lets the counts below be
  // exact rather than estimated.
  const visible = useMemo(
    () => rows.filter((p) => matches(p, {})),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, priceIndex, storeId]
  );

  /**
   * Counts are computed with the *other* filters still applied, so each
   * number is what you'd actually get by tapping it. A count that ignores
   * your current filters sends people into empty screens.
   */
  const priceCounts = useMemo(
    () => PRICE_RANGES.map((_, i) => rows.filter((p) => matches(p, { price: i })).length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, storeId]
  );
  const storeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of rows) {
      if (!matches(p, { store: "" })) continue;
      const id = p.partner?.id;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, priceIndex]);

  const filtersActive = priceIndex !== 0 || storeId !== "" || subcategory !== undefined;

  const resetFilters = () => {
    setPriceIndex(0);
    setStoreId("");
    setSubcategory(undefined);
  };

  // Reveal more as you reach the bottom, rather than making anyone hunt for
  // a "load more" button with a thumb.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(PAGE), [slug, subcategory, sort, priceIndex, storeId]);
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

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-caption text-muted">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <span>›</span>
          <span className="capitalize">{categoryName}</span>
        </nav>

        <h1 className="mt-2 font-display text-h1 capitalize">{categoryName}</h1>
        {products.isLoading ? (
          <Skeleton className="mt-1.5 h-3 w-20" />
        ) : (
          <p className="mt-1 text-caption text-muted">
            {visible.length} {visible.length === 1 ? "gift" : "gifts"}
          </p>
        )}
      </div>

      {subcategories.data && subcategories.data.length > 0 ? (
        <div className="scroll-row mt-4 gap-2 px-4">
          <Chip active={!subcategory} onClick={() => setSubcategory(undefined)}>
            All
          </Chip>
          {subcategories.data.map((sub) => (
            <Chip key={sub.id} active={subcategory === sub.slug} onClick={() => setSubcategory(sub.slug)}>
              {sub.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {/* Sticky filter bar. top-[57px] clears the sticky header so the two
          never double-stack. Chips apply instantly — no Apply button. */}
      <div className="sticky top-[57px] z-10 mt-4 border-y border-line bg-canvas/95 backdrop-blur">
        <div className="scroll-row gap-2 px-4 py-3">
          {SORTS.map((s) => (
            <Chip
              key={s.value}
              active={sort === s.value}
              onClick={() => setSort(s.value)}
              className="!h-9 !px-3.5 !text-caption"
            >
              {s.label}
            </Chip>
          ))}
          <span className="w-px shrink-0 self-stretch bg-line" />
          {PRICE_RANGES.map((r, i) =>
            // Hide bands that would land on an empty screen.
            i === 0 || priceCounts[i] > 0 ? (
              <Chip
                key={r.slug}
                active={priceIndex === i}
                onClick={() => setPriceIndex(i)}
                className="!h-9 !px-3.5 !text-caption"
              >
                {r.label}
                {i > 0 ? <span className="opacity-60"> {priceCounts[i]}</span> : null}
              </Chip>
            ) : null
          )}
          {stores.data && stores.data.length > 1 ? (
            <>
              <span className="w-px shrink-0 self-stretch bg-line" />
              {stores.data
                .filter((s) => (storeCounts.get(s.id) ?? 0) > 0)
                .map((s) => (
                  <Chip
                    key={s.id}
                    active={storeId === s.id}
                    onClick={() => setStoreId(storeId === s.id ? "" : s.id)}
                    className="!h-9 !px-3.5 !text-caption"
                  >
                    {s.name}
                    <span className="opacity-60"> {storeCounts.get(s.id)}</span>
                  </Chip>
                ))}
            </>
          ) : null}
          {filtersActive ? (
            <button
              onClick={resetFilters}
              className="shrink-0 px-2 text-caption font-medium text-muted underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-5">
        {products.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : visible.length > 0 ? (
          <>
            <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
              {visible.slice(0, shown).map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
            <div ref={sentinel} className="h-8" />
          </>
        ) : (
          <div className="py-14 text-center">
            <RibbonEmpty className="mx-auto h-14 w-14" />
            <p className="mt-3 font-display text-h2">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">
              {filtersActive
                ? "No gifts match these filters. Try widening them."
                : "We're still adding gifts to this category."}
            </p>
            {filtersActive ? (
              <button
                onClick={resetFilters}
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-7 text-body font-medium text-inverse"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/browse"
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-7 text-body font-medium text-inverse"
              >
                Browse all categories
              </Link>
            )}
          </div>
        )}
      </div>

      {stores.data && stores.data.length > 0 ? (
        <div className="mt-10 px-4">
          <h2 className="mb-3 text-eyebrow uppercase text-muted">Stores in this category</h2>
          <div className="flex flex-col gap-3">
            {stores.data.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.id}`}
                className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-card bg-ink transition-transform duration-fast active:scale-[0.98]"
              >
                <img
                  src={store.cover_image_url ?? `/categories/${slug}.jpg`}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="relative p-5">
                  <p className="font-display text-h2 text-white">{store.name}</p>
                  {store.description ? (
                    <p className="mt-1 line-clamp-2 text-caption text-white/70">{store.description}</p>
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
