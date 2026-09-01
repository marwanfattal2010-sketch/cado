import Link from "next/link";
import { Pill } from "./tint";

/**
 * V3 primitives. One density for the whole back-office: 12px radius, hairline
 * border, no drop shadow on dark, 44px table rows, 13px table text. Nothing on
 * any page may be looser than this.
 */

/* ------------------------------------------------------------- Panel ----- */

export function Panel({
  title,
  action,
  children,
  className = "",
  bodyClass = "p-4",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-surface ${className}`}>
      {title ? (
        <div className="flex h-11 items-center justify-between gap-2 border-b border-line px-4">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------- PageHeading ---- */

export function PageHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold leading-7 text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-secondary">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------ money ------ */

export function usd(v: number | string | null | undefined, dp = 2): string {
  const n = Number(v ?? 0);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
/** Compact for KPI headlines: $2,237 not $2,237.00, but $12.50 keeps its cents. */
export function usdShort(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? usd(n, 0) : usd(n, 2);
}

/* ------------------------------------------------------------- KPI ------- */

export function Kpi({
  label,
  value,
  current,
  previous,
  hadPrevious,
  spark,
  hint,
  money = true,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  /** False when there is genuinely no earlier period — say so, never "+0%". */
  hadPrevious?: boolean;
  spark?: number[];
  hint?: string;
  money?: boolean;
}) {
  const showDelta =
    hadPrevious === true && current !== undefined && previous !== undefined && previous !== 0;
  const diff = showDelta ? (current as number) - (previous as number) : 0;
  const pct = showDelta ? (diff / (previous as number)) * 100 : 0;
  const up = diff >= 0;

  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <p className="text-[12px] font-medium text-secondary">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-8 tracking-tight text-ink tnum">{value}</p>
      {showDelta ? (
        <p className={`mt-0.5 text-[12px] font-medium tnum ${up ? "text-status-green" : "text-status-red"}`}>
          {up ? "+" : "−"}
          {money ? usdShort(Math.abs(diff)) : Math.abs(diff).toLocaleString()} · {up ? "+" : "−"}
          {Math.abs(pct).toFixed(0)}%
        </p>
      ) : (
        <p className="mt-0.5 text-[12px] text-muted">{hint ?? "No previous data"}</p>
      )}
      {spark && spark.length > 1 ? <Sparkline points={spark} /> : null}
    </div>
  );
}

/**
 * A real sparkline: the same daily values the KPI was summed from. If it were
 * decorative it would not be here.
 */
export function Sparkline({ points, height = 26 }: { points: number[]; height?: number }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const w = 100;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(height - ((p - min) / span) * height).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} height={height} className="mt-2 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="var(--ribbon)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------------------------------------------------------- StatusPill --- */

/**
 * ONE status vocabulary for the whole back-office, in the words the people
 * using it would say. The database values stay as they are — `ready` really
 * does mean ready for pickup, `out_for_delivery` really does mean the driver
 * has it — and this is where those become readable.
 */
const STATUS: Record<string, { tint: string; fg: string; label: string }> = {
  pending: { tint: "bg-status-amber-tint", fg: "text-status-amber", label: "Needs confirming" },
  accepted: { tint: "bg-status-blue-tint", fg: "text-status-blue", label: "Confirmed" },
  preparing: { tint: "bg-status-blue-tint", fg: "text-status-blue", label: "Preparing" },
  ready: { tint: "bg-status-indigo-tint", fg: "text-status-indigo", label: "Ready for pickup" },
  out_for_delivery: { tint: "bg-status-indigo-tint", fg: "text-status-indigo", label: "With driver" },
  delivered: { tint: "bg-status-green-tint", fg: "text-status-green", label: "Delivered" },
  cancelled: { tint: "bg-status-red-tint", fg: "text-status-red", label: "Cancelled" },
  refunded: { tint: "bg-status-red-tint", fg: "text-status-red", label: "Refunded" },
  // store lifecycle
  active: { tint: "bg-status-green-tint", fg: "text-status-green", label: "Active" },
  paused: { tint: "bg-status-amber-tint", fg: "text-status-amber", label: "Paused" },
  closed: { tint: "bg-status-grey-tint", fg: "text-status-grey", label: "Closed" },
  rejected: { tint: "bg-status-red-tint", fg: "text-status-red", label: "Rejected" },
  // payment / payouts
  paid: { tint: "bg-status-green-tint", fg: "text-status-green", label: "Paid" },
  unpaid: { tint: "bg-status-amber-tint", fg: "text-status-amber", label: "Unpaid" },
  approved: { tint: "bg-status-green-tint", fg: "text-status-green", label: "Live" },
};

/**
 * Delegates to the V4 pill so one status has one colour and one word across
 * the product. STATUS above stays as the fallback wording for values the V4
 * map does not carry.
 */
export function StatusPill({ status, label }: { status: string | null | undefined; label?: string }) {
  return <Pill status={status} label={label} />;
}

/** The same words, without the pill — for a store's status line, say. */
export const statusLabel = (s: string | null | undefined) => STATUS[s ?? ""]?.label ?? s ?? "—";

/* ----------------------------------------------------------- Empty ------- */

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      <p className="text-[13px] text-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-[12px] text-muted">{hint}</p> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------- Buttons ----- */

export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-card bg-ribbon px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-ribbon-deep disabled:opacity-50";
export const btnGhost =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-card border border-line bg-surface px-3 text-[13px] font-medium text-secondary transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50";

/* ------------------------------------------------------- Range control --- */

export const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

/** Home defaults to Today (§4); other pages pass their own default. */
export function resolveRange(key: string | undefined, fallback: RangeKey = "today") {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = 86_400_000;
  let k = (RANGES.find((r) => r.key === key)?.key ?? fallback) as RangeKey;
  let from: Date;
  let to = now;
  switch (k) {
    case "today":
      from = startOfDay(now);
      break;
    case "7d":
      from = new Date(startOfDay(now).getTime() - 6 * day);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last-month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "30d":
    default:
      from = new Date(startOfDay(now).getTime() - 29 * day);
      k = "30d";
  }
  return { key: k, from, to };
}

export function RangeBar({ current, basePath }: { current: RangeKey; basePath: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {RANGES.map((r) => (
        <Link
          key={r.key}
          href={`${basePath}?range=${r.key}`}
          className={`rounded-card px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
            current === r.key
              ? "bg-ribbon-tint text-ribbon"
              : "border border-line text-secondary hover:text-ink"
          }`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
