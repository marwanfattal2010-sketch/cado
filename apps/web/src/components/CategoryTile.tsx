import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { categoryProductsQuery } from "../hooks/useProducts";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

export function CategoryTile({ slug, name }: { slug: string; name: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery(categoryProductsQuery(slug));
  };

  return (
    <Link
      to={`/category/${slug}`}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl transition-transform duration-150 active:scale-[0.97]"
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt=""
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${FOCUS[slug] ?? "object-center"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
      <span className="absolute bottom-3.5 left-4 font-display text-base font-semibold text-white drop-shadow">
        {name}
      </span>
    </Link>
  );
}
