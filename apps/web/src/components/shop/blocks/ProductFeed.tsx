import { useEffect, useRef, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { ProductGridSkeleton } from "../../Skeleton";
import { ProductCard } from "../../ProductCard";
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
  renderAfter,
  afterIndex = 8,
}: {
  categoryId?: string;
  subcategoryId?: string;
  filter: FeedFilter;
  enabled?: boolean;
  /**
   * Slotted into the page once this many cards have been laid out. The store
   * strip goes here, which is the whole point: products come first, and the
   * shops are something you meet on the way down rather than a wall you have
   * to get past before seeing anything for sale.
   */
  renderAfter?: ReactNode;
  afterIndex?: number;
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

  /**
   * The strip breaks the feed into two runs rather than sitting inside it.
   *
   * This used to be a `columns-2` masonry, which is what left the ragged
   * empty blocks: a portrait photo made one column taller and the next card
   * started wherever the previous one happened to end. It is a real grid now,
   * with every card the same height, so the split is only about where the
   * full-width strip goes — not about the layout falling out of step.
   */
  const head = renderAfter ? products.slice(0, afterIndex) : products;
  const tail = renderAfter ? products.slice(afterIndex) : [];

  return (
    <div className="pt-5">
      <div className="grid grid-cols-2 gap-x-2 gap-y-[10px] px-[var(--page-x)]">
        {head.map((p) => (
          <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
        ))}
      </div>
      {renderAfter && products.length > afterIndex ? renderAfter : null}
      {tail.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-[10px] px-[var(--page-x)] pt-4">
          {tail.map((p) => (
            <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
          ))}
        </div>
      ) : null}
      <div ref={sentinel} aria-hidden className="h-px" />
      {isFetchingNextPage ? (
        <p className="py-4 text-center text-caption text-muted">Loading more…</p>
      ) : null}
    </div>
  );
}
