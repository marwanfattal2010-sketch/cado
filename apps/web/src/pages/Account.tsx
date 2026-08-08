import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTopStores } from "../hooks/useStores";
import { AccountIcon, GiftIcon, GlobeIcon, HeartIcon, HelpIcon, OrdersIcon, SettingsIcon } from "../components/Icons";

export function Account() {
  const { session, profile, signOut } = useAuth();
  const topStores = useTopStores();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <AccountIcon className="mx-auto h-10 w-10 text-ink/20" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your account</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to manage your orders and details.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/login" className="rounded-pill bg-ink py-3 text-sm text-cream">
            Log in
          </Link>
          <Link to="/signup" className="rounded-pill bg-ink/5 py-3 text-sm text-ink">
            Create an account
          </Link>
        </div>

        <div className="mt-10 overflow-hidden rounded-card bg-white text-left ring-1 ring-ink/5">
          <Link to="/help" className="flex items-center gap-3 px-4 py-4 transition hover:bg-ink/[0.03]">
            <HelpIcon className="h-5 w-5 text-ink/50" />
            <span className="flex-1 text-sm">Help Center</span>
            <span className="text-ink/25">›</span>
          </Link>
          <Link to="/language" className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]">
            <GlobeIcon className="h-5 w-5 text-ink/50" />
            <span className="flex-1 text-sm">Language</span>
            <span className="text-ink/25">›</span>
          </Link>
        </div>
      </div>
    );
  }

  const name = profile?.full_name || session.user.email;

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="flex items-center gap-4 rounded-sheet bg-ink px-6 py-7 text-cream">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-gold text-2xl font-semibold text-ink">
          {(name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold">{name}</p>
          <p className="truncate text-sm text-cream/60">{session.user.email}</p>
        </div>
      </div>

      {topStores.data && topStores.data.length > 0 ? (
        <div className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-ink/50">STORES YOU'LL LOVE</h2>
            <Link to="/browse" className="text-xs text-ink/40 underline">
              See all
            </Link>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {topStores.data.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.id}`}
                className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-card bg-white p-3 text-center ring-1 ring-ink/5 transition hover:ring-ink/15"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-pill bg-ink/5">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-ink/40">{store.name.charAt(0)}</span>
                  )}
                </div>
                <span className="line-clamp-2 text-xs font-medium leading-tight">{store.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-card bg-white ring-1 ring-ink/5">
        <Link to="/settings" className="flex items-center gap-3 px-4 py-4 transition hover:bg-ink/[0.03]">
          <SettingsIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Settings</span>
          <span className="text-ink/25">›</span>
        </Link>
        <Link to="/wishlist" className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]">
          <HeartIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Wishlist</span>
          <span className="text-ink/25">›</span>
        </Link>
        <Link to="/language" className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]">
          <GlobeIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Language</span>
          <span className="text-ink/25">›</span>
        </Link>
        <Link to="/help" className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]">
          <HelpIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Help Center</span>
          <span className="text-ink/25">›</span>
        </Link>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/orders"
          className="flex flex-1 items-center gap-2 rounded-card bg-white px-4 py-3 text-sm text-ink/60 ring-1 ring-ink/5 transition hover:ring-ink/15"
        >
          <OrdersIcon className="h-4 w-4 text-ink/40" />
          My orders
        </Link>
        <Link
          to="/gift-cards"
          className="flex flex-1 items-center gap-2 rounded-card bg-white px-4 py-3 text-sm text-ink/60 ring-1 ring-ink/5 transition hover:ring-ink/15"
        >
          <GiftIcon className="h-4 w-4 text-ink/40" />
          Gift cards
        </Link>
      </div>

      <button
        onClick={signOut}
        className="mt-6 w-full rounded-pill bg-ink/5 py-3.5 text-sm font-medium text-ink/70 transition hover:bg-ink/10"
      >
        Log out
      </button>

      <p className="mt-10 text-center text-[11px] tracking-widest text-ink/25">
        CADO — GIFTS, DELIVERED. LEBANON.
      </p>
    </div>
  );
}
