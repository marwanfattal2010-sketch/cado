import { Link } from "react-router-dom";
import { GiftIcon } from "../components/Icons";

export function GiftCards() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="text-center">
        <GiftIcon className="mx-auto h-9 w-9 text-gold" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Gift Cards</h1>
        <p className="mt-2 text-sm text-ink/50">
          Let them choose exactly what they want, from any store on CADO.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          to="/gift-cards/send"
          className="group overflow-hidden rounded-3xl bg-ink p-6 text-cream transition hover:opacity-95"
        >
          <p className="font-display text-xl font-semibold">Send a gift card</p>
          <p className="mt-1 text-sm text-cream/60">
            Pick an amount, add a message, and choose how it arrives.
          </p>
          <span className="mt-4 inline-block text-sm text-gold">Get started →</span>
        </Link>

        <Link
          to="/gift-cards/redeem"
          className="group overflow-hidden rounded-3xl bg-white p-6 ring-1 ring-ink/8 transition hover:ring-ink/25"
        >
          <p className="font-display text-xl font-semibold">Redeem a gift card</p>
          <p className="mt-1 text-sm text-ink/50">
            Got a card or a link? Enter your 6-digit code to add the balance.
          </p>
          <span className="mt-4 inline-block text-sm text-ink/70">Enter code →</span>
        </Link>
      </div>
    </div>
  );
}
