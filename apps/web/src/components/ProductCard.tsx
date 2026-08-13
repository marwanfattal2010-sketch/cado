import { useState } from "react";
import { Link } from "react-router-dom";
import { primaryImage } from "../lib/images";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";
import { formatMoney } from "../lib/money";
import { storePath } from "../lib/routes";
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
  partner?: { name: string; slug?: string | null; id?: string | null } | null;
  /**
   * Tighter vertical rhythm under the photo, for dense grids like Trending.
   * Spacing only — the type tokens, the photo ratio and every badge stay
   * identical, so a product reads the same wherever it appears and nobody
   * has to invent a font size that isn't in the scale.
   */
  compact?: boolean;
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
  compact = false,
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
  // (an unknown null never earns the promise), and the cut-off hasn't passed
  // (midnight, with an overnight blackout — see lib/area). Without the last
  // one the homepage said "Order now for tomorrow morning" directly above a
  // row of cards each stamped as arriving today.
  const arrivesToday =
    same_day === true && stock_quantity != null && stock_quantity > 0 && !timeUntilCutoff().passed;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= 3;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);

  /**
   * The card is two links, not one.
   *
   * The store name has to open the store, and an interactive element nested
   * inside an anchor is invalid markup that some browsers swallow the click
   * on — so the photo/title/price anchor is split around it rather than
   * wrapping it. `group` moves to the outer element so the image's hover
   * zoom still fires from anywhere on the card.
   */
  return (
    <div className="group w-full">
    <Link
      to={`/product/${id}`}
      className="block w-full transition-transform duration-150 active:scale-[0.97]"
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

    </Link>

      {/* Store first — it's the trust signal, and it lets the product name
          take two lines without the card growing unpredictably.

          `py-1.5 -my-1.5` grows the tap area by 12px without moving a single
          pixel of the card. It is still short of 44px, and deliberately so:
          a .tap-44 overlay here would reach over the photo above and the
          title below, both of which are the other link. */}
      {partner?.name ? (
        <Link
          to={storePath(partner)}
          className={`${
            compact ? "mt-1.5" : "mt-2.5"
          } -my-1.5 block truncate py-1.5 text-store text-muted underline-offset-2 hover:text-ink hover:underline`}
        >
          {partner.name}
        </Link>
      ) : null}

    <Link to={`/product/${id}`} className="block w-full">
      {/* Always two lines tall, whether the name needs one or two.
          line-clamp-2 already caps the top; without a floor a one-line name
          made the card 19px shorter than its neighbours, so prices in a grid
          row sat at different heights and a loading row was taller than the
          row that replaced it. 2.75em = 2 x leading-snug (1.375), so it tracks
          the type scale instead of hard-coding 39px. */}
      <p className="mt-0.5 line-clamp-2 min-h-[2.75em] text-product-name leading-snug">{title}</p>
      <div className={`${compact ? "mt-0.5" : "mt-1"} flex items-baseline gap-2`}>
        <span className="text-price">{formatMoney(price)}</span>
        {onSale ? (
          <span className="text-caption text-muted line-through">{formatMoney(compare_at_price)}</span>
        ) : null}
        {/* "Arrives today", not a bare "Today" — on its own the word read as
            a label on the price beside it rather than a delivery promise. */}
        {arrivesToday ? (
          <span className="ml-auto shrink-0 text-caption font-semibold text-today">Arrives today</span>
        ) : null}
      </div>
    </Link>
    </div>
  );
}
