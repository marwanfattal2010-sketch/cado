import { useState } from "react";
import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/images";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";
import { formatMoney } from "../lib/money";
import { storePath } from "../lib/routes";
import { occasionByValue, recipientByValue } from "../lib/filters";
import { HeartIcon } from "./Icons";

/** A product is "new" for a fortnight after it is listed. */
const NEW_DAYS = 14;
/** Below this, and only where stock is actually tracked, the card says so. */
const LOW_STOCK = 3;
/** Real completed orders needed before a product is called a bestseller. */
const BESTSELLER_ORDERS = 10;

type ProductImage = { storage_path: string; is_primary: boolean };

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  currency?: string;
  same_day?: boolean | null;
  stock_quantity?: number | null;
  created_at?: string | null;
  occasion_tags?: string[] | null;
  recipient_tags?: string[] | null;
  product_images?: ProductImage[] | null;
  partner?: { name: string; slug?: string | null; id?: string | null } | null;
  /**
   * Real count of completed orders. Nothing supplies this yet — the
   * storefront cannot read order_items under RLS — so the Bestseller badge
   * stays dormant until a SECURITY DEFINER aggregate exists to feed it. It is
   * a prop rather than a query so that switching it on is a wiring change,
   * not a redesign.
   */
  completed_orders?: number | null;
  /** Tighter vertical rhythm under the photo, for dense rows. Spacing only. */
  compact?: boolean;
};

/**
 * Which photo the grid uses.
 *
 * The brief asks for the tallest where a product has several. Nothing in the
 * catalogue has more than one today (checked: max 1), and product_images
 * stores no width or height, so "tallest" cannot be decided without loading
 * every candidate. Primary-then-first is the honest stand-in; the moment
 * dimensions exist on the row this is the one function to change.
 */
function gridImage(images: ProductImage[] | null | undefined) {
  if (!images || images.length === 0) return null;
  return productImageUrl((images.find((i) => i.is_primary) ?? images[0]).storage_path);
}

/**
 * The one badge on the photo.
 *
 * Every branch is backed by a column: a real compare_at_price above the price,
 * a real created_at inside the window, a real same_day flag past none of the
 * cut-off. Priority is discount, then new, then arrives-today, and it returns
 * after the first hit so a card can never wear two.
 */
function badgeFor(p: ProductCardProps): { label: string; className: string } | null {
  const onSale = p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price);
  if (onSale) {
    const off = Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100);
    if (off > 0) return { label: `-${off}%`, className: "bg-persimmon text-white" };
  }

  if (p.completed_orders != null && p.completed_orders > BESTSELLER_ORDERS) {
    return { label: "Bestseller", className: "bg-ink text-inverse" };
  }

  if (p.created_at) {
    const age = Date.now() - new Date(p.created_at).getTime();
    if (age >= 0 && age < NEW_DAYS * 24 * 60 * 60 * 1000) {
      return { label: "New", className: "bg-ink text-inverse" };
    }
  }

  // The same three conditions the delivery promise is made on everywhere
  // else: the store offers it, stock is known and positive, and the midnight
  // cut-off has not passed.
  const arrivesToday =
    p.same_day === true && p.stock_quantity != null && p.stock_quantity > 0 && !timeUntilCutoff().passed;
  if (arrivesToday) return { label: "Arrives today", className: "bg-today text-white" };

  return null;
}

/** Up to two chips, from tag columns that really hold those values. */
function chipsFor(p: ProductCardProps): { label: string; to: string }[] {
  const out: { label: string; to: string }[] = [];
  for (const value of p.occasion_tags ?? []) {
    const o = occasionByValue(value);
    if (o) out.push({ label: `#${o.label.replace(/\s+/g, "")}`, to: `/gift-finder?occasion=${o.value}` });
    if (out.length === 2) return out;
  }
  for (const value of p.recipient_tags ?? []) {
    const r = recipientByValue(value);
    if (r) out.push({ label: `#${r.label.replace(/\s+/g, "")}`, to: `/gift-finder?recipient=${r.value}` });
    if (out.length === 2) return out;
  }
  return out;
}

/**
 * The one product card. Home, category tabs, search, store pages and gift
 * finder results all render this — there is no second copy to drift.
 *
 * The photo keeps its own aspect ratio, which is what staggers the two
 * columns of the masonry grid. It used to be forced into a square, so every
 * card was exactly as tall as its neighbour and the grid read as a
 * spreadsheet.
 *
 * Nothing on this card is a number that was not queried. No units sold, no
 * star rating, no review count, no after-coupon price, no countdown, no
 * viewer count — CADO has none of that data, and a placeholder version of it
 * is a lie that happens to look like a feature.
 */
export function ProductCard(props: ProductCardProps) {
  const { id, title, price, compare_at_price, stock_quantity, product_images, partner, compact = false } =
    props;
  const uri = gridImage(product_images);
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds.has(id);
  const [loaded, setLoaded] = useState(false);

  const inStock = stock_quantity == null || stock_quantity > 0;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= LOW_STOCK;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);
  const off = onSale ? Math.round((1 - Number(price) / Number(compare_at_price)) * 100) : null;
  const badge = badgeFor(props);
  const chips = chipsFor(props);

  return (
    <div className="group mb-3 w-full break-inside-avoid">
      <Link
        to={`/product/${id}`}
        className="block w-full transition-transform duration-150 active:scale-[0.97]"
      >
        {/* No fixed ratio: the tinted box is sized by the image itself, so the
            card is as tall as its photo and the columns fall out of step. */}
        <div className="relative w-full overflow-hidden rounded-card bg-surface-sunk">
          {uri ? (
            <img
              src={uri}
              alt={title}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className={`h-auto w-full object-cover transition-all duration-500 ${
                loaded ? "blur-0 opacity-100" : "blur-md opacity-0"
              }`}
            />
          ) : (
            <div className="flex aspect-square h-full w-full items-center justify-center text-caption text-muted">
              No image
            </div>
          )}

          {/* No login gate: signed-out hearts persist locally. */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite.mutate({ productId: id, isFavorite });
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            /* 44px hit area, 32px visible circle — a 32px target is under the
               minimum and this sits on top of a whole-card link. */
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
          ) : badge ? (
            <span
              className={`absolute bottom-2 left-2 rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Store first — the trust signal, and its own link. */}
      {partner?.name ? (
        <Link
          to={storePath(partner)}
          className={`${
            compact ? "mt-1.5" : "mt-2"
          } -my-1.5 block truncate py-1.5 text-store text-muted underline-offset-2 hover:text-ink hover:underline`}
        >
          {partner.name}
        </Link>
      ) : null}

      <Link to={`/product/${id}`} className="block w-full">
        <p className="mt-1.5 line-clamp-2 text-product-name leading-snug">{title}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-price">{formatMoney(price)}</span>
          {onSale ? (
            <>
              <span className="text-caption text-muted line-through">{formatMoney(compare_at_price)}</span>
              <span className="text-caption font-semibold text-persimmon">-{off}%</span>
            </>
          ) : null}
        </div>
        {/* Only where stock is genuinely tracked and genuinely low. */}
        {lowStock ? (
          <p className="mt-0.5 text-caption font-semibold text-persimmon">Only {stock_quantity} left</p>
        ) : null}
      </Link>

      {chips.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="rounded-[6px] bg-persimmon/10 px-1.5 py-0.5 text-[11px] font-medium text-persimmon"
            >
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
