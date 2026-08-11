import { useState } from "react";

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
 */
export function Img({ src, alt = "", className = "", eager = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return null;
  return (
    <img
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
