/**
 * Loading placeholders are shaped like the thing they replace, so nothing
 * moves when real content arrives. The shimmer itself lives in index.css
 * as .skeleton so it uses the same token gradient everywhere.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-card ${className}`} />;
}

/** Matches the ProductCard grid exactly — image, store, name, price.
 *  `compact` mirrors ProductCard's compact spacing, so the trending grid
 *  reserves the height it is about to need and nothing moves on swap. */
export function ProductGridSkeleton({
  count = 8,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 ${compact ? "gap-x-3 gap-y-4" : "gap-3"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className={`${compact ? "mt-1.5" : "mt-2.5"} h-3 w-2/5`} />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className={`${compact ? "mt-1.5" : "mt-2"} h-4 w-1/3`} />
        </div>
      ))}
    </div>
  );
}

/** Same card shape, laid out as a horizontal row. */
export function ProductRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="scroll-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[44vw] shrink-0 sm:w-[180px]">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-2.5 h-3 w-2/5" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
