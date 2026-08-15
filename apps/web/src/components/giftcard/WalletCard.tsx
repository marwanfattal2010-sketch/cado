import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "../Icons";
import { formatMoney } from "../../lib/money";
import { useAuth } from "../../lib/auth";
import { formatCardNumber, useWallet } from "../../hooks/useWallet";

/** Remembered across reloads: someone who hides a balance on a bus wants it
 *  hidden the next time too, not just until the page reloads. */
const HIDDEN_KEY = "cado-wallet-hidden";

/**
 * The CADO card — the first thing on the Gift Cards tab.
 *
 * Persimmon, because this is the one screen where the brand colour IS the
 * product: a card you own. The wordmark is set rather than imported so it
 * matches the app icon and the splash, which are drawn from the same Jost
 * 600.
 *
 * The balance can be hidden. That is not decoration — a balance is the kind
 * of thing people do not want on screen in a shared taxi, and every bank app
 * has the toggle for that reason.
 *
 * NOTHING HERE IS INVENTED. The balance and card number come from
 * `my_wallet()`; a logged-out visitor is told to log in rather than shown a
 * zero, because a zero would be a claim about an account that doesn't exist.
 */
export function WalletCard() {
  const { session } = useAuth();
  const wallet = useWallet();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
    } catch {
      // A blocked localStorage must not stop the toggle working.
    }
  }, [hidden]);

  const face = (children: React.ReactNode) => (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-persimmon via-persimmon to-primary-deep px-5 py-5 shadow-rest">
      {/* One gold hairline arc, the same ribbon motif as the gift-card
          banner. Decoration only, hence aria-hidden. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-pill border border-white/25"
      />
      {children}
    </div>
  );

  if (!session) {
    return face(
      <>
        <p className="font-display text-[20px] font-semibold tracking-[0.14em] text-white">CADO</p>
        <p className="mt-6 text-[13px] text-white/85">Log in to see your CADO card</p>
        <Link
          to="/login"
          className="mt-3 inline-flex h-10 items-center rounded-[4px] bg-white px-4 text-caption font-semibold text-ink"
        >
          Log in
        </Link>
      </>
    );
  }

  const balance = wallet.data?.balance ?? 0;

  return face(
    <>
      <div className="flex items-start justify-between">
        <p className="font-display text-[20px] font-semibold tracking-[0.14em] text-white">CADO</p>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          aria-pressed={hidden}
          className="tap-44 -mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-pill text-white/85 transition hover:text-white"
        >
          {hidden ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.12em] text-white/75">Total Balance</p>
      <p className="mt-1 font-display text-[30px] font-semibold leading-none text-white">
        {wallet.isLoading ? (
          <span className="inline-block h-[30px] w-28 animate-pulse rounded bg-white/25 align-middle" />
        ) : hidden ? (
          /* Same rough width as a real figure, so revealing it doesn't make
             the card jump. */
          "••••••"
        ) : (
          formatMoney(balance)
        )}
      </p>

      <p className="mt-5 font-mono text-[15px] tracking-[0.18em] text-white/90">
        {hidden ? "••••-••••-••••" : formatCardNumber(wallet.data?.card_number)}
      </p>
    </>
  );
}
