import { Link } from "react-router-dom";

export function GiftCardTile() {
  return (
    <Link
      to="/gift-cards"
      className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl bg-ink"
    >
      <img
        src="/categories/gift-card.jpg"
        alt="Gift Cards"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <span className="relative p-5 font-display text-2xl font-semibold text-white sm:text-3xl">Gift Cards</span>
      <span className="relative px-5 pb-5 -mt-3 text-sm text-white/70">Let them pick exactly what they want</span>
    </Link>
  );
}
