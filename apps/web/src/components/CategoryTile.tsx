import { Link } from "react-router-dom";

export function CategoryTile({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group relative aspect-square overflow-hidden rounded-2xl bg-ink/5"
    >
      <img
        src={`/categories/${slug}.jpg`}
        alt={name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute bottom-4 left-4 right-4 font-display text-xl text-white sm:text-2xl">{name}</span>
    </Link>
  );
}
