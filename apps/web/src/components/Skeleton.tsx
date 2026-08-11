/**
 * Loading placeholders are shaped like the thing they replace, so nothing
 * moves when real content arrives. The shimmer itself lives in index.css
 * as .skeleton so it uses the same token gradient everywhere.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-card ${className}`} />;
}

/**
 * The text block under a product photo, reserved to the exact line boxes
 * ProductCard renders.
 *
 * The numbers are not eyeballed — they are the type scale:
 *   store  text-store        12px x 1.35 = 16.2px  -> h-[16px]
 *   name   text-product-name 14px x 1.375 (leading-snug), two lines
 *                            = 38.5px             -> h-[39px]
 *   price  text-price        16px x 1.2  = 19.2px  -> h-[19px]
 *
 * Two lines for the name because that is what a real card gives it
 * (line-clamp-2), and reserving one line is what made a loading row 20px
 * shorter than the row that replaced it.
 */
function CardText({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className={`${compact ? "mt-1.5" : "mt-2.5"} flex h-[16px] items-center`}>
        <Skeleton className="h-[9px] w-2/5" />
      </div>
      <div className="mt-0.5 flex h-[39px] flex-col justify-center gap-[7px]">
        <Skeleton className="h-[9px] w-full" />
        <Skeleton className="h-[9px] w-3/5" />
      </div>
      <div className={`${compact ? "mt-0.5" : "mt-1"} flex h-[19px] items-center`}>
        <Skeleton className="h-[11px] w-1/3" />
      </div>
    </>
  );
}

/** One card's footprint: a square photo slot plus the reserved text block. */
export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <Skeleton className="aspect-square w-full" />
      <CardText compact={compact} />
    </div>
  );
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
        <ProductCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

/** Same card shape, laid out as a horizontal row.
 *
 *  w-[42vw] sm:w-[190px] is not a guess: it is the width every real product
 *  row on the site gives its cards (Home's ProductRow, the category page's
 *  "New in …"). The skeleton used to be w-[44vw] sm:w-[180px], which made the
 *  placeholder photo ~8px taller than the photo that replaced it on mobile
 *  and 10px narrower on desktop — a reflow of everything below the row. */
export function ProductRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="scroll-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[42vw] shrink-0 sm:w-[190px]">
          <Skeleton className="aspect-square w-full" />
          <CardText />
        </div>
      ))}
    </div>
  );
}
