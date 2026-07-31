import { Link } from "react-router-dom";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

export function CategoryTile({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-ink/5"
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt={name}
        className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${FOCUS[slug] ?? "object-center"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute bottom-5 left-5 right-5 font-display text-2xl font-semibold text-white sm:text-3xl">{name}</span>
    </Link>
  );
}
