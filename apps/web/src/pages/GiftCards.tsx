import { Link } from "react-router-dom";
import { GiftIcon, GroupIcon, TicketIcon } from "../components/Icons";
import { WalletCard } from "../components/giftcard/WalletCard";
import { RedeemToWallet } from "../components/giftcard/RedeemToWallet";

type Option = {
  to: string;
  Icon: typeof GiftIcon;
  title: string;
  desc: string;
  badge?: string;
};

/** Order is fixed by the spec: send, then group, then redeem. */
const OPTIONS: Option[] = [
  {
    to: "/gift-cards/send",
    Icon: GiftIcon,
    title: "Send a gift card",
    desc: "One card, one person, delivered today.",
  },
  {
    to: "/gift-cards/group/new",
    Icon: GroupIcon,
    title: "Group gift card",
    desc: "Everyone chips in for one big gift.",
    badge: "New",
  },
  {
    to: "/gift-cards/redeem",
    Icon: TicketIcon,
    title: "Redeem a gift card",
    desc: "Got a card or a link? Enter the code — it looks like XXXX-XXXX-XXXX — to add the balance.",
  },
];

/**
 * One card shape for every option, so the icon tile, the title and the
 * chevron can't drift apart as options are added.
 *
 * The tile is 48px of *tinted* Persimmon with a Persimmon line glyph, not a
 * solid fill: three solid orange squares stacked down the screen turns the
 * accent into the page's paint.
 */
function OptionCard({ to, Icon, title, desc, badge }: Option) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[12px] border border-line bg-surface p-4 transition-transform duration-press ease-out active:scale-[0.98] active:shadow-rest"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-persimmon/10 text-persimmon">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-h2">{title}</span>
          {badge ? (
            <span className="rounded-pill bg-persimmon px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-caption leading-snug text-muted">{desc}</span>
      </span>
      <span aria-hidden className="shrink-0 text-muted">
        ›
      </span>
    </Link>
  );
}

export function GiftCards() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-h1">Gift cards</h1>
      <p className="mt-2 max-w-sm text-body text-muted">
        Not sure what to pick? Let them choose — a CADO gift card works at every store on the app.
      </p>

      {/* The person's own card first, then how to top it up, then the three
          ways to give one away. Your money before other people's. */}
      <div className="mt-5">
        <WalletCard />
        <RedeemToWallet />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <OptionCard key={o.to} {...o} />
        ))}
      </div>

      <p className="mt-6 text-caption text-muted">Gift cards are valid for 2 years from the day they're bought.</p>
    </div>
  );
}
