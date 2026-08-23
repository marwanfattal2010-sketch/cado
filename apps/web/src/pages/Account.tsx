import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTopStores } from "../hooks/useStores";
import {
  AccountIcon,
  GiftIcon,
  GlobeIcon,
  HeartIcon,
  HelpIcon,
  OrdersIcon,
  SettingsIcon,
} from "../components/Icons";
import { Button, ButtonLink } from "../components/ui";
import { Img } from "../components/Img";
import { WalletBalanceCard } from "../components/giftcard/WalletCard";
import { storePath } from "../lib/routes";

/**
 * Up to two initials. A full name gives first + last, one word gives one
 * letter, and an email address falls back to its first letter — which is
 * what someone who signed up without a name actually has.
 */
function initialsOf(name: string | null | undefined): string {
  // Letters and digits only. The demo admin is stored as "[DEMO] CADO Admin",
  // which by first-character-of-each-word gives "[A" — a bracket is not an
  // initial, and any punctuation someone puts in their name would do the same.
  const words = (name ?? "")
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Every row in the account list is the same shape, so the 52px height and
 *  the hairline between rows can't drift apart. */
function Row({ to, Icon, label, first }: { to: string; Icon: typeof HelpIcon; label: string; first?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex min-h-[52px] items-center gap-3 px-4 py-3.5 transition hover:bg-surface-sunk ${
        first ? "" : "border-t border-line"
      }`}
    >
      <Icon className="h-5 w-5 text-persimmon" />
      <span className="flex-1 text-body">{label}</span>
      <span aria-hidden className="text-muted">
        ›
      </span>
    </Link>
  );
}

/**
 * Everything the homepage's black footer block used to hold.
 *
 * It was a wall of links under the shopping, which is the one place nobody
 * looks for them — Home now ends on a single "© CADO · Privacy · Terms"
 * line. These are the same destinations as tappable rows, on the screen
 * people actually open when they want help, an order, or a policy.
 *
 * Every row goes somewhere real. There are no dead entries here.
 */
const LINK_GROUPS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { to: "/browse", label: "All categories" },
      { to: "/gift-finder?occasion=birthday", label: "Birthday gifts" },
      { to: "/gift-cards", label: "Gift cards" },
    ],
  },
  {
    heading: "Help",
    links: [
      { to: "/delivery-returns", label: "Delivery & returns" },
      { to: "/orders", label: "Track your order" },
      { to: "/help", label: "Contact us" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About CADO" },
      { to: "/partners", label: "Become a partner" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of service" },
    ],
  },
];

/** Static photos from the account, each opening the profile. Hardcoded so
 *  they're trivial to swap for real posts; no Instagram API, no embed. */
const INSTAGRAM_IMAGES = [
  "/instagram/1.jpg",
  "/instagram/2.jpg",
  "/instagram/3.jpg",
  "/instagram/4.jpg",
  "/instagram/5.jpg",
  "/instagram/6.jpg",
  "/instagram/7.jpg",
  "/instagram/8.jpg",
];

/*
 * The black "Own a store?" banner is gone from this page. It was the
 * heaviest thing on a cream screen, and the Company group below already
 * carries "Become a partner" as a plain row to the same page — one link is
 * enough. /partners itself is unchanged.
 */

/** Real photographs from the account, each opening the profile. No embed, no
 *  follower count, no faked post metadata — pictures and a link. */
function InstagramStrip() {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-h2">@cado.lb on Instagram</h2>
      {/* Negative margin so the strip runs to both screen edges while its
          first photo still starts on the page margin, the same as every
          other rail on the site. */}
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {INSTAGRAM_IMAGES.map((src) => (
          <a
            key={src}
            href="https://instagram.com/cado.lb"
            target="_blank"
            rel="noreferrer"
            className="block aspect-square w-[128px] shrink-0 overflow-hidden rounded-card bg-surface-sunk"
          >
            <Img src={src} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}

function SiteLinks() {
  return (
    <div className="mt-8">
      {LINK_GROUPS.map((group) => (
        <div key={group.heading} className="mt-5 first:mt-0">
          <p className="mb-2 px-1 text-eyebrow uppercase text-muted">{group.heading}</p>
          <div className="overflow-hidden rounded-card bg-surface shadow-rest">
            {group.links.map((link, i) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className={`flex min-h-[52px] items-center gap-3 px-4 py-3.5 transition hover:bg-surface-sunk ${
                  i === 0 ? "" : "border-t border-line"
                }`}
              >
                <span className="flex-1 text-body">{link.label}</span>
                <span aria-hidden className="text-muted">
                  ›
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Account() {
  const { session, profile, signOut } = useAuth();
  const topStores = useTopStores();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <AccountIcon className="mx-auto h-10 w-10 text-muted" />
        <h1 className="mt-4 font-display text-h1">Your account</h1>
        <p className="mt-2 text-body text-muted">Log in to manage your orders and details.</p>
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink to="/login" variant="accent" fullWidth>
            Log in
          </ButtonLink>
          <ButtonLink to="/signup" variant="secondary" fullWidth>
            Create an account
          </ButtonLink>
        </div>

        <div className="mt-10 overflow-hidden rounded-card bg-surface text-left shadow-rest">
          <Row to="/help" Icon={HelpIcon} label="Help Center" first />
          <Row to="/language" Icon={GlobeIcon} label="Language" />
        </div>

        {/* The moved footer links belong here too. Someone signed out is
            exactly the person hunting for delivery terms or a privacy
            policy, and Home no longer carries them. */}
        <div className="text-left">
          <SiteLinks />
        </div>

        <div className="text-left">
          <InstagramStrip />
        </div>
      </div>
    );
  }

  const name = profile?.full_name || session.user.email;

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      {/* The black block is gone. It was the heaviest thing on a cream page
          and it made the account screen read as a different app. Cream card,
          hairline, and the only colour is the Persimmon monogram. Nothing
          else lives in this card. */}
      <div className="flex items-center gap-4 rounded-[16px] border border-line bg-surface px-6 py-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-persimmon/10 font-display text-h2 text-persimmon">
          {initialsOf(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[20px] leading-tight text-ink">{name}</p>
          <p className="truncate text-[13px] text-muted">{session.user.email}</p>
        </div>
      </div>

      {/* Straight under the profile: what is actually on the card, read from
          my_wallet(). Tapping it opens the Gift Cards page. */}
      <WalletBalanceCard />

      <div className="mt-6 overflow-hidden rounded-card bg-surface shadow-rest">
        <Row to="/settings" Icon={SettingsIcon} label="Settings" first />
        <Row to="/wishlist" Icon={HeartIcon} label="Favorites" />
        <Row to="/language" Icon={GlobeIcon} label="Language" />
        <Row to="/help" Icon={HelpIcon} label="Help Center" />
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/orders"
          className="flex min-h-[52px] flex-1 items-center gap-2 rounded-card bg-surface px-4 text-body shadow-rest transition-transform duration-fast active:scale-[0.98]"
        >
          <OrdersIcon className="h-4 w-4 text-persimmon" />
          My orders
        </Link>
        <Link
          to="/gift-cards"
          className="flex min-h-[52px] flex-1 items-center gap-2 rounded-card bg-surface px-4 text-body shadow-rest transition-transform duration-fast active:scale-[0.98]"
        >
          <GiftIcon className="h-4 w-4 text-persimmon" />
          Gift cards
        </Link>
      </div>

      {/* Shop · Help · Company · Legal — all four kept. */}
      <SiteLinks />

      {/* Last thing you can DO on the page, after every link group. */}
      <Button onClick={signOut} variant="secondary" fullWidth className="mt-8">
        Log out
      </Button>

      {/* Honest label. This list is every active store, ordered by name — it
          is not a ranking, so it can't be called "stores you'll love". It
          sits below Log out with the rest of the footer: it is browsing, not
          account management. */}
      {topStores.data && topStores.data.length > 0 ? (
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-h2">Stores on CADO</h2>
            <Link to="/browse" className="tap-44 text-caption font-medium text-ink">
              See all →
            </Link>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {topStores.data.map((store) => (
              <Link
                key={store.id}
                to={storePath(store)}
                className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-card bg-surface p-3 text-center shadow-rest transition-transform duration-fast active:scale-[0.97]"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-pill bg-surface-sunk">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-h2 text-muted">{store.name.charAt(0)}</span>
                  )}
                </div>
                <span className="line-clamp-2 text-caption font-medium leading-tight">{store.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <InstagramStrip />

      <p className="mt-10 text-center text-eyebrow uppercase text-muted">Cado — gifts, delivered. Lebanon.</p>
    </div>
  );
}
