import { useAuth } from "../lib/auth";
import { useFavorites } from "../hooks/useFavorites";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { HeartIcon } from "../components/Icons";
import { ButtonLink } from "../components/ui";

/** No login gate: signed-out hearts live on this device (see useFavorites)
 *  and render here just the same. Signed in, the list is the account's. */
export function Wishlist() {
  const { session } = useAuth();
  const favorites = useFavorites();

  const items = favorites.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <h1 className="font-display text-h1">Your favorites</h1>
      {!session && items.length > 0 ? (
        <p className="mt-1 text-caption text-muted">
          Saved on this device — log in to keep them on every device.
        </p>
      ) : null}

      {favorites.isLoading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={4} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <HeartIcon className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-body text-muted">Nothing saved yet — tap the heart on anything you like.</p>
          <ButtonLink to="/" className="mt-6">
            Browse gifts
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
