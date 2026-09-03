import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The tab pager: a drag that the panel FOLLOWS, and a release that settles.
 *
 * WHY THIS OWNS ITS OWN MOTION INSTEAD OF USING THE BROWSER'S.
 *
 * There were two earlier versions and each was wrong in the opposite
 * direction. The first was a native `overflow-x: auto` scroll-snap container:
 * it followed the finger, but any touch that drifted a few pixels sideways
 * dragged the whole page and rubber-banded it back, which is what "feels
 * loose" meant. The second clipped the overflow and committed the tab change
 * on release — solid, but nothing moved until you let go, so it read as a web
 * page jumping between screens rather than an app.
 *
 * Both behaviours are wanted at once, and no combination of CSS gives them:
 * `touch-action` cannot be restricted on the pager while carousels INSIDE it
 * still pan (a browser intersects touch-action with every ancestor), and
 * scroll-snap re-snaps behind you the moment you set scrollLeft by hand. So
 * the pager is clipped, no snap, and every pixel of movement is decided here.
 *
 * The result is what a native pager does:
 *   - the panel tracks your thumb 1:1 while you drag
 *   - it resists at the first and last tab instead of stopping dead
 *   - a flick commits on VELOCITY, so a fast short swipe still turns the page
 *   - a slow short drag falls back where it came from
 *   - a vertical scroll never moves it sideways at all
 */

/** Movement, in px, before the gesture's axis is decided. */
const DECIDE_AT = 8;
/** Fraction of a screen a slow drag must cross to commit. */
const COMMIT_FRACTION = 0.28;
/** px/ms. Above this a flick commits however short it was. */
const FLICK_VELOCITY = 0.35;
/** How far past the first/last panel a drag is allowed to pull. */
const EDGE_RESISTANCE = 0.35;
/** Settle animation bounds. Distance picks a duration between them. */
const MIN_SETTLE_MS = 180;
const MAX_SETTLE_MS = 380;
/** Velocity is measured over this trailing window, not the whole gesture — a
 *  drag that paused and then flicked should read as a flick. */
const VELOCITY_WINDOW_MS = 120;

/** The CSS `--ease` (cubic-bezier(.22,1,.36,1)), close enough in one line. */
function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * True when the touch began inside something that scrolls sideways on its own
 * — a hero, a product rail, the store circles. Those own the gesture: swiping
 * through a carousel is not a request to change tab.
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

