import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AccountIcon, GiftIcon, GlobeIcon, HeartIcon, HelpIcon, OrdersIcon, SettingsIcon } from "../components/Icons";

export function Account() {
  const { session, profile, signOut } = useAuth();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <AccountIcon className="mx-auto h-10 w-10 text-ink/20" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your account</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to manage your orders and details.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/login" className="rounded-full bg-ink py-3 text-sm text-cream">
            Log in
          </Link>
          <Link to="/signup" className="rounded-full bg-ink/5 py-3 text-sm text-ink">
            Create an account
          </Link>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl bg-white text-left ring-1 ring-ink/5">
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
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl font-semibold text-cream">
          {(name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{name}</p>
          <p className="truncate text-sm text-ink/50">{session.user.email}</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
        <Link to="/orders" className="flex items-center gap-3 px-4 py-4 transition hover:bg-ink/[0.03]">
          <OrdersIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">My orders</span>
          <span className="text-ink/25">›</span>
        </Link>
        <Link
          to="/wishlist"
          className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]"
        >
          <HeartIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Wishlist</span>
          <span className="text-ink/25">›</span>
        </Link>
        <Link
          to="/gift-cards"
          className="flex items-center gap-3 border-t border-ink/8 px-4 py-4 transition hover:bg-ink/[0.03]"
        >
          <GiftIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Gift cards</span>
          <span className="text-ink/25">›</span>
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
        <Link to="/settings" className="flex items-center gap-3 px-4 py-4 transition hover:bg-ink/[0.03]">
          <SettingsIcon className="h-5 w-5 text-ink/50" />
          <span className="flex-1 text-sm">Settings</span>
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

      <button
        onClick={signOut}
        className="mt-6 w-full rounded-full bg-ink/5 py-3.5 text-sm font-medium text-ink/70 transition hover:bg-ink/10"
      >
        Log out
      </button>

      <p className="mt-10 text-center text-[11px] tracking-widest text-ink/25">
        CADO — GIFTS, DELIVERED. LEBANON.
      </p>
    </div>
  );
}
