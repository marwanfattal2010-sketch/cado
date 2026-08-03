import { Link } from "react-router-dom";

const FOCUS: Record<string, string> = {
  fashion: "object-top",
};

export function CategoryTile({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink/5 transition-shadow duration-300 hover:shadow-xl"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={`/categories/${slug}.jpg`}
          alt={name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${FOCUS[slug] ?? "object-center"}`}
        />
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <span className="font-display text-lg font-semibold text-ink sm:text-xl">{name}</span>
        <span className="text-ink/30 transition-transform duration-300 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
