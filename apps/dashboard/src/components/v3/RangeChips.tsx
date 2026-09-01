"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { V4_RANGES, RANGE_KEY, type V4Range } from "@/lib/range";

/**
 * The range chips. The resolution logic lives in @/lib/range so server pages
 * can use it too — a server component cannot call a function exported from a
 * "use client" module.
 *
 * The choice is remembered per browser. On a visit with no ?range= in the URL,
 * a saved choice redirects once, so the remembered range is also a shareable
 * link rather than a hidden preference.
 */
export function RangeChips({
  current,
  basePath,
  explicit,
}: {
  current: V4Range;
  basePath: string;
  /** True when ?range= was in the URL — then the user's click wins. */
  explicit: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (explicit) {
      try {
        localStorage.setItem(RANGE_KEY, current);
      } catch {
        /* private mode */
      }
      return;
    }
    try {
      const saved = localStorage.getItem(RANGE_KEY);
      if (saved && saved !== current && V4_RANGES.some((r) => r.key === saved)) {
        router.replace(`${basePath}?range=${saved}`);
      }
    } catch {
      /* private mode: the 30-day default stands */
    }
  }, [explicit, current, basePath, router]);

  return (
    <div className="flex flex-wrap gap-1 rounded-pill border border-line bg-surface p-1">
      {V4_RANGES.map((r) => {
        const on = r.key === current;
        return (
          <Link
            key={r.key}
            href={`${basePath}?range=${r.key}`}
            aria-current={on ? "true" : undefined}
            className={`rounded-pill px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              on ? "bg-ribbon text-white" : "text-secondary hover:text-ink"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
