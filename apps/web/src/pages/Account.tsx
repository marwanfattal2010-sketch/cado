import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTopStores } from "../hooks/useStores";
import { AccountIcon, GiftIcon, GlobeIcon, HeartIcon, HelpIcon, OrdersIcon, SettingsIcon } from "../components/Icons";
import { Button, ButtonLink } from "../components/ui";

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

      <p className="mt-10 text-center text-eyebrow uppercase text-muted">Cado — gifts, delivered. Lebanon.</p>
    </div>
  );
}
