/**
 * Date maths for recurring occasions.
 *
 * The rule that matters: a birthday stored as 1994-03-12 is not an event on
 * 12 March 1994, it's an event every 12 March. So everything below works on
 * month/day and ignores the stored year except when reporting how many years
 * it has been.
 */

export type OccasionType = "birthday" | "anniversary" | "other";

export const OCCASION_TYPES: { value: OccasionType; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Something else" },
];

export const RELATIONSHIPS = [
  "Mom",
  "Dad",
  "Partner",
  "Friend",
  "Sister",
  "Brother",
  "Colleague",
  "Kid",
] as const;

/** Local midnight, so "today" means the user's today and not UTC's. */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

/**
 * The next time this date comes round, at local midnight.
 *
 * 29 February is the awkward case: in a non-leap year JavaScript rolls it to
 * 1 March, which is the behaviour most people expect from a reminder — it
 * fires, rather than silently skipping three years out of four.
 */
export function nextOccurrence(eventDate: string, now = new Date()): Date {
  const { m, d } = parseDate(eventDate);
  const today = startOfDay(now);
  const thisYear = new Date(today.getFullYear(), m, d);
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, m, d);
}

export function daysUntil(eventDate: string, now = new Date()): number {
  const ms = nextOccurrence(eventDate, now).getTime() - startOfDay(now).getTime();
  return Math.round(ms / 86_400_000);
}

/** How many years it will be on the next occurrence — 0 if unknowable. */
export function yearsOn(eventDate: string, now = new Date()): number {
  const { y } = parseDate(eventDate);
  return nextOccurrence(eventDate, now).getFullYear() - y;
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/** Close enough to act on. Drives the "shop for this now" prompt. */
export function isSoon(days: number) {
  return days <= 21;
}

export function formatEventDate(eventDate: string) {
  const { m, d } = parseDate(eventDate);
  return new Date(2000, m, d).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function occasionTitle(o: {
  occasion_type: string;
  label?: string | null;
  person_name: string;
}) {
  if (o.occasion_type === "birthday") return `${o.person_name}'s birthday`;
  if (o.occasion_type === "anniversary") return `${o.person_name} — anniversary`;
  return o.label?.trim() ? `${o.person_name} — ${o.label}` : o.person_name;
}
