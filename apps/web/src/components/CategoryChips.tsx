import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStockedCategories } from "../hooks/useCategories";
import { categoryProductsQuery } from "../hooks/useProducts";
import { Chip, ChipLink } from "./ui";

/** Everything on CADO is a gift — "& Gifts" in a category label says
 *  nothing, and the chips have to stay short enough that four or five fit
 *  across a 375px screen. */
export function tidyCategory(name: string) {
  return name
    .replace(/\s*&\s*Gifts$/i, "")
    .replace(/\s*&\s*Clothes$/i, "")
    .replace(/\s*&\s*Accessories$/i, "")
    .trim();
}

/** data-slug for the "All" chip. Not a real slug — no category can collide
 *  with it because slugs are lowercase kebab-case. */
const ALL = "__all__";

/**
 * The category rail. It is the site's primary navigation, so it is the same
 * component and the same order on the homepage and on every category page —
 * which is what lets someone hop from Toys to Perfumes without going back.
 *
 * Sticky is opt-in because the homepage pins it under the search bar while
 * a category page pins it directly under the header.
 *
 * Only stocked categories get a chip. Every chip here is a promise that
 * there is something behind it, so a category with no products is left out
 * until it has one — see useStockedCategories.
 */
export function CategoryChips({
  activeSlug,
  className = "",
  onSelect,
}: {
  activeSlug?: string;
  className?: string;
  /**
   * In-place mode. When this is supplied the chips stop being links and
   * become buttons that hand the slug back to the caller — the homepage
   * swaps its content instead of navigating. Tapping the already-active chip
   * calls back with `null`, which is how you get back out to the homepage.
   *
   * It also puts an "All" chip at the head of the rail, which is the other
   * way back out: "tap the selected thing again" is a real gesture but an
   * invisible one, so there has to be a visible control that says the same.
   *
   * Without it the chips stay plain <Link>s, which is what every category
   * page and every direct /category/<slug> link still relies on.
   */
  onSelect?: (slug: string | null) => void;
}) {
  const categories = useStockedCategories();
  const queryClient = useQueryClient();
  const rowRef = useRef<HTMLDivElement>(null);

  // In-place mode always has something selected — "All" when no category is.
  const activeKey = activeSlug ?? (onSelect ? ALL : null);

  /*
   * Keep the selected chip on screen. Landing on /category/electronics with
   * its chip off-screen to the right reads as "this rail has nothing to do
   * with the page I'm on", and in-place mode has the same problem in reverse:
   * tap Perfumes near the right edge and the thing you just selected is half
   * cut off.
   *
   * inline:"nearest" + block:"nearest" on purpose. "nearest" scrolls the
   * minimum needed, so a chip that is already fully visible does not move the
   * rail at all, and block:"nearest" means the vertical scroll position of
   * the PAGE is never touched — the rail lives in a sticky block that is
   * always on screen, so there is no vertical work to do and none is done.
   * (inline:"center" — what this used to be — yanked the rail on every tap.)
   */
  useEffect(() => {
    if (!activeKey) return;
    const el = rowRef.current?.querySelector<HTMLElement>(`[data-slug="${activeKey}"]`);
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "nearest" });
  }, [activeKey, categories.data]);

  if (categories.isLoading) {
    return (
      <div className={`scroll-row ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="skeleton h-[38px] w-[86px] shrink-0 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (!categories.data?.length) return null;

  return (
    <div ref={rowRef} className={`scroll-row ${className}`}>
      {/* First chip, and the default. Only in in-place mode: on a category
          page "All" would have to mean "go to the homepage", which is what
          the logo already does. */}
      {onSelect ? (
        <span data-slug={ALL} className="shrink-0">
          <Chip
            active={!activeSlug}
            onClick={() => onSelect(null)}
            className="tap-44 !h-[38px] !rounded-[10px] !px-[15px] !text-[13.5px] !font-medium"
          >
            All
          </Chip>
        </span>
      ) : null}

      {categories.data.map((cat) => {
        const active = activeSlug === cat.slug;
        const prefetch = () => queryClient.prefetchQuery(categoryProductsQuery(cat.slug));
        return (
          <span key={cat.id} data-slug={cat.slug} className="shrink-0" onPointerEnter={prefetch}>
            {onSelect ? (
              <Chip
                active={active}
                onClick={() => onSelect(active ? null : cat.slug)}
                className="tap-44 !h-[38px] !rounded-[10px] !px-[15px] !text-[13.5px] !font-medium"
              >
                {tidyCategory(cat.name)}
              </Chip>
            ) : (
              <ChipLink
                to={`/category/${cat.slug}`}
                active={active}
                onPointerEnter={prefetch}
                className="tap-44 !h-[38px] !rounded-[10px] !px-[15px] !text-[13.5px] !font-medium"
              >
                {tidyCategory(cat.name)}
              </ChipLink>
            )}
          </span>
        );
      })}
    </div>
  );
}
