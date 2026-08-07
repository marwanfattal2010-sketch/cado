import { Link } from "react-router-dom";

export function GiftCardTile() {
  return (
    <Link to="/gift-cards" className="group relative col-span-2 row-span-1 block overflow-hidden rounded-2xl">
      <img
        src="/categories/gift-card.jpg"
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
      <span className="absolute bottom-3 left-4 font-display text-base font-semibold text-white drop-shadow sm:text-lg">
        Gift Cards
      </span>
    </Link>
  );
}
