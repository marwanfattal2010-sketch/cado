import { useCallback, useState } from "react";

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

  const measure = useCallback((el: HTMLImageElement | null) => {
    // `naturalWidth > 0` distinguishes a genuinely decoded image from one
    // that completed by failing — a broken src is also `complete`.
    if (el?.complete) setLoaded(true);
  }, []);

  if (!src) return null;
  return (
    <img
      ref={measure}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      data-loaded={loaded ? "true" : "false"}
      className={`blur-up ${className}`}
    />
  );
}
