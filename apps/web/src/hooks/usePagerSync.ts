import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps a scroll-snap pager and an "which tab is active" index in sync, in
 * both directions, without the two fighting each other.
 *
 * The hard part is the feedback loop. Tapping a tab scrolls the pager, the
 * scroll listener sees the index change and sets state, and if that state
 * change scrolled the pager again you get a stutter or an outright lock. So a
 * tap-driven scroll raises `programmatic`, and the scroll listener only
 * publishes an index while it is down.
 *
 * `scrollend` clears the flag exactly when the animation finishes. Safari
 * does not have it yet, hence the timeout fallback — and the timeout is
 * cleared by `scrollend` when both fire, so the flag can never be lowered
 * early by a stale timer from a previous tap.
 */
export function usePagerSync(count: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const programmatic = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);

  const clearProgrammatic = useCallback(() => {
    programmatic.current = false;
    if (fallback.current) {
      clearTimeout(fallback.current);
      fallback.current = null;
    }
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

      programmatic.current = true;
      if (fallback.current) clearTimeout(fallback.current);
      // Long enough for a smooth scroll across the widest phone, short enough
      // that a dropped `scrollend` doesn't leave swipes dead for a second.
      fallback.current = setTimeout(clearProgrammatic, 400);

      el.scrollTo({ left: clamped * el.clientWidth, behavior: mode });
      if (mode === "auto") clearProgrammatic();
    },
    [count, clearProgrammatic]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      frame.current = null;
      if (programmatic.current) return;
      const width = el.clientWidth;
      if (width === 0) return;
      const next = Math.round(el.scrollLeft / width);
      setIndex((prev) => (prev === next ? prev : Math.max(0, Math.min(next, count - 1))));
    };

    // rAF-throttled: a swipe fires scroll events far faster than React needs
    // to hear about them, and the underline only has to move once a frame.
    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = requestAnimationFrame(read);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", clearProgrammatic);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", clearProgrammatic);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      if (fallback.current) clearTimeout(fallback.current);
    };
  }, [count, clearProgrammatic]);

  /**
   * A rotation or a window resize changes `clientWidth`, and the pager is
   * then parked between two panels. Re-anchor on the panel that was active.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onResize = () => {
      el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  return { ref, index, goTo };
}
