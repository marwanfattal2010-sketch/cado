import { Link } from "react-router-dom";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

export type TileSize = "featured" | "regular";

export function CategoryTile({
  slug,
  name,
  size = "regular",
}: {
  slug: string;
  name: string;
  size?: TileSize;
}) {
  const featured = size === "featured";
  return (
    <Link
      to={`/category/${slug}`}
      className={`group relative block overflow-hidden rounded-2xl ${
        featured ? "col-span-2 aspect-[16/7]" : "aspect-[4/5]"
      }`}
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt=""
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${FOCUS[slug] ?? "object-center"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
      <span
        className={`absolute bottom-3.5 left-4 font-display font-semibold text-white drop-shadow ${
          featured ? "text-xl sm:text-2xl" : "text-base"
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
