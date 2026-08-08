import { useState } from "react";
import { Link } from "react-router-dom";
import { primaryImage } from "../lib/images";
import { useAuth } from "../lib/auth";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { HeartIcon } from "./Icons";

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  currency?: string;
  same_day?: boolean | null;
  stock_quantity?: number | null;
  product_images?: { storage_path: string; is_primary: boolean }[] | null;
  partner?: { name: string } | null;
};

export function ProductCard({
  id,
  title,
  price,
  compare_at_price,
  same_day,
  stock_quantity,
  product_images,
  partner,
}: ProductCardProps) {
  const uri = primaryImage(product_images);
  const { session } = useAuth();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds.has(id);
  const [loaded, setLoaded] = useState(false);

  const inStock = stock_quantity == null || stock_quantity > 0;
  // Only promise same-day when it's genuinely deliverable — a badge the
  // business can't honour is worse than no badge at all.
  const arrivesToday = same_day === true && inStock;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= 3;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);

  return (
    <Link
      to={`/product/${id}`}
      className="group block w-full transition-transform duration-150 active:scale-[0.97]"
    >
      {/* Fixed aspect ratio + a tinted placeholder underneath means the card
          never changes height when the photo arrives (no layout shift). */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink/5">
        {uri ? (
          <img
            src={uri}
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
              loaded ? "scale-100 blur-0 opacity-100" : "scale-105 blur-md opacity-0"
            }`}
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
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink/60 shadow-sm transition hover:text-ink active:scale-90"
          >
            <HeartIcon className="h-[18px] w-[18px]" filled={isFavorite} />
          </button>
        ) : null}
        {!inStock ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-semibold text-cream">
            Out of stock
          </span>
        ) : lowStock ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-[#C2410C] px-2 py-1 text-[10px] font-semibold text-white">
            Only {stock_quantity} left
          </span>
        ) : null}
      </div>

      {/* Store first — it's the trust signal, and it lets the product name
          take two lines without the card growing unpredictably. */}
      {partner?.name ? <p className="mt-2.5 truncate text-xs text-ink/45">{partner.name}</p> : null}
      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-base font-bold">${Number(price).toFixed(0)}</span>
        {onSale ? (
          <span className="text-xs text-ink/35 line-through">${Number(compare_at_price).toFixed(0)}</span>
        ) : null}
        {arrivesToday ? (
          <span className="ml-auto shrink-0 text-[11px] font-semibold text-[#1F6B4A]">Today</span>
        ) : null}
      </div>
    </Link>
  );
}
