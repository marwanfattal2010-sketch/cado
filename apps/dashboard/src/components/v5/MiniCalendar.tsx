"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A month at a glance (V5 §1.8). Each day carries a dot sized by how many
 * orders were placed that day, and a persimmon marker on days with a dated
 * occasion. Clicking a day filters Recent orders to it.
 *
 * The counts are real rows from admin_orders_by_day; a day with no orders has
 * no dot rather than a faint one, because a faint dot reads as "a little" and
 * the truth is "none".
 */

export type DayCount = { day: string; orders: number };
export type OccasionMark = { id: string; title: string; event_date: string };

const KEY = (d: Date) => d.toISOString().slice(0, 10);

export function MiniCalendar({
  counts,
  occasions,
  selected,
}: {
  counts: DayCount[];
  occasions: OccasionMark[];
  selected?: string;
}) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const router = useRouter();

  const byDay = new Map(counts.map((c) => [c.day, Number(c.orders)]));
  const occByDay = new Map(occasions.map((o) => [o.event_date.slice(0, 10), o]));

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first, which is how a week runs here.
  const lead = (first.getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const shift = (by: number) => setView(new Date(year, month + by, 1));

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">
          {view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted hover:bg-surface-sunk hover:text-ink">
            <ChevronLeft size={15} />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted hover:bg-surface-sunk hover:text-ink">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-1 grid grid-cols-7 text-center text-[10.5px] text-muted">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const key = KEY(d);
            const n = byDay.get(key) ?? 0;
            const occ = occByDay.get(key);
            const isToday = KEY(today) === key;
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => router.push(isSelected ? "/admin" : `/admin?day=${key}`)}
                title={
                  [n > 0 ? `${n} order${n === 1 ? "" : "s"}` : null, occ?.title].filter(Boolean).join(" · ") ||
                  undefined
                }
                className={`relative flex h-9 flex-col items-center justify-center rounded-[8px] text-[12px] transition-colors ${
                  isSelected
                    ? "bg-ribbon text-white"
                    : isToday
                      ? "border border-ribbon text-ink"
                      : "text-secondary hover:bg-surface-sunk"
                }`}
              >
                {d.getDate()}
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {n > 0 ? (
                    <span
                      className="rounded-pill"
                      style={{
                        width: n > 4 ? 8 : n > 1 ? 5 : 3,
                        height: 3,
                        background: isSelected ? "#fff" : "var(--tint-sky)",
                      }}
                    />
                  ) : null}
                  {occ ? (
                    <span className="h-1.5 w-1.5 rounded-pill" style={{ background: "var(--ribbon)" }} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {occasions.length > 0 ? (
          <div className="mt-2 border-t border-line pt-2">
            {occasions.slice(0, 2).map((o) => (
              <Link
                key={o.id}
                href="/admin/marketing"
                className="flex items-center gap-1.5 py-0.5 text-[11.5px] text-secondary hover:text-ink"
              >
                <span className="h-1.5 w-1.5 rounded-pill" style={{ background: "var(--ribbon)" }} />
                {new Date(o.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
                {o.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
