import type { CSSProperties } from "react";

/**
 * V4 tinted cards. One recipe (`.tint-card` in globals.css), six colours, set
 * per card through the --tint custom property. The point is that a glance tells
 * you which card you are looking at: revenue is always coral, orders always
 * amber, money owed always mint.
 */

export type Tint = "coral" | "amber" | "mint" | "sky" | "rose" | "violet";

export const tintVar = (t: Tint): CSSProperties =>
  ({ ["--tint" as string]: `var(--tint-${t})` }) as CSSProperties;

/** A tinted surface. Everything else about it is up to the caller. */
export function TintCard({
  tint,
  className = "",
  children,
  style,
}: {
  tint: Tint;
  className?: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className={`tint-card rounded-card ${className}`} style={{ ...tintVar(tint), ...style }}>
      {children}
    </div>
  );
}

/** The 36×36 icon square that sits top-left of every tinted card. */
export function TintChip({ children, size = 36 }: { children: React.ReactNode; size?: number }) {
  return (
    <span
      className="tint-chip flex items-center justify-center rounded-[10px]"
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

/**
 * A real sparkline: the same daily values the number above it was summed from.
 * Two points or fewer and it draws a flat dashed line instead — a curve invented
 * from one data point is a lie about a trend.
 */
export function Spark({ points, height = 40 }: { points: number[]; height?: number }) {
  const w = 100;
  const id = `sf-${points.length}-${Math.round(points.reduce((a, b) => a + b, 0))}`;

  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${height}`} height={height} className="w-full" preserveAspectRatio="none" aria-hidden>
        <line
          x1="0" y1={height / 2} x2={w} y2={height / 2}
          stroke="var(--tint)" strokeOpacity="0.5" strokeWidth="1.5"
          strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const y = (v: number) => height - 4 - ((v - min) / span) * (height - 8);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${y(p).toFixed(2)}`).join(" ");
  const fill = `${line} L ${w} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} height={height} className="w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tint)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--tint)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--tint)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* -------------------------------------------------------- status pills --- */

/**
 * V4 status colours. Same database values, the --st-* palette, and the words a
 * person would actually say.
 */
const ST: Record<string, { v: string; label: string }> = {
  pending: { v: "--st-new", label: "Needs confirming" },
  accepted: { v: "--st-preparing", label: "Confirmed" },
  preparing: { v: "--st-preparing", label: "Preparing" },
  ready: { v: "--st-preparing", label: "Ready for pickup" },
  out_for_delivery: { v: "--st-out", label: "Out for delivery" },
  delivered: { v: "--st-delivered", label: "Delivered" },
  cancelled: { v: "--st-cancelled", label: "Cancelled" },
  refunded: { v: "--st-cancelled", label: "Refunded" },
  active: { v: "--st-delivered", label: "Active" },
  paused: { v: "--st-pending", label: "Paused" },
  closed: { v: "--st-pending", label: "Closed" },
  rejected: { v: "--st-cancelled", label: "Rejected" },
  paid: { v: "--st-delivered", label: "Paid" },
  unpaid: { v: "--st-preparing", label: "Unpaid" },
};

export function Pill({ status, label }: { status: string | null | undefined; label?: string }) {
  const s = ST[status ?? ""] ?? { v: "--st-pending", label: status ?? "—" };
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-[11.5px] font-medium"
      style={{
        color: `var(${s.v})`,
        background: `color-mix(in srgb, var(${s.v}) 16%, transparent)`,
      }}
    >
      {label ?? s.label}
    </span>
  );
}

export const pillLabel = (s: string | null | undefined) => ST[s ?? ""]?.label ?? s ?? "—";

/**
 * 'pending' means two different things in CADO and they share a colour, not a
 * word: an order nobody has confirmed, and a store nobody has approved. A store
 * page passes these so it never says "Needs confirming" about a shop.
 */
export const STORE_LABEL: Record<string, string> = {
  pending: "Pending approval",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  rejected: "Rejected",
};

/* ------------------------------------------------------------- avatar ---- */

export function Initials({ name, size = 32 }: { name: string | null | undefined; size?: number }) {
  const label = (name ?? "").trim();
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  // Deterministic tint per person, so the same customer looks the same twice.
  const tints: Tint[] = ["coral", "amber", "mint", "sky", "rose", "violet"];
  const pick = tints[[...label].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-pill font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: `var(--tint-${pick})`,
        background: `color-mix(in srgb, var(--tint-${pick}) 18%, transparent)`,
      }}
    >
      {initials}
    </span>
  );
}
