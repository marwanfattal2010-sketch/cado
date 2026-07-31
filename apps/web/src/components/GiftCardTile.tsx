import { Link } from "react-router-dom";

export function GiftCardTile() {
  return (
    <Link
      to="/gift-cards"
      className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-ink to-gold/40 p-5"
    >
      <span className="font-display text-2xl font-semibold text-white sm:text-3xl">Gift Cards</span>
      <span className="mt-1 text-sm text-white/70">Let them pick exactly what they want</span>
    </Link>
  );
}
