import { useAuth } from "../lib/auth";
import { useFavorites } from "../hooks/useFavorites";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { HeartIcon } from "../components/Icons";
import { ButtonLink } from "../components/ui";

export function Wishlist() {
  const { session } = useAuth();
  const favorites = useFavorites();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <HeartIcon className="mx-auto h-10 w-10 text-muted" />
        <h1 className="mt-4 font-display text-h1">Your wishlist</h1>
        <p className="mt-2 text-body text-muted">Log in to save gifts for later.</p>
        <ButtonLink to="/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const items = favorites.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <h1 className="font-display text-h1">Your wishlist</h1>

      {favorites.isLoading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={4} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <HeartIcon className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-body text-muted">Nothing saved yet — tap the heart on anything you like.</p>
          <ButtonLink to="/" className="mt-6">
            Find a gift
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-6 grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((f) => (f.product ? <ProductCard key={f.id} {...f.product} /> : null))}
        </div>
      )}
    </div>
  );
}
