/** A dense number tile — the Toters-merchant idiom: figure first, label under it. */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
      <p className="font-display text-2xl tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export function money(n: number | string | null | undefined): string {
  return `$${Number(n ?? 0).toFixed(2)}`;
}
