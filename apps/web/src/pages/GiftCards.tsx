import { Link } from "react-router-dom";
import { GiftIcon } from "../components/Icons";

export function GiftCards() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="text-center">
        <GiftIcon className="mx-auto h-9 w-9 text-gold" />
        <h1 className="mt-3 font-display text-h1">Gift cards</h1>
        <p className="mx-auto mt-2 max-w-sm text-body text-muted">
          Not sure what to pick? Let them choose — a CADO gift card works at every store on the app.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          to="/gift-cards/send"
          className="group overflow-hidden rounded-sheet bg-ink p-6 text-inverse shadow-rest transition active:scale-[0.99]"
        >
          <p className="font-display text-h2">Send a gift card</p>
          <p className="mt-1 text-body text-inverse/70">
            Pick an amount, add a note, and share it as a QR or a printed card.
          </p>
          <span className="mt-4 inline-block text-body font-medium text-gold">Get started →</span>
        </Link>

        <Link
          to="/gift-cards/redeem"
          className="group overflow-hidden rounded-sheet border border-line bg-surface p-6 shadow-rest transition active:scale-[0.99]"
        >
          <p className="font-display text-h2">Redeem a gift card</p>
          <p className="mt-1 text-body text-muted">
            Got a card or a link? Enter the code — it looks like XXXX-XXXX-XXXX — to add the balance.
          </p>
          <span className="mt-4 inline-block text-body font-medium text-ink">Enter code →</span>
        </Link>
      </div>
    </div>
  );
}
