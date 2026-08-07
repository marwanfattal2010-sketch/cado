import { Link } from "react-router-dom";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

export function CategoryTile({
  slug,
  name,
  wide = false,
}: {
  slug: string;
  name: string;
  wide?: boolean;
}) {
  return (
    <Link
      to={`/category/${slug}`}
      className={`group relative block overflow-hidden rounded-2xl ${wide ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt=""
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${FOCUS[slug] ?? "object-center"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
      <span className="absolute bottom-3 left-4 font-display text-base font-semibold text-white drop-shadow sm:text-lg">
        {name}
      </span>
    </Link>
  );
}
