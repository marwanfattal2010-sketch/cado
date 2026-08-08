import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Browsers restore scroll position on history navigation, and a single-page
 * app keeps the same document across route changes — so without this, tapping
 * a category from halfway down the homepage lands you halfway down the new
 * page. Jump to the top on forward navigation (PUSH/REPLACE) but leave
 * back/forward (POP) alone, so returning to a list keeps your place.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, navigationType]);

  return null;
}
