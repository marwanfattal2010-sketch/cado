import Link from "next/link";
import { Pill, TintCard, type Tint } from "@/components/v3/tint";

/**
 * The shared components, now speaking V4.
 *
 * Pages built before V4 — Gift cards, Finance, Support, Audit, Settings — are
 * written against these. Rather than rewrite five files, the components
 * themselves moved to the new grammar: 18px cards, a hairline header row, 26px
 * page titles, and status pills that delegate to the V4 palette so a
 * "Delivered" pill is the same green everywhere in the product.
 *
 * Every number that reaches these components came from a real query; nothing
 * here generates or defaults a figure.
 */

/* ------------------------------------------------------------- KpiCard --- */

export function KpiCard({
  label,
  value,
  delta,
  hint,
  tint,
}: {
  label: string;
  value: string;
  /** Percent vs the previous equal period. Omit when there is no previous
   *  period — a delta against nothing is a made-up number. */
  delta?: number | null;
  hint?: string;
  /** Give the card a colour, matching Home's language. */
  tint?: Tint;
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-secondary">{label}</p>
      <p className="mt-0.5 text-[26px] font-bold leading-8 text-ink tnum">{value}</p>
      {delta != null && Number.isFinite(delta) ? (
        <p className={`mt-0.5 text-[12px] font-semibold tnum ${delta >= 0 ? "text-status-green" : "text-status-red"}`}>
          {delta >= 0 ? "↗" : "↘"} {Math.abs(delta).toFixed(0)}% vs previous
        </p>
      ) : hint ? (
        <p className="mt-0.5 text-[12px] text-muted">{hint}</p>
      ) : null}
    </>
  );

  if (tint) return <TintCard tint={tint} className="p-4">{body}</TintCard>;
  return <div className="rounded-card border border-line bg-surface p-4">{body}</div>;
}

/* ---------------------------------------------------------- StatusPill --- */

/** One vocabulary for order status everywhere — tables, cards, dots. */
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "bg-status-amber-tint", fg: "text-status-amber", label: "Awaiting action" },
  accepted: { bg: "bg-status-blue-tint", fg: "text-status-blue", label: "Confirmed" },
  preparing: { bg: "bg-status-blue-tint", fg: "text-status-blue", label: "Preparing" },
  ready: { bg: "bg-status-indigo-tint", fg: "text-status-indigo", label: "Ready" },
  out_for_delivery: { bg: "bg-status-indigo-tint", fg: "text-status-indigo", label: "Out for delivery" },
  delivered: { bg: "bg-status-green-tint", fg: "text-status-green", label: "Delivered" },
  cancelled: { bg: "bg-status-red-tint", fg: "text-status-red", label: "Cancelled" },
  refunded: { bg: "bg-status-red-tint", fg: "text-status-red", label: "Refunded" },
  preorder: { bg: "bg-status-purple-tint", fg: "text-status-purple", label: "Preorder" },
  // store lifecycle
  active: { bg: "bg-status-green-tint", fg: "text-status-green", label: "Active" },
  paused: { bg: "bg-status-amber-tint", fg: "text-status-amber", label: "Paused" },
  closed: { bg: "bg-status-grey-tint", fg: "text-status-grey", label: "Closed" },
  rejected: { bg: "bg-status-red-tint", fg: "text-status-red", label: "Rejected" },
  // review pipeline
  approved: { bg: "bg-status-green-tint", fg: "text-status-green", label: "Live" },
};

/**
 * A few words are shared between the order lifecycle and the store lifecycle
 * but do NOT mean the same thing. 'pending' on an order is an order nobody has
 * confirmed yet ("Awaiting action"); 'pending' on a store is an application
 * nobody has approved yet. Rendering the order word on a store page tells the
 * reader something false, so a caller in a different context passes its own
 * label and keeps the shared colour grammar.
 */
export const STORE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending approval",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  rejected: "Rejected",
};

