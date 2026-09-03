/**
 * The delivery promise (spec 2.7) — the strongest thing CADO can say, so it
 * has to be true.
 *
 * THE HOURS ARE NOT A CONSTANT IN THIS FILE. They are the one row in
 * `app_settings` (opens_at / closes_at / timezone), which is the same row the
 * server-side ordering-window trigger enforces and the same one the dashboard
 * edits. 2.7 asked for "one config row so Marwan can change them from the
 * dashboard later" — that row already existed, so this reads it rather than
 * inventing a second source of truth that would drift away from the first.
 *
 * The values below are only what to say before that row has arrived, and they
 * match what it currently holds (09:00–21:00 Asia/Beirut). Note that the real
 * opening time is 09:00, not the 10:00 the spec guessed.
 *
 * Nothing here is promotional. When the countdown reaches zero the wording
 * changes to the honest one rather than resetting.
 */

export type DeliveryWindow = { opensHour: number; cutoffHour: number; timezone: string };

export const FALLBACK_WINDOW: DeliveryWindow = {
  opensHour: 9,
  cutoffHour: 21,
  timezone: "Asia/Beirut",
};

/**
 * Module-level, and deliberately not React state.
 *
 * `deliveryWord()` is called from inside ProductCard, on every card in every
 * grid. Turning that into a hook would mean a query subscription per card for
 * a value that changes twice a day. The provider hook below writes here once
 * when the row loads; everything else reads a plain object.
 */
let current: DeliveryWindow = FALLBACK_WINDOW;

export function setDeliveryWindow(w: DeliveryWindow) {
  current = w;
}

export function deliveryWindow(): DeliveryWindow {
  return current;
}

/** The hour and minute right now in the shop's timezone, wherever the browser is. */
function shopNow(): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: current.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // "24" is a legal hour-cycle output for midnight in some ICU builds.
  const hour = get("hour") % 24;
  return { hour, minute: get("minute"), second: get("second") };
}

/**
 * THREE STATES, NOT TWO — and the third one is why this is not just
 * `hour < cutoffHour`.
 *
 * Between midnight and opening the shop is SHUT, but the day's cutoff has
 * not happened yet. A naive "before 21:00" test says "Tonight" at 3am and
 * offers a seventeen-hour countdown, which is both absurd and wrong: nothing
 * is being picked, packed or driven at 3am. It is still true that an order
 * placed then arrives today, so the honest line names the opening time
 * instead of pretending the clock is already running.
 */
export type DeliveryState = "before-open" | "open" | "after-cutoff";

export function deliveryState(): DeliveryState {
  const { hour } = shopNow();
  if (hour >= current.cutoffHour) return "after-cutoff";
  if (hour < current.opensHour) return "before-open";
  return "open";
}

/** True while an order placed now still lands today. */
export function isBeforeCutoff(): boolean {
  return deliveryState() !== "after-cutoff";
}

/** "Tonight" or "Tomorrow" — the line printed under a price. */
export function deliveryWord(): "Tonight" | "Tomorrow" {
  return isBeforeCutoff() ? "Tonight" : "Tomorrow";
}

/** Seconds left until the cutoff, or 0 outside the open window. */
export function secondsToCutoff(): number {
  if (deliveryState() !== "open") return 0;
  const { hour, minute, second } = shopNow();
  return (current.cutoffHour - hour) * 3600 - minute * 60 - second;
}

/** "2h 14m", or "14m" inside the last hour. */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** How the cutoff reads in copy: "9pm", "9:30pm". */
export function cutoffLabel(): string {
  const h = current.cutoffHour;
  const suffix = h >= 12 ? "pm" : "am";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}

function openingLabel(): string {
  return `${String(current.opensHour).padStart(2, "0")}:00`;
}

/** The cutoff bar's whole message, so the bar itself has no logic in it. */
export function cutoffMessage(): { text: string; counting: boolean } {
  switch (deliveryState()) {
    case "after-cutoff":
      return { text: `Order now → delivered tomorrow from ${openingLabel()}`, counting: false };
    case "before-open":
      // Still today, but nothing moves until the shop opens. No countdown:
      // counting down seventeen hours to a cutoff is pressure, not information.
      return { text: `Order now → delivered today from ${openingLabel()}`, counting: false };
    default:
      return {
        text: `Order in ${formatCountdown(secondsToCutoff())} → at their door tonight`,
        counting: true,
      };
  }
}
