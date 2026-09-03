import { useEffect } from "react";

/**
 * A drag is never a tap.
 *
 * Mounted once, above every route. It watches where a touch starts and where
 * it ends, and cancels the click if the finger travelled more than a few
 * pixels on the way.
 *
 * A browser suppresses the click itself when a touch turns into a scroll it
 * is driving — but only then. Inside a horizontal rail, flicking sideways
 * through product cards is a scroll the browser IS driving, yet the click
 * still lands on whichever card was under the finger when it lifted, so
 * swiping the deals row would open a product. The same happens when a
 * gesture is handled in JavaScript rather than by the scroller, which is
 * every tab swipe.
 *
 * Capture phase, so it runs before any component's own onClick.
 */

/** Movement, in px, past which a touch is a drag rather than a tap. */
const SLOP = 10;

export function useTapGuard() {
  useEffect(() => {
    let x = 0;
    let y = 0;
    let dragged = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
      dragged = false;
    };

    const onMove = (e: TouchEvent) => {
      if (dragged || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - x) > SLOP || Math.abs(t.clientY - y) > SLOP) dragged = true;
    };

    const onClick = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      // stopPropagation as well as preventDefault: a React onClick is bound at
      // the root, so preventDefault alone would still let the handler run and
      // navigate.
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("touchstart", onStart, { passive: true, capture: true });
    document.addEventListener("touchmove", onMove, { passive: true, capture: true });
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("touchstart", onStart, true);
      document.removeEventListener("touchmove", onMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
