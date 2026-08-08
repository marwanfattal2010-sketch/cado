import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fades and slides new page content in on route change.
 *
 * The animation is removed once it finishes, and that matters more than it
 * looks: the keyframes use `transform`, and an element with a transform
 * becomes the containing block for any `position: fixed` descendant. Leaving
 * the filled transform in place silently breaks every sticky/fixed bar
 * inside the page — the product page's add-to-cart bar scrolled away with
 * the content instead of staying pinned.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
    // Slightly longer than the 240ms animation so it can't cut off early.
    const t = setTimeout(() => setAnimating(false), 320);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div key={location.pathname} className={animating ? "animate-page-in" : undefined}>
      {children}
    </div>
  );
}
