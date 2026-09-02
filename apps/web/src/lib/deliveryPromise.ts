/**
 * The delivery promise (spec 2.7) — the strongest thing CADO can say, so it
 * has to be true.
 *
 * There is exactly one cutoff in the product and it is the one `place_order`
 * enforces: 21:00 Asia/Beirut. Before it, an order goes out tonight; after it,
 * tomorrow from opening. Nothing here is promotional and nothing counts down
 * to a made-up deadline — when the countdown reaches zero the wording changes
 * to the honest one rather than resetting.
 */

/** Both live here so the dashboard can move them later without a code change. */
export const CUTOFF_HOUR = 21; // 21:00 Asia/Beirut — the same cutoff place_order uses
export const OPENING_HOUR = 10; // spec 2.7 default
const TZ = "Asia/Beirut";

/** The hour and minute right now in Beirut, wherever the browser is. */
function beirutNow(): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute"), second: get("second") };
}

export function isBeforeCutoff(): boolean {
  return beirutNow().hour < CUTOFF_HOUR;
}

/** "Tonight" or "Tomorrow" — the line printed under a price. */
export function deliveryWord(): "Tonight" | "Tomorrow" {
  return isBeforeCutoff() ? "Tonight" : "Tomorrow";
}

/** Seconds left until the cutoff, or 0 once it has passed. */
export function secondsToCutoff(): number {
  const { hour, minute, second } = beirutNow();
  if (hour >= CUTOFF_HOUR) return 0;
  return (CUTOFF_HOUR - hour) * 3600 - minute * 60 - second;
}

/** "2h 14m", or "14m" inside the last hour. */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The cutoff bar's whole message, so the bar itself has no logic in it. */
export function cutoffMessage(): { text: string; counting: boolean } {
  const left = secondsToCutoff();
  if (left <= 0) {
    return { text: `Order now → delivered tomorrow from ${OPENING_HOUR}:00`, counting: false };
  }
  return { text: `Order in ${formatCountdown(left)} → at their door tonight`, counting: true };
}
