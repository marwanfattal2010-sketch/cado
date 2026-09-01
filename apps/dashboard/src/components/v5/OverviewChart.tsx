"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Twelve calendar months (V5 §1.5).
 *
 * Months with no orders are drawn as real zero bars, not skipped — a gap reads
 * as missing data, a zero reads as a quiet month, and only one of those is
 * true. The average is over months that ACTUALLY had an order, so opening in
 * August doesn't make the last eleven empty months halve the figure.
 *
 * Clicking a month filters Recent orders to it via the URL, so the filtered
 * view is shareable and the back button undoes it.
 */

export type MonthPoint = { month: string; revenue: number; orders: number };

const label = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short" });

const usd = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function OverviewChart({ points }: { points: MonthPoint[] }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const router = useRouter();

  const active = points.filter((p) => Number(p.orders) > 0);
  const totalRevenue = points.reduce((n, p) => n + Number(p.revenue), 0);
  const totalOrders = points.reduce((n, p) => n + Number(p.orders), 0);
  const avgRevenue = active.length ? totalRevenue / active.length : 0;
  const avgOrders = active.length ? totalOrders / active.length : 0;

  const thisMonth = points.length ? points[points.length - 1].month : null;

  return (
    /* h-full + a flexing chart: this card is the SHORT one in its row, and
       letting it stretch is what closes the gap under it. */
    <section className="flex h-full flex-col rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Overview</h2>
          <p className="mt-0.5 text-[12.5px] text-secondary tnum">
            {active.length === 0 ? (
              "No orders in the last 12 months"
            ) : (
              <>
                Avg per month <span className="font-semibold text-ink">{usd(avgRevenue)}</span>
                <span className="mx-1.5 text-muted">·</span>
                {avgOrders.toFixed(1)} orders/month
              </>
            )}
          </p>
        </div>
        <div className="flex gap-1 rounded-pill border border-line p-1">
          {(["revenue", "orders"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`rounded-pill px-3 py-1 text-[12.5px] font-medium capitalize transition-colors ${
                metric === m ? "bg-ribbon text-white" : "text-secondary hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[240px] flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -14 }}
            onClick={(e) => {
              // Recharts' click param types don't expose activePayload, but it
              // is what carries the clicked bar's row.
              const p = (e as unknown as { activePayload?: { payload: MonthPoint }[] })
                ?.activePayload?.[0]?.payload;
              if (p) router.push(`/admin?month=${p.month}`);
            }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month" tickFormatter={label} tickLine={false} axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => (metric === "revenue" ? usd(Number(v)) : String(v))}
              tickLine={false} axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={58}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in srgb, var(--ribbon) 8%, transparent)" }}
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--text)",
              }}
              labelFormatter={(v) =>
                new Date(String(v)).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
              }
              formatter={(_v, _n, item) => {
                const p = item?.payload as MonthPoint;
                return [`${usd(Number(p.revenue))} · ${p.orders} orders`, ""] as [string, string];
              }}
            />
            <Bar dataKey={metric} radius={[6, 6, 0, 0]} isAnimationActive={false} cursor="pointer">
              {points.map((p) => (
                <Cell
                  key={p.month}
                  fill={
                    p.month === thisMonth
                      ? "var(--ribbon)"
                      : "color-mix(in srgb, var(--ribbon) 26%, transparent)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
