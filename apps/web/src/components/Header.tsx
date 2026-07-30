import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function Header() {
  const { session, profile, signOut } = useAuth();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm tracking-wide ${isActive ? "text-ink" : "text-ink/50 hover:text-ink"}`;

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/brand/icon.png" alt="CADO" className="h-9 w-9 rounded-[10px]" />
          <span className="font-display text-2xl tracking-[0.15em]">CADO</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/browse" className={navClass}>
            Browse
          </NavLink>
          <NavLink to="/gift-finder" className={navClass}>
            Gift Finder
          </NavLink>
          <NavLink to="/gift-cards" className={navClass}>
            Gift Cards
          </NavLink>
        </nav>

        <div className="flex items-center gap-5">
          <Link to="/cart" className="text-sm text-ink/70 hover:text-ink">
            Cart
          </Link>
          {session ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink/50 sm:inline">{profile?.full_name}</span>
              <button onClick={signOut} className="text-sm text-ink/70 hover:text-ink">
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="rounded-full bg-ink px-4 py-2 text-sm text-cream">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
