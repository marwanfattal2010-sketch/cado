import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps a scroll-snap pager and an "which tab is active" index in sync, in
 * both directions, without the two fighting each other.
 *
 * The hard part is that a `scroll` event does not say who caused it. Three
 * different things scroll this element and only ONE of them should be allowed
 * to change which tab is active:
 *
 *   1. the user swiping, or flicking and letting momentum carry  — publishes
 *   2. a tab tap / deep link scrolling the pager itself          — must not
 *   3. layout settling: panels mounting, images arriving, fonts  — must not
 *
 * The previous version guarded (2) with a flat 400ms timer, and ignored (3)
 * entirely. Both leaked, and each leak had its own visible bug:
 *
 * **Tapping a far tab landed one tab short.** A smooth scroll's duration
 * grows with distance. Tapping Chocolate (index 5) from All is five screen
 * widths, which takes well over 400ms, so the timer expired *mid-flight*. The
 * listener woke up, read whatever panel was sliding past — Perfume & Beauty,
 * index 4 — and published it. The tab bar then "corrected" itself to the
 * wrong tab a beat after the tap.
 *
 * **Sitting on All jumped to Fashion.** Nothing was driving that scroll at
 * all: panel contents mounting under a scroll-snap container nudges
 * `scrollLeft`, the listener read it as a swipe, and published index 1.
 *
 * So the flag is no longer a timer. A programmatic scroll ends when the pager
 * has actually ARRIVED (or when the user grabs it, which cancels it), and a
 * scroll nobody initiated is ignored rather than believed.
 */

/** Arrived, in px. Sub-pixel widths mean this can never be an equality test. */
const ARRIVED_EPSILON = 2;

/**
 * Last-resort release for a programmatic scroll that never arrives — an
 * interrupted animation, a panel resized out from under us. Generous on
 * purpose: it exists so swipes can't die permanently, not to time the scroll.
 */
const STUCK_MS = 2000;

/**
 * Quiet time after the last scroll event that counts as "the user has
 * finished", for browsers without `scrollend` (Safari). Momentum from a flick
 * keeps firing scroll events, so this has to outlast the gaps between them.
 */
const SETTLE_MS = 140;

export function usePagerSync(count: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  /** Target panel of an in-flight programmatic scroll; null when idle. */
  const drivingTo = useRef<number | null>(null);
  const drivingSince = useRef(0);
  /** True from the moment the user touches the pager until it settles. */
  const userDriving = useRef(false);

  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);

  const endProgrammatic = useCallback(() => {
    drivingTo.current = null;
  }, []);

  /** Scroll to a panel. Used by tab taps and by the deep-link on mount. */
  const goTo = useCallback(
    (next: number, behavior: ScrollBehavior = "smooth") => {
      const el = ref.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(next, count - 1));
      setIndex(clamped);

      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const mode: ScrollBehavior = reduced ? "auto" : behavior;

      drivingTo.current = clamped;
      drivingSince.current = Date.now();
      // A tap wins outright: any swipe still settling is no longer in charge.
      userDriving.current = false;

      el.scrollTo({ left: clamped * el.clientWidth, behavior: mode });
      // An instant jump is already there, so there is nothing to wait for.
      if (mode === "auto") endProgrammatic();
    },
    [count, endProgrammatic]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      frame.current = null;
      const width = el.clientWidth;
      if (width === 0) return;

      // (2) A tap or deep link is flying. Publish nothing — the index was set
      // when the move was ordered and is already correct. Just watch for the
      // landing.
      if (drivingTo.current !== null) {
        const target = drivingTo.current * width;
        if (Math.abs(el.scrollLeft - target) <= ARRIVED_EPSILON) endProgrammatic();
        else if (Date.now() - drivingSince.current > STUCK_MS) endProgrammatic();
        return;
      }

      // (3) Nobody asked for this scroll — panels mounting, an image landing,
      // a font swapping. Believing it is how sitting on All ended up on
      // Fashion.
      if (!userDriving.current) return;

      // (1) A real swipe.
      const next = Math.round(el.scrollLeft / width);
      setIndex((prev) => (prev === next ? prev : Math.max(0, Math.min(next, count - 1))));
    };

    // rAF-throttled: a swipe fires scroll events far faster than React needs
    // to hear about them, and the underline only has to move once a frame.
    const onScroll = () => {
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        userDriving.current = false;
      }, SETTLE_MS);
      if (frame.current != null) return;
      frame.current = requestAnimationFrame(read);
    };

    /**
     * The user has physically grabbed the pager. This both starts (1) and
     * cancels (2): grabbing mid-animation means the tap no longer owns the
     * scroll, and continuing to suppress would freeze the tab bar.
     */
    const onUserStart = () => {
      userDriving.current = true;
      drivingTo.current = null;
    };

    const onScrollEnd = () => {
      if (drivingTo.current !== null) {
        endProgrammatic();
        return;
      }
      if (!userDriving.current) return;
      const width = el.clientWidth;
      if (width === 0) return;
      // Settle on whatever panel snap actually chose, so the tab bar can
      // never disagree with what is on screen.
      const next = Math.max(0, Math.min(Math.round(el.scrollLeft / width), count - 1));
      setIndex((prev) => (prev === next ? prev : next));
      userDriving.current = false;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("pointerdown", onUserStart, { passive: true });
    el.addEventListener("touchstart", onUserStart, { passive: true });
    el.addEventListener("wheel", onUserStart, { passive: true });
    el.addEventListener("keydown", onUserStart);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("pointerdown", onUserStart);
      el.removeEventListener("touchstart", onUserStart);
      el.removeEventListener("wheel", onUserStart);
      el.removeEventListener("keydown", onUserStart);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      if (settle.current) clearTimeout(settle.current);
    };
  }, [count, endProgrammatic]);

  /**
   * A rotation or a window resize changes `clientWidth`, and the pager is
   * then parked between two panels. Re-anchor on the panel that was active.
   *
   * This is a programmatic move like any other, so it has to be announced —
   * otherwise the scroll it causes looks like a swipe and republishes an
   * index derived from the OLD width.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onResize = () => {
      drivingTo.current = index;
      drivingSince.current = Date.now();
      el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
      drivingTo.current = null;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  return { ref, index, goTo };
}
