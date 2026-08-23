import { Link } from "react-router-dom";
import { GiftIcon, GroupIcon, WalletIcon } from "../components/Icons";
import { GiftCardBalance } from "../components/giftcard/GiftCardBalance";

/**
 * The Gift Cards tab: what you have, and the three things you can do.
 *
 * It used to open with a big decorative specimen card that held no
 * information — the first thing on the screen was a picture of the product
 * rather than the product. Now the top of the page is the person's real
 * balance, and everything else is one tap.
 *
 * The whole page fits an iPhone screen without scrolling, which is the point:
 * three choices should not need a scroll to see.
 */
export function GiftCards() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">Gift cards</h1>

      <div className="mt-4">
        <GiftCardBalance />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <ActionRow
          to="/gift-cards/send"
          Icon={GiftIcon}
          title="Send a gift card"
          desc="Pick an amount, delivered today"
        />
        <ActionRow
          to="/gift-cards/group/new"
          Icon={GroupIcon}
          title="Group gift card"
          desc="Everyone chips in, you send one card"
        />
        <ActionRow
          to="/gift-cards/redeem"
          Icon={WalletIcon}
          title="Redeem a code"
          desc="Add a card's balance to your account"
        />
      </div>

      {/* True, and stated — as a footnote on the page rather than as text
          printed on a card someone is about to give away. */}
      <p className="mt-4 text-caption text-muted">Gift cards are valid for 2 years.</p>
    </div>
  );
}

/** Compact row: icon, two lines, chevron. */
function ActionRow({
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
      className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition-transform duration-press ease-out active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-persimmon/10 text-persimmon">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-caption leading-snug text-muted">{desc}</span>
      </span>
      <span aria-hidden className="shrink-0 text-muted">
        ›
      </span>
    </Link>
  );
}
