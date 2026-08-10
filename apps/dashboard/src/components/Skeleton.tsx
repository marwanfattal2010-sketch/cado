/** Skeleton loaders — the spec insists on these instead of spinners. */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
      <SkeletonLine className="mb-3 w-1/3" />
      <SkeletonLine className="mb-2 w-2/3" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
