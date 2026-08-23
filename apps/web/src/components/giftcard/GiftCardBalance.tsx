import { Link } from "react-router-dom";
import { PersimmonCard } from "./PersimmonCard";
import { formatMoney } from "../../lib/money";
import { useAuth } from "../../lib/auth";
import { useWallet } from "../../hooks/useWallet";

/**
 * The signed-in person's real gift-card balance, on the shared card.
 *
 * The figure comes from `my_wallet()` and is never invented: someone who has
 * never redeemed anything sees $0, because $0 is what they have. A logged-out
 * visitor is asked to log in rather than shown a zero, since a zero would be
 * a claim about an account that does not exist.
 */
export function GiftCardBalance({ linkToGiftCards = false }: { linkToGiftCards?: boolean }) {
  const { session } = useAuth();
  const wallet = useWallet();

  if (!session) {
    return (
      <div className="relative flex h-[120px] flex-col justify-between overflow-hidden rounded-card bg-persimmon px-5 py-4 shadow-rest">
        <span className="font-display text-[18px] font-semibold tracking-[0.14em] text-white">CADO</span>
        <div>
          <p className="text-[12px] text-white/85">Log in to see your balance</p>
          <Link
            to="/login"
            className="mt-2 inline-flex h-9 items-center rounded-[4px] bg-white px-3 text-[13px] font-semibold text-ink"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const card = (
    <PersimmonCard
      amount={wallet.isLoading ? "—" : formatMoney(wallet.data?.balance ?? 0)}
      note="Spend it at any CADO store."
    />
  );

  return linkToGiftCards ? (
    <Link to="/gift-cards" className="block transition-transform duration-press ease-out active:scale-[0.99]">
      {card}
    </Link>
  ) : (
    card
  );
}
