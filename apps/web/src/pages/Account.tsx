import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTopStores } from "../hooks/useStores";
import {
  AccountIcon,
  BasketIcon,
  GiftIcon,
  GlobeIcon,
  HeartIcon,
  HelpIcon,
  OrdersIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TruckIcon,
  WalletIcon,
} from "../components/Icons";
import { Button, ButtonLink, RibbonDivider } from "../components/ui";

/**
 * The fuller "How CADO works" panel, recovered from the pre-redesign
 * homepage (it lived there until 0195c24). The homepage keeps the compact
 * one-line strip — a shopper scrolling for a birthday present does not need
 * three cards explaining the concept. Here it does earn its space: Account
 * is where someone lands when they are deciding whether to trust the thing,
 * and it is the one screen with room for it.
 *
 * Every claim on it is one CADO actually makes elsewhere on the site
 * (same-day, pay on delivery, verified stores). Nothing here is a number, a
 * rating or a count, because there is no real one to show.
 *
 * Step 2 used to be "We wrap it — your note inside, free". CADO is not
 * offering gift wrapping (Marwan, 2026-08: "i dont need gift wrapping"), so
 * it is replaced by the step that actually happens in the middle: CADO
 * collects the gift from the store. That is not a new promise — it is the
 * same one /partners already makes to store owners ("Same-day delivery
 * across Lebanon, handled by us").
 */
const HOW_IT_WORKS = [
  { n: "1", Icon: GiftIcon, title: "Choose a gift", desc: "From stores across Lebanon." },
  { n: "2", Icon: BasketIcon, title: "We collect it", desc: "From the store, the same day." },
  { n: "3", Icon: TruckIcon, title: "Arrives today", desc: "Order before midnight, arrives today." },
];

/** Three, not four — the "Free gift wrapping" badge is gone with the
 *  service. A claim we no longer make does not get relocated. */
const WHY_CADO = [
  { Icon: TruckIcon, label: "Same-day delivery" },
  { Icon: ShieldCheckIcon, label: "Verified Lebanese stores" },
  { Icon: WalletIcon, label: "Pay on delivery" },
];

function HowCadoWorks() {
  return (
    <section className="mt-10">
      <RibbonDivider className="mb-4" />
      <h2 className="text-center font-display text-h2">How CADO works</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {HOW_IT_WORKS.map((s) => (
          <div key={s.n} className="rounded-card bg-surface p-3 text-center shadow-rest">
            <s.Icon className="mx-auto h-5 w-5 text-muted" />
            <p className="mt-1.5 text-caption font-semibold">{s.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {WHY_CADO.map((w) => (
          <div
            key={w.label}
            className="flex flex-col items-center gap-2 rounded-card bg-surface py-5 text-center shadow-rest"
          >
            <w.Icon className="h-6 w-6 text-muted" />
            <span className="text-caption font-medium text-muted">{w.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
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
      <Icon className="h-5 w-5 text-muted" />
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
          <ButtonLink to="/login" fullWidth>
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

        {/* Signed out is exactly when someone is still deciding, so the
            explainer belongs here too. */}
        <div className="text-left">
          <HowCadoWorks />
        </div>
      </div>
    );
  }

  const name = profile?.full_name || session.user.email;

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="flex items-center gap-4 rounded-sheet bg-ink px-6 py-7 text-inverse">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-gold font-display text-h1 text-ink">
          {(name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-h2">{name}</p>
          <p className="truncate text-body text-inverse/60">{session.user.email}</p>
        </div>
      </div>

      {/* Honest label. This list is every active store, ordered by name — it
          is not a ranking, so it can't be called "stores you'll love". */}
      {topStores.data && topStores.data.length > 0 ? (
        <div className="mt-6">
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
                to={`/store/${store.id}`}
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
          <OrdersIcon className="h-4 w-4 text-muted" />
          My orders
        </Link>
        <Link
          to="/gift-cards"
          className="flex min-h-[52px] flex-1 items-center gap-2 rounded-card bg-surface px-4 text-body shadow-rest transition-transform duration-fast active:scale-[0.98]"
        >
          <GiftIcon className="h-4 w-4 text-muted" />
          Gift cards
        </Link>
      </div>

      <Button onClick={signOut} variant="secondary" fullWidth className="mt-6">
        Log out
      </Button>

      <HowCadoWorks />

      <SiteLinks />

      <p className="mt-10 text-center text-eyebrow uppercase text-muted">Cado — gifts, delivered. Lebanon.</p>
    </div>
  );
}
