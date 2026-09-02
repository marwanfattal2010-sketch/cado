import { useEffect } from "react";

/**
 * The tab-swipe gesture, axis-locked (spec 1.8).
 *
 * WHY THIS IS JAVASCRIPT AND NOT `touch-action`.
 *
 * The pager used to be a native `overflow-x: auto` scroll-snap container, so
 * every touch that drifted a few pixels sideways dragged the whole page with
 * it and let it rubber-band back. The obvious fix — `touch-action: pan-y` on
 * the pager — cannot work here: a browser computes the effective touch-action
 * by INTERSECTING the value of the touched element with every ancestor up to
 * the scroller. Forbidding pan-x on the pager therefore also forbids it for
 * every carousel inside it, and the hero, the store circles, the brand rails
 * and the product strips would all stop scrolling. There is no CSS that says
 * "not this scroller, but yes to the ones inside it".
 *
 * So the pager's horizontal overflow is CLIPPED (see `.pager` in index.css) —
 * a touch can no longer move it at all — and the tab change is recognised
 * here instead. `scrollTo` still works on a clipped container, which is what
 * `goTo` uses, so tapping a tab and deep links are unaffected.
 *
 * THE TRADE, stated plainly: the panel no longer follows the finger during a
 * swipe. It commits on release. That is the direct consequence of the rule
 * this spec asked for — "a short sideways nudge must not move anything" — and
 * the two cannot both be true.
 */

/** Movement, in px, before the gesture's axis is decided. */
const DECIDE_AT = 10;
/** How far a horizontal swipe must travel to count as a tab change. */
const COMMIT_PX = 40;
/** tan(30°) — the angle limit from horizontal. */
const TAN_30 = 0.5774;

/**
 * True when the touch started inside something that scrolls sideways on its
 * own (a rail, the hero). Those own the gesture; a swipe through a carousel
 * is not a request to change tab.
 */
function insideHorizontalScroller(start: EventTarget | null, stopAt: HTMLElement) {
  let node = start instanceof Element ? start : null;
  while (node && node !== stopAt) {
    if (node.scrollWidth - node.clientWidth > 4) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useTabSwipe(
  ref: React.RefObject<HTMLDivElement | null>,
  onSwipe: (direction: 1 | -1) => void
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x0 = 0;
    let y0 = 0;
    /** null until the first ~10px says which way this gesture is going. */
    let axis: "x" | "y" | null = null;
    let live = false;

    const onStart = (e: TouchEvent) => {
      // Two fingers is a pinch, not a swipe.
      if (e.touches.length !== 1) {
        live = false;
        return;
      }
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
      axis = null;
      live = !insideHorizontalScroller(e.target, el);
    };

    const onMove = (e: TouchEvent) => {
      if (!live || axis !== null || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - x0;
      const dy = e.touches[0].clientY - y0;
      if (Math.abs(dx) < DECIDE_AT && Math.abs(dy) < DECIDE_AT) return;
      // Decided once, for the whole gesture. A vertical scroll that wanders
      // sideways halfway down the page can never turn into a tab change.
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    };

    const onEnd = (e: TouchEvent) => {
      if (!live || axis !== "x") return;
      live = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < COMMIT_PX) return;
      if (Math.abs(dy) > Math.abs(dx) * TAN_30) return;
      onSwipe(dx < 0 ? 1 : -1);
    };

    const onCancel = () => {
      live = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [ref, onSwipe]);
}
