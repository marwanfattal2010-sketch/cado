import { useNavigate } from "react-router-dom";
import { GiftCardBalance } from "../components/giftcard/GiftCardBalance";
import { RedeemToWallet } from "../components/giftcard/RedeemToWallet";

/**
 * Redeem a code.
 *
 * Its own screen again, because the Gift Cards tab now offers three equal
 * choices and one of them has to land somewhere. The share links people
 * already have in their chats point here with `?code=` on the end, and the
 * redeem box reads it — so a link opens with the code already filled in.
 *
 * The balance sits above the box on purpose: after a successful redeem the
 * number they just added is the next thing they look at.
 */
export function GiftCardRedeem() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-h2">Redeem a code</h1>
      <p className="mt-1 text-caption text-muted">Add a card's balance to your account.</p>

      <div className="mt-4">
        <GiftCardBalance />
      </div>

      <RedeemToWallet onRedeemed={() => navigate("/gift-cards")} />
    </div>
  );
}
