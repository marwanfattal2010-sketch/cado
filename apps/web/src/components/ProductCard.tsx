import { Link } from "react-router-dom";
import { primaryImage } from "../lib/images";
import { useAuth } from "../lib/auth";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { HeartIcon } from "./Icons";

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  currency: string;
  product_images?: { storage_path: string; is_primary: boolean }[] | null;
};

export function ProductCard({ id, title, price, currency, product_images }: ProductCardProps) {
  const uri = primaryImage(product_images);
  const { session } = useAuth();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds.has(id);

  return (
    <Link to={`/product/${id}`} className="group block w-full">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/5">
        {uri ? (
          <img
            src={uri}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">No image</div>
        )}
        {session ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite.mutate({ productId: id, isFavorite });
            }}
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink/60 shadow-sm transition hover:text-ink"
          >
            <HeartIcon className="h-[18px] w-[18px]" filled={isFavorite} />
          </button>
        ) : null}
      </div>
      <p className="mt-3 truncate text-sm font-medium">{title}</p>
      <p className="text-sm text-ink/50">
        {currency} {price.toFixed(2)}
      </p>
    </Link>
  );
}
