import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useFavorites } from "../hooks/useFavorites";
import { ProductCard } from "../components/ProductCard";
import { HeartIcon } from "../components/Icons";

export function Wishlist() {
  const { session } = useAuth();
  const favorites = useFavorites();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <HeartIcon className="mx-auto h-10 w-10 text-ink/20" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your wishlist</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to save gifts for later.</p>
        <Link to="/login" className="mt-6 inline-block rounded-pill bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  const items = favorites.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Your wishlist</h1>

      {favorites.isLoading ? (
        <p className="mt-8 text-sm text-ink/40">Loading...</p>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <HeartIcon className="mx-auto h-10 w-10 text-ink/20" />
          <p className="mt-4 text-sm text-ink/50">
            Nothing saved yet — tap the heart on anything you like.
          </p>
          <Link to="/" className="mt-6 inline-block rounded-pill bg-ink px-8 py-3 text-sm text-cream">
            Find a gift
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {items.map((f) =>
            f.product ? <ProductCard key={f.id} {...f.product} /> : null
          )}
        </div>
      )}
    </div>
  );
}