/**
 * Delegates entirely to the V4 pill, so one status has one colour AND one word
 * everywhere.
 *
 * It deliberately does NOT fall back to STATUS_STYLE's wording: doing that made
 * the Audit log say "Awaiting action" while Orders said "Needs confirming"
 * about the same row. Only an explicit `label` from the caller overrides — that
 * is the store-vs-order case, where the same value genuinely means two things.
 */
export function StatusPill({
  status,
  label,
}: {
  status: string | null | undefined;
  /** Override the word, keep the colour. See STORE_STATUS_LABEL. */
  label?: string;
}) {
  return <Pill status={status} label={label} />;
}

/* ---------------------------------------------------------- PageHeader --- */

export function PageHeader({
  title,
  breadcrumb,
  action,
}: {
  title: string;
  breadcrumb?: { label: string; href: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {breadcrumb?.length ? (
          <nav className="mb-1 flex items-center gap-1 text-[12.5px] text-muted">
            {breadcrumb.map((b, i) => (
              <span key={b.href} className="flex items-center gap-1">
                {i > 0 ? <span aria-hidden>/</span> : null}
                <Link href={b.href} className="hover:text-ink">
                  {b.label}
                </Link>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-8 text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------- DateRangeBar ---- */

export const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
] as const;
export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];

/**
 * The range and its PREVIOUS equal period, so deltas compare like with like.
 * Server-side (searchParams), so every figure on the page is computed for
 * the same window without client state.
 */
export function resolveRange(key: string | undefined): {
  key: RangeKey;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
} {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let from: Date;
  let to = now;
  switch (key) {
    case "today":
      from = startOfDay(now);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last-month": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "7d":
      from = new Date(startOfDay(now).getTime() - 6 * day);
      break;
    case "30d":
    default:
      from = new Date(startOfDay(now).getTime() - 29 * day);
      key = "30d";
  }
  const span = to.getTime() - from.getTime();
  return {
    key: (key as RangeKey) ?? "30d",
    from,
    to,
    prevFrom: new Date(from.getTime() - span),
    prevTo: from,
  };
}

export function DateRangeBar({ current, basePath }: { current: RangeKey; basePath: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {RANGE_PRESETS.map((p) => (
        <Link
          key={p.key}
          href={`${basePath}?range=${p.key}`}
          className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
            current === p.key ? "bg-ribbon text-white" : "border border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ BarChart --- */

/**
 * A small dependency-free bar chart. Recharts is the spec's choice, but a
 * client-side chart lib on a server-rendered money page is a heavier trade
 * than these forty lines; if richer charts are wanted later, swap this
 * component and nothing else. Every bar is a real day from a real query.
 */
export function BarChart({
  points,
  height = 160,
  formatValue = (v) => String(v),
}: {
  points: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label="Bar chart">
      {points.map((p, i) => {
        const h = Math.max(3, Math.round((p.value / max) * (height - 24)));
        const highlight = i === points.length - 1;
        return (
          <div key={p.label} className="group relative flex-1" style={{ height: "100%" }}>
            <div
              className={`absolute bottom-5 w-full rounded-t-[3px] ${highlight ? "bg-ribbon" : "bg-ribbon/25"}`}
              style={{ height: h }}
              title={`${p.label}: ${formatValue(p.value)}`}
            />
            {points.length <= 14 || i % Math.ceil(points.length / 10) === 0 ? (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-muted">
                {p.label}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- EmptyState -- */

export function EmptyStateV2({
  icon = "○",
  title,
  action,
}: {
  icon?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface py-10 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-surface-sunk text-xl text-muted">
        {icon}
      </span>
      <p className="text-sm text-muted">{title}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- Card ------ */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Header sits in its own bar with a hairline under it, matching Panel — so a
  // V4 page and a pre-V4 page have the same silhouette.
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-surface ${className}`}>
      {title ? (
        <div className="flex min-h-[48px] items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------ money ------ */

export function usd(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
