"use client";

import { useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Revenue over time. Two series the user toggles between: what customers paid
 * (GMV) and what CADO kept (commission + delivery). Both come from
 * admin_finance_breakdown — this component does no arithmetic beyond formatting.
 */

type Point = { day: string; gmv: number; earned: number };

const SERIES = [
  { key: "gmv", label: "Revenue" },
  { key: "earned", label: "CADO earned" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function RevenueChart({ points }: { points: Point[] }) {
  const [series, setSeries] = useState<SeriesKey>("gmv");

  return (
    <div>
      <div className="mb-2 flex gap-1 px-1">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSeries(s.key)}
            className={`rounded-card px-2.5 py-1 text-[12px] font-medium transition-colors ${
              series === s.key ? "bg-ribbon-tint text-ribbon" : "text-muted hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ribbon)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--ribbon)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day" tickFormatter={shortDay} tickLine={false} axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }} minTickGap={20}
            />
            <YAxis
              tickFormatter={(v) => `$${Number(v).toLocaleString()}`} tickLine={false} axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={64}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--text)",
              }}
              labelFormatter={(v) => shortDay(String(v))}
              formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, series === "gmv" ? "Revenue" : "CADO earned"] as [string, string]}
            />
            <Area
              type="monotone" dataKey={series} stroke="var(--ribbon)" strokeWidth={2}
              fill="url(#fillAccent)" isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
