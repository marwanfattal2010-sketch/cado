import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../hooks/useCategories";
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

/**
 * The category rail. It is the site's primary navigation, so it is the same
 * component and the same order on the homepage and on every category page —
 * which is what lets someone hop from Toys to Perfumes without going back.
 *
 * Sticky is opt-in because the homepage pins it under the search bar while
 * a category page pins it directly under the header.
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
   * Without it the chips stay plain <Link>s, which is what every category
   * page and every direct /category/<slug> link still relies on.
   */
  onSelect?: (slug: string | null) => void;
}) {
  const categories = useCategories();
  const queryClient = useQueryClient();
  const rowRef = useRef<HTMLDivElement>(null);

  // Scroll the active chip into view. Landing on /category/electronics with
  // its chip off-screen to the right reads as "this rail has nothing to do
  // with the page I'm on".
  useEffect(() => {
    if (!activeSlug) return;
    const el = rowRef.current?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`);
    el?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [activeSlug, categories.data]);

  if (categories.isLoading) {
    return (
      <div className={`scroll-row gap-2 px-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="skeleton h-9 w-[86px] shrink-0 rounded-pill" />
        ))}
      </div>
    );
  }

  if (!categories.data?.length) return null;

  return (
    <div ref={rowRef} className={`scroll-row gap-2 px-4 ${className}`}>
      {categories.data.map((cat) => {
        const active = activeSlug === cat.slug;
        const prefetch = () => queryClient.prefetchQuery(categoryProductsQuery(cat.slug));
        return (
          <span key={cat.id} data-slug={cat.slug} className="shrink-0" onPointerEnter={prefetch}>
            {onSelect ? (
              <Chip
                active={active}
                onClick={() => onSelect(active ? null : cat.slug)}
                className="tap-44 !h-9 !px-3.5 !text-caption"
              >
                {tidyCategory(cat.name)}
              </Chip>
            ) : (
              <ChipLink
                to={`/category/${cat.slug}`}
                active={active}
                onPointerEnter={prefetch}
                className="tap-44 !h-9 !px-3.5 !text-caption"
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
