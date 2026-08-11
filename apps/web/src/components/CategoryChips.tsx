import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../hooks/useCategories";
import { categoryProductsQuery } from "../hooks/useProducts";
import { ChipLink } from "./ui";

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
}: {
  activeSlug?: string;
  className?: string;
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
      {categories.data.map((cat) => (
        <span key={cat.id} data-slug={cat.slug} className="shrink-0">
          <ChipLink
            to={`/category/${cat.slug}`}
            active={activeSlug === cat.slug}
            onPointerEnter={() => queryClient.prefetchQuery(categoryProductsQuery(cat.slug))}
            className="tap-44 !h-9 !px-3.5 !text-caption"
          >
            {tidyCategory(cat.name)}
          </ChipLink>
        </span>
      ))}
    </div>
  );
}
