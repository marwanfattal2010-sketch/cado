import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";
import { useBrowseConfig } from "../hooks/useBrowseConfig";
import { useCategories } from "../hooks/useCategories";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { STRIP_OCCASIONS } from "../components/shop/blocks/OccasionStrip";

/**
 * /category/flowers?occasion=wedding — "Wedding flowers".
 *
 * Two filters at once, which is the thing a gift marketplace has to be able
 * to answer and a shop cannot: not "flowers", not "wedding gifts", but the
 * overlap. Both filters show as chips and either can be removed — take the
 * occasion off and you are back on the category tab; take the category off
 * and you are in every wedding gift on CADO.
 *
 * Cheapest first, on purpose: someone who has arrived with an occasion in
 * mind is usually deciding how much to spend, and the top of the list is
 * where that decision is easiest to make.
 *
 * Without `?occasion=` this route is the old category link, and still
 * redirects to the tab.
 */
export function CategoryOccasion() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const occasion = params.get("occasion");
  const { hrefForCategory, isLoading: configLoading } = useBrowseConfig();
  const categories = useCategories();

  const category = categories.data?.find((c) => c.slug === slug);
  const meta = STRIP_OCCASIONS.find((o) => o.value === occasion);

  const products = useQuery({
    queryKey: ["category-occasion", slug ?? "", occasion ?? ""],
    enabled: !!category?.id && !!occasion,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeedProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .eq("category_id", category!.id)
        .contains("occasion_tags", [occasion as string])
        .order("price", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });

  /** "Wedding flowers" — the occasion first, because that is what they came
   *  with. Falls back to the plain category name if the tag is unknown. */
  const heading = useMemo(() => {
    const cat = category?.name ?? slug ?? "gifts";
    return meta ? `${meta.label} ${cat.toLowerCase()}` : cat;
  }, [meta, category?.name, slug]);

  // No occasion on the URL: this is the old /category/:slug link.
  if (!occasion) {
    if (configLoading) return <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" />;
    return <Navigate to={slug ? hrefForCategory(slug) : "/"} replace />;
  }

  const rows = products.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-h1">{heading}</h1>

      {/* Both filters, both removable. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip to={slug ? hrefForCategory(slug) : "/"} label={meta?.label ?? occasion} />
        <Chip to={`/gift-finder?occasion=${occasion}`} label={category?.name ?? slug ?? ""} />
      </div>

      {products.isLoading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={6} />
        </div>
      ) : rows.length === 0 ? (
        /* Nothing tagged for this pair. The strip hides tiles with no stock,
           so this is only reachable by a hand-typed URL — it says so plainly
           rather than showing an empty grid. */
        <div className="mt-10 text-center">
          <p className="text-body text-muted">
            Nothing here for {meta?.label.toLowerCase() ?? occasion} yet.
          </p>
          <Link
            to={`/gift-finder?occasion=${occasion}`}
            className="mt-4 inline-block text-body font-medium text-ink underline underline-offset-4"
          >
            See all {meta?.label.toLowerCase() ?? occasion} gifts →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-caption text-muted">
            {rows.length} {rows.length === 1 ? "gift" : "gifts"} · cheapest first
          </p>
          <div className="mt-4 grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4">
            {rows.map((p) => (
              <ProductCard key={p.id} {...p} compact />
            ))}
          </div>
          <Link
            to={`/gift-finder?occasion=${occasion}`}
            className="mt-6 block text-center text-body font-medium text-ink underline underline-offset-4"
          >
            See all {meta?.label.toLowerCase() ?? occasion} gifts →
          </Link>
        </>
      )}
      <div className="h-24" />
    </div>
  );
}

/** A filter you can take off — tapping it removes that half of the pair. */
function Chip({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center gap-1.5 rounded-[4px] border border-ink bg-ink px-3 text-[13px] font-medium text-inverse"
    >
      {label}
      <span aria-hidden className="text-inverse/70">
        ×
      </span>
    </Link>
  );
}