export function usePager(count: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  /** Live index for the gesture handlers, which are bound once and must not
   *  be re-bound mid-drag — a listener swapped between touchstart and
   *  touchend loses the gesture. */
  const indexRef = useRef(0);
  const countRef = useRef(count);
  countRef.current = count;

  const frame = useRef<number | null>(null);
  /** Backstop for the animation — see the note in settleTo. */
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAnimation = useCallback(() => {
    if (frame.current != null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (landing.current != null) {
      clearTimeout(landing.current);
      landing.current = null;
    }
  }, []);

  /** Animate scrollLeft to a panel and publish the index when it lands. */
  const settleTo = useCallback(
    (target: number, immediate = false) => {
      const el = ref.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(target, countRef.current - 1));
      const to = clamped * el.clientWidth;

      // The index is published UP FRONT, not on arrival. The tab bar's
      // underline has its own transition, so both move together; waiting for
      // the scroll to land made the underline chase the panel.
      indexRef.current = clamped;
      setIndex(clamped);

      cancelAnimation();
      const from = el.scrollLeft;
      const distance = to - from;
      if (immediate || prefersReducedMotion() || Math.abs(distance) < 1) {
        el.scrollLeft = to;
        return;
      }

      // Duration scales with distance so a neighbouring tab feels quick and a
      // jump across nine tabs does not fly past at an unreadable speed.
      const span = el.clientWidth || 1;
      const ms = Math.min(
        MAX_SETTLE_MS,
        Math.max(MIN_SETTLE_MS, MIN_SETTLE_MS + (Math.abs(distance) / span) * 90)
      );
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        el.scrollLeft = from + distance * easeOutQuint(t);
        if (t < 1) frame.current = requestAnimationFrame(step);
        else {
          frame.current = null;
          el.scrollLeft = to;
        }
      };
      frame.current = requestAnimationFrame(step);

      /*
       * THE ANIMATION MUST NOT BE THE ONLY THING THAT LANDS IT.
       *
       * requestAnimationFrame does not fire in a hidden or backgrounded tab.
       * Switch tab mid-swipe, take a call, lock the phone — the frames stop,
       * and the pager is left parked between two panels showing half of each,
       * with the tab bar insisting you are on one of them. Coming back to a
       * half-and-half screen is exactly the kind of thing that reads as "the
       * app is broken".
       *
       * So a timer promises the landing independently. It costs one timeout
       * per tab change and it cannot be skipped by the browser.
       */
      landing.current = setTimeout(() => {
        landing.current = null;
        if (frame.current != null) {
          cancelAnimationFrame(frame.current);
          frame.current = null;
        }
        el.scrollLeft = to;
      }, ms + 60);
    },
    [cancelAnimation]
  );

  /** Tab taps, deep links and the categories sheet all come through here. */
  const goTo = useCallback(
    (next: number, behavior: ScrollBehavior = "smooth") => {
      settleTo(next, behavior === "auto");
    },
    [settleTo]
  );

  /**
   * `count` is in the deps for a reason that is easy to lose: the pager
   * element does not exist on the first render. Home renders it only once the
   * tabs have loaded, so `ref.current` is null in this effect's first pass
   * and there is nothing to bind to. `count` going 0 -> 11 when the tabs
   * arrive is what re-runs this and actually attaches the gesture.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || count === 0) return;

    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let axis: "x" | "y" | null = null;
    let live = false;
    /** Trailing samples, for the flick test. */
    let samples: { t: number; x: number }[] = [];

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        live = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScroll = el.scrollLeft;
      axis = null;
      samples = [{ t: performance.now(), x: t.clientX }];
      live = !insideHorizontalScroller(e.target, el);
      // Grabbing mid-flight takes the pager off the animation and hands it to
      // the finger, which is the difference between a control that responds
      // and one that has to finish what it was doing first.
      if (live) cancelAnimation();
    };

    const onMove = (e: TouchEvent) => {
      if (!live || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (axis === null) {
        if (Math.abs(dx) < DECIDE_AT && Math.abs(dy) < DECIDE_AT) return;
        // Decided once, for the whole gesture. A vertical scroll that wanders
        // sideways halfway down the page can never become a tab change.
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") {
          live = false;
          return;
        }
      }

      // This listener is NON-PASSIVE for exactly this line: without it the
      // panel keeps scrolling vertically underneath a sideways drag, and the
      // page slides diagonally.
      e.preventDefault();

      samples.push({ t: performance.now(), x: t.clientX });
      if (samples.length > 8) samples.shift();

      const width = el.clientWidth || 1;
      const max = (countRef.current - 1) * width;
      let next = startScroll - dx;
      // Past either end the drag still moves, but only a third as far — the
      // page says "there is nothing here" by feel instead of by stopping.
      if (next < 0) next = next * EDGE_RESISTANCE;
      else if (next > max) next = max + (next - max) * EDGE_RESISTANCE;
      el.scrollLeft = next;
    };

    const onEnd = () => {
      if (!live || axis !== "x") {
        live = false;
        return;
      }
      live = false;
      const width = el.clientWidth || 1;
      // Positive = the content moved LEFT under the finger = going forward a
      // tab. This is `now - start`, not `start - now`: getting it backwards
      // sent every swipe to the tab behind the one you were reaching for.
      const moved = el.scrollLeft - startScroll;

      // Velocity over the trailing window only.
      const now = performance.now();
      const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
      const first = recent[0] ?? samples[0];
      const last = samples[samples.length - 1];
      const dt = last && first ? last.t - first.t : 0;
      const velocity = dt > 0 ? (first.x - last.x) / dt : 0;

      const committed =
        Math.abs(moved) > width * COMMIT_FRACTION || Math.abs(velocity) > FLICK_VELOCITY;
      const direction = (Math.abs(velocity) > FLICK_VELOCITY ? velocity : moved) > 0 ? 1 : -1;

      settleTo(committed ? indexRef.current + direction : indexRef.current);
    };

    const onCancel = () => {
      if (live && axis === "x") settleTo(indexRef.current);
      live = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [count, settleTo, cancelAnimation]);

  /**
   * A rotation or resize changes clientWidth, leaving the pager parked
   * between two panels. Re-anchor instantly on the tab that was open.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reanchor = () => {
      cancelAnimation();
      el.scrollLeft = indexRef.current * el.clientWidth;
    };
    window.addEventListener("resize", reanchor);
    // Coming back to the app re-anchors too: whatever happened while it was
    // hidden, the panel on screen is the one the tab bar claims.
    document.addEventListener("visibilitychange", reanchor);
    window.addEventListener("pageshow", reanchor);
    return () => {
      window.removeEventListener("resize", reanchor);
      document.removeEventListener("visibilitychange", reanchor);
      window.removeEventListener("pageshow", reanchor);
    };
  }, [cancelAnimation]);

  useEffect(() => cancelAnimation, [cancelAnimation]);

  return { ref, index, goTo };
}
