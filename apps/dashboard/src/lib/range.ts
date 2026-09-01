/**
 * Date ranges, shared by server pages and the client chip bar.
 *
 * This lives outside RangeChips.tsx because that file is "use client", and a
 * server component calling a function exported from a client module fails at
 * runtime ("it can only be rendered as a Component"). Plain data and pure
 * functions belong in a module neither side owns.
 */

export const V4_RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
] as const;

export type V4Range = (typeof V4_RANGES)[number]["key"];

export const RANGE_KEY = "cado-range";

/** Words for the range, for sentences like "up 12% on the previous 30 days". */
export const RANGE_WORDS: Record<V4Range, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  year: "this year",
  all: "all time",
};

/**
 * DEFAULT IS 30 DAYS, not today. A dashboard whose first paint is
 * "$0 · No orders in this range" reads as broken even when it is telling the
 * truth, and the first question of the morning is rarely about the last nine
 * hours.
 */
export function resolveV4Range(key: string | undefined) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = 86_400_000;
  const k = (V4_RANGES.find((r) => r.key === key)?.key ?? "30d") as V4Range;
  let from: Date;
  switch (k) {
    case "7d":
      from = new Date(startOfDay(now).getTime() - 6 * day);
      break;
    case "90d":
      from = new Date(startOfDay(now).getTime() - 89 * day);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      // Before CADO existed, so "all time" really is all of it.
      from = new Date(2020, 0, 1);
      break;
    case "30d":
    default:
      from = new Date(startOfDay(now).getTime() - 29 * day);
  }
  return { key: k, from, to: now, explicit: Boolean(key) };
}
