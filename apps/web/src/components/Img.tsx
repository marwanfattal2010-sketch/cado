import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  /** Set on the one image that is above the fold — a lazy hero is a blank
   *  hero for the first paint. */
  eager?: boolean;
};

/**
 * Lazy image with a soft blur-up.
 *
 * The parent is expected to be a fixed-ratio box with a tinted background
 * (`bg-surface-sunk`), so this never changes the height of the card it sits
 * in and never flashes white. The blur/opacity/scale transition lives in
 * `.blur-up` in index.css and is driven by a data attribute rather than a
 * class swap so it reads the same in the DOM as it does in the styles.
 *
 * `onError` is treated exactly like a successful load: a broken URL should
 * leave the tinted placeholder visible, not a permanently blurred ghost.
 *
 * THE CALLBACK REF IS NOT DECORATION — IT IS THE WHOLE CORRECTNESS OF THIS.
 *
 * `onLoad` only fires for a decode that happens AFTER React attaches the
 * handler. An image already in the browser cache is finished before that, so
 * the event never arrives, `loaded` stays false, and `.blur-up` holds it at
 * `opacity: 0` forever. The image is fully downloaded and simply invisible.
 *
 * That is exactly what happened: every photo on a revisited page rendered as
 * an empty tinted box — heroes, tiles, category circles — and it looked like
 * missing data rather than a stuck transition. The callback ref runs the
 * instant the element exists and asks the element itself whether it is
 * already complete, which is the only reliable way to catch a cache hit.
 */
export function Img({ src, alt = "", className = "", eager = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const node = useRef<HTMLImageElement | null>(null);

  const measure = useCallback((el: HTMLImageElement | null) => {
    node.current = el;
    // `naturalWidth > 0` is the real test. A decoded image always has one; a
    // broken src is `complete` but has none.
    if (el && (el.naturalWidth > 0 || el.complete)) setLoaded(true);
  }, []);

  /*
   * TWO BROWSER FEATURES DO NOT WORK INSIDE THE TAB PANELS, AND THIS COVERS
   * FOR BOTH.
   *
   * 1. `loading="lazy"` never fires. Measured on the Fashion tab: the tile and
   *    product images were never REQUESTED at all — no resource entry, nothing
   *    in flight — even after scrolling them into view. Setting
   *    `el.loading = "eager"` by hand downloaded them immediately. The panels
   *    are nested scroll containers with `-webkit-overflow-scrolling: touch`,
   *    and the browser's own lazy heuristic does not see into them. So we run
   *    our own IntersectionObserver against the viewport and flip the image to
   *    eager when it comes near. Bytes stay bounded — an image far down the
   *    page is still not fetched — but nothing stays permanently blank.
   *
   * 2. `onLoad` and `complete` both miss. Measured on /stores/fashion: five
   *    photos with `naturalWidth === 900` — decoded, pixels in hand — while
   *    `complete` stayed false and no load event ever arrived, so `.blur-up`
   *    held them at `opacity: 0` over five perfectly good photographs.
   *    `naturalWidth` was the only thing true throughout, so the reveal polls
   *    it. The poll only runs after the image is in view and stops the instant
   *    it wins, so an image nobody scrolls to costs nothing.
   */
  useEffect(() => {
    if (loaded) return;
    const el = node.current;
    if (!el) return;
    if (el.naturalWidth > 0) {
      setLoaded(true);
      return;
    }

    /*
     * THE POLL IS NOT GATED ON ANYTHING. That was the bug in the first
     * version of this fix.
     *
     * It used to start only once an IntersectionObserver said the image was
     * near the viewport — and inside these panels that observer does not fire
     * either, so on a COLD load every one of the 34 images on the Fashion tab
     * downloaded (`naturalWidth === 1200`, eager) and then sat at `opacity: 0`
     * forever, because nothing ever asked whether it had arrived. It only
     * looked fixed on a warm cache, where `naturalWidth` is already non-zero
     * at mount and the early return above catches it.
     *
     * Loading is eager now, so there is nothing to defer and no reason to
     * gate. Poll until it is there, give up after ~6s, and stop dead the
     * moment it wins.
     */
    let n = 0;
    const poll = setInterval(() => {
      if (node.current && node.current.naturalWidth > 0) {
        setLoaded(true);
        clearInterval(poll);
      } else if (++n >= 30) {
        // Genuinely broken src. Reveal it anyway rather than leaving a
        // permanent blur over whatever the browser did manage to render.
        setLoaded(true);
        clearInterval(poll);
      }
    }, 200);

    return () => clearInterval(poll);
  }, [loaded, src]);

  if (!src) return null;
  return (
    <img
      ref={measure}
      src={src}
      alt={alt}
      /*
       * EAGER BY DEFAULT, and that is a deliberate trade.
       *
       * Lazy loading does not work inside the tab panels. Measured: the tile
       * and product images on the Fashion tab were never requested — no
       * resource entry at all — even after scrolling them into view, and an
       * IntersectionObserver of our own did not fire for them either. The
       * panels are nested scroll containers with `-webkit-overflow-scrolling:
       * touch`, and neither the browser's heuristic nor the observer sees into
       * them reliably.
       *
       * The choice is between images that sometimes never appear and images
       * that all download. A tab is thirty-odd small photographs and they are
       * the content of the page, so they download. Revisit this if a tab ever
       * carries hundreds — the fix then is a virtualised grid, not a lazy
       * attribute that does not fire.
       */
      loading="eager"
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      data-loaded={loaded ? "true" : "false"}
      className={`blur-up ${className}`}
    />
  );
}
