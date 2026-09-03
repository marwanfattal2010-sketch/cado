import { useEffect, useState } from "react";
import { cutoffMessage } from "../lib/deliveryPromise";

/**
 * The cutoff strip (spec 2.7), pinned just above the bottom nav.
 *
 * This is a REAL deadline — 21:00 Asia/Beirut, the same one place_order
 * enforces — not a promotional countdown. Two consequences:
 *   - when it reaches zero it does not reset or restart; the message changes
 *     to the calm tomorrow line and the countdown disappears;
 *   - there is no animation, because a ticking, pulsing bar is pressure, and
 *     pressure is what fake urgency is made of.
 *
 * Dismissible for the session only: a shopper who closed it an hour ago still
 * wants to know tomorrow.
 */

const DISMISS_KEY = "cado-cutoff-dismissed";

export function CutoffBar() {
  const [msg, setMsg] = useState(cutoffMessage);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    // Once a minute is enough for a minutes-resolution countdown, and it keeps
    // the bar from re-rendering sixty times for every one it needs.
    const id = setInterval(() => setMsg(cutoffMessage()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (dismissed) return null;

  /*
   * DOCKED, NOT FLOATING.
   *
   * This used to be `position: fixed` above the bottom nav, so the last row
   * of whatever you were reading slid underneath it and stayed there — you
   * could not scroll the bar off the thing it was covering. It is a normal
   * block now and the shell reserves its height, so content scrolls ABOVE it
   * and nothing is ever hidden behind it.
   */
  return (
    <div className="shrink-0 border-t border-line bg-canvas px-3 py-1.5">
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-pill bg-persimmon/10 px-3.5 py-2">
        <span aria-hidden className="text-[13px]">🚚</span>
        <p className="min-w-0 flex-1 truncate text-caption font-medium text-ink">{msg.text}</p>
        <button
          type="button"
          aria-label="Hide delivery reminder"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="shrink-0 px-1 text-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
