import { useState } from "react";
import { Link } from "react-router-dom";
import { GiftIcon, GroupIcon } from "../components/Icons";
import { GiftCardHero } from "../components/giftcard/GiftCardArt";
import { WalletCard } from "../components/giftcard/WalletCard";
import { RedeemToWallet } from "../components/giftcard/RedeemToWallet";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../lib/auth";

/**
 * The Gift Cards page: title, one hero card, two ways to give, one way to
 * redeem. Nothing else.
 *
 * THE HERO IS CONDITIONAL, and that is the page's one piece of logic. A new
 * visitor used to be greeted by their own empty wallet — a big card whose
 * headline was effectively "$0, you have nothing", squatting on the best
 * position on the page. Now:
 *
 *   balance > 0  -> the person's own wallet card IS the hero (Whish-style,
 *                   eye toggle and all);
 *   otherwise    -> a decorative CADO card carries the brand, and the wallet
 *                   is simply not mentioned. No empty state, no $0.
 *
 * REDEEM EXISTS ONCE. It used to be here twice — an inline box at the top
 * AND a navigation card to a separate page, with two contradictory code
 * formats between them. One entry point now, at the bottom, and the old
 * /gift-cards/redeem route redirects here.
 */
export function GiftCards() {
  const { session } = useAuth();
  const wallet = useWallet();
  const hasBalance = !!session && (wallet.data?.balance ?? 0) > 0;

  /** Set for one moment after a successful redeem — the glow that points the
   *  eye at where the money went. */
  const [justRedeemed, setJustRedeemed] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-h1">Gift cards</h1>
      <p className="mt-2 max-w-sm text-body text-muted">
        One card. Every store on CADO. Delivered today.
      </p>

      {/* The hero: their card if it holds money, the brand card if not. */}
      <div className="mt-6">
        {hasBalance ? (
          <div
            className={justRedeemed ? "glow-once rounded-card" : undefined}
            onAnimationEnd={() => setJustRedeemed(false)}
          >
            <WalletCard />
          </div>
        ) : (
          <GiftCardHero className="w-full" />
        )}
        <p className="mt-3 text-center text-caption text-muted">Gift cards are valid for 2 years.</p>
      </div>

      {/* Two ways to give. */}
      <div className="mt-7 flex flex-col gap-3">
        <ActionCard
          to="/gift-cards/send"
          Icon={GiftIcon}
          title="Send a gift card"
          desc="Pick an amount, we deliver it today — as a link or a real card."
        />
        <ActionCard
          to="/gift-cards/group/new"
          Icon={GroupIcon}
          title="Group gift card"
          desc="Friends chip in together for one big gift."
        />
      </div>

      {/* One way to redeem. */}
      <RedeemToWallet
        onRedeemed={() => {
          setJustRedeemed(true);
          // The wallet card is about to appear (or update) at the top — put
          // the person's eye where their money just went.
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

function ActionCard({
  to,
  Icon,
  title,
  desc,
}: {
  to: string;
  Icon: typeof GiftIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-5 transition-transform duration-press ease-out active:scale-[0.98] active:shadow-rest"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-persimmon/10 text-persimmon">
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-h2">{title}</span>
        <span className="mt-1 block text-caption leading-snug text-muted">{desc}</span>
      </span>
      <span aria-hidden className="shrink-0 text-muted">
        ›
      </span>
    </Link>
  );
}
