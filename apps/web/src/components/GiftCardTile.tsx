import { Link } from "react-router-dom";

export function GiftCardTile() {
  return (
    <Link to="/gift-cards" className="group relative block aspect-[4/5] overflow-hidden rounded-card">
      <img
        src="/categories/gift-card.jpg"
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
      <span className="absolute bottom-3.5 left-4 font-display text-h2 text-inverse drop-shadow">
        Gift Cards
      </span>
    </Link>
  );
}
