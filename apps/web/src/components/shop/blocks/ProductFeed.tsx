import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { primaryImage } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { Img } from "../../Img";
import { ProductGridSkeleton } from "../../Skeleton";
import {
  applyFeedFilters,
  PRODUCT_CARD_COLUMNS,
  type FeedFilter,
  type FeedProduct,
  type FeedQuery,
} from "../../../lib/browse";

const PAGE_SIZE = 20;

function useFeed({
  categoryId,
  subcategoryId,
  filter,
  enabled,
}: {
  categoryId?: string;
  subcategoryId?: string;
  filter: FeedFilter;
  enabled: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ["shop-feed", categoryId ?? "all", subcategoryId ?? "", filter],
    enabled,
    initialPageParam: 0,
    getNextPageParam: (last: FeedProduct[], pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    queryFn: async ({ pageParam }) => {
      const base = supabase.from("products").select(PRODUCT_CARD_COLUMNS) as unknown as FeedQuery;
      const { data, error } = await applyFeedFilters(base, { categoryId, subcategoryId, filter }).range(
        pageParam as number,
        (pageParam as number) + PAGE_SIZE - 1
      );
      if (error) throw new Error(error.message);
      return (data ?? []) as FeedProduct[];
    },
  });
}

/**
 * One card in the staggered feed.
 *
 * Deliberately bare: photo, title, price, store. No star rating, no "N sold",
 * no bestseller rank — CADO has no review system and no public sales counts,
 * and a placeholder rating is a lie that happens to look like a feature.
 *
 * The photo keeps its natural shape, capped at 3:4, which is what staggers
 * the two columns. `aspect-ratio: auto` with a max is why the grid looks like
 * a feed rather than a spreadsheet.
 */
function FeedCard({ product, onStore }: { product: FeedProduct; onStore: (id: string, name: string) => void }) {
  const off =
    product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
      : null;

  return (
    <div className="mb-2 break-inside-avoid">
      <Link to={`/product/${product.id}`} className="block">
        <span className="block w-full overflow-hidden rounded-[8px] bg-surface-sunk">
          <Img
            src={primaryImage(product.product_images)}
            className="h-auto max-h-[min(74vw,340px)] w-full object-cover"
          />
        </span>
        <span className="mt-1.5 line-clamp-2 block text-[13px] leading-snug text-ink">{product.title}</span>
        <span className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold tracking-[-0.01em]">{formatMoney(product.price)}</span>
          {off != null && off > 0 ? (
            <span className="text-[11px] font-semibold text-alert">-{off}%</span>
          ) : null}
        </span>
      </Link>
      {product.partner ? (
        <button
          type="button"
          onClick={() => onStore(product.partner!.id, product.partner!.name)}
          className="mt-0.5 block max-w-full truncate text-left text-[11px] text-muted underline-offset-2 active:underline"
        >
          {product.partner.name}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The infinite two-column feed at the bottom of every tab.
 *
 * Loads the next page when a sentinel below the last card comes within a
 * screen of the viewport. The observer's root is the panel, not the window —
 * each tab is its own scroll container, so the default root would never
 * intersect and the feed would silently stop at twenty.
 */
export function ProductFeed({
  categoryId,
  subcategoryId,
  filter,
  enabled = true,
  onStore,
}: {
  categoryId?: string;
  subcategoryId?: string;
  filter: FeedFilter;
  enabled?: boolean;
  onStore: (id: string, name: string) => void;
}) {
  const feed = useFeed({ categoryId, subcategoryId, filter, enabled });
  const sentinel = useRef<HTMLDivElement | null>(null);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feed;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const root = el.closest(".panel") as HTMLElement | null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) fetchNextPage();
      },
      { root, rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const products = feed.data?.pages.flat() ?? [];

  if (feed.isLoading) {
    return (
      <div className="px-[var(--page-x)] pt-5">
        <ProductGridSkeleton count={6} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="px-[var(--page-x)] py-10 text-center text-body text-muted">
        Nothing here yet. Try another filter.
      </p>
    );
  }

  return (
    <div className="px-[var(--page-x)] pt-5">
      <div className="columns-2 gap-2">
        {products.map((p) => (
          <FeedCard key={p.id} product={p} onStore={onStore} />
        ))}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
      {isFetchingNextPage ? (
        <p className="py-4 text-center text-caption text-muted">Loading more…</p>
      ) : null}
    </div>
  );
}
