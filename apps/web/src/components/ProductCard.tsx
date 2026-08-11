import { useState } from "react";
import { Link } from "react-router-dom";
import { primaryImage } from "../lib/images";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";
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
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds.has(id);
  const [loaded, setLoaded] = useState(false);

  const inStock = stock_quantity == null || stock_quantity > 0;
  // Only promise same-day when it's genuinely deliverable — a badge the
  // business can't honour is worse than no badge at all. Three conditions,
  // all real: the store offers same-day, there is a positive stock count
  // (an unknown null never earns the promise), and the 4PM cut-off hasn't
  // passed. Without the last one the homepage said "Order now for tomorrow
  // morning" directly above a row of cards each stamped "Today".
  const arrivesToday =
    same_day === true && stock_quantity != null && stock_quantity > 0 && !timeUntilCutoff().passed;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= 3;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);

  return (
    <Link
      to={`/product/${id}`}
      className="group block w-full transition-transform duration-150 active:scale-[0.97]"
    >
      {/* Fixed aspect ratio + a tinted placeholder underneath means the card
          never changes height when the photo arrives (no layout shift). */}
      <div className="relative aspect-square w-full overflow-hidden rounded-card bg-surface-sunk">
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
          <div className="flex h-full w-full items-center justify-center text-caption text-muted">No image</div>
        )}
        {/* No login gate: signed-out hearts persist locally (see useFavorites). */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite.mutate({ productId: id, isFavorite });
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          /* 44px hit area (the visible circle stays 32px) — a 32px target
             is under the minimum and this sits next to a whole-card link. */
          className="absolute right-[2px] top-[2px] flex h-11 w-11 items-center justify-center transition active:scale-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-surface/90 text-muted shadow-rest transition hover:text-ink">
            <HeartIcon className="h-[18px] w-[18px]" filled={isFavorite} />
          </span>
        </button>
        {!inStock ? (
          <span className="absolute bottom-2 left-2 rounded-pill bg-ink/80 px-2 py-1 text-caption font-semibold text-inverse">
            Out of stock
          </span>
        ) : lowStock ? (
          <span className="absolute bottom-2 left-2 rounded-pill bg-alert px-2 py-1 text-caption font-semibold text-inverse">
            Only {stock_quantity} left
          </span>
        ) : null}
      </div>

      {/* Store first — it's the trust signal, and it lets the product name
          take two lines without the card growing unpredictably. */}
      {partner?.name ? <p className="mt-2.5 truncate text-store text-muted">{partner.name}</p> : null}
      <p className="mt-0.5 line-clamp-2 text-product-name leading-snug">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-price">${Number(price).toFixed(0)}</span>
        {onSale ? (
          <span className="text-caption text-muted line-through">${Number(compare_at_price).toFixed(0)}</span>
        ) : null}
        {arrivesToday ? (
          <span className="ml-auto shrink-0 text-caption font-semibold text-today">Today</span>
        ) : null}
      </div>
    </Link>
  );
}
