import { Link } from "react-router-dom";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

const SPAN: Record<string, string> = {
  square: "col-span-1 row-span-2",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-3",
  big: "col-span-2 row-span-2",
};

export type TileSize = "square" | "wide" | "tall" | "big";

export function CategoryTile({
  slug,
  name,
  size = "square",
}: {
  slug: string;
  name: string;
  size?: TileSize;
}) {
  return (
    <Link
      to={`/category/${slug}`}
      className={`group relative block overflow-hidden rounded-2xl ${SPAN[size]}`}
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt=""
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${FOCUS[slug] ?? "object-center"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
      <span
        className={`absolute bottom-3 left-4 font-display font-semibold text-white drop-shadow ${
          size === "big" ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
