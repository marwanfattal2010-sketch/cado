import { useState } from "react";
import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/images";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";
import { formatMoney } from "../lib/money";
import { storePath } from "../lib/routes";
import { occasionByValue, recipientByValue } from "../lib/filters";
import { useCategories } from "../hooks/useCategories";
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
  /** Whether this seller can actually wrap THIS item. The card only claims
   *  "Arrives wrapped" where that is true. */
  gift_wrap_available?: boolean | null;
  /** Resolved to a name and a tab slug for the category chip. */
  category_id?: string | null;
  /** Filled in by the card from `category_id`; never passed by callers. */
  category_slug?: string | null;
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
  /**
   * Every card the same size as its siblings: square photo, fixed text box.
   * For swipe rows and the favorites grid, where ragged heights read as
   * broken. Geometry only — it hides no information except surplus tag chips.
   */
  uniform?: boolean;
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

  // The same three conditions the delivery promise is made on everywhere
  // else: the store offers it, stock is known and positive, and the midnight
  // cut-off has not passed.
  //
  // This is deliberately ABOVE "New". A whole category seeded in the same
  // week makes every card in it say New, which is true and tells a shopper
  // nothing — and it was hiding the one badge that actually changes a
  // decision. "New" now only surfaces where there is no better claim to make.
  const arrivesToday =
    p.same_day === true && p.stock_quantity != null && p.stock_quantity > 0 && !timeUntilCutoff().passed;
  if (arrivesToday) return { label: "Arrives today", className: "bg-today text-white" };

  if (p.created_at) {
    const age = Date.now() - new Date(p.created_at).getTime();
    if (age >= 0 && age < NEW_DAYS * 24 * 60 * 60 * 1000) {
      return { label: "New", className: "bg-ink text-inverse" };
    }
  }

  return null;
}

type Chip = { label: string; to: string; className: string };

/**
 * The colour of a tag says what KIND of tag it is.
 *
 * Three hues, one per kind, each a soft tint with a darker version of its own
 * hue for the letters — so "#Birthday" and "#ForKids" are legibly different
 * things at a glance rather than the same red hashtag repeated. Contrast for
 * every pairing is measured in the note beside the tokens in index.css.
 *
 * Quiet on purpose: these sit under the price and must not out-shout it.
 */
const CHIP_STYLE = {
  occasion: "bg-tint-blush text-deep-blush",
  recipient: "bg-tint-sage text-deep-sage",
  category: "bg-tint-sand text-deep-sand",
} as const;

/**
 * Up to three chips, from tag columns that really hold those values.
 *
 * One of each kind first, then backfill — a card wearing three occasions
 * would be three blush chips and would waste the colour coding entirely.
 * Nothing here invents a tag: an untagged product simply shows fewer chips,
 * which is the same rule the occasion filters run on.
 */
function chipsFor(p: ProductCardProps, categoryName?: string | null): Chip[] {
  const occasions = (p.occasion_tags ?? [])
    .map(occasionByValue)
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({
      label: `#${o.label.replace(/\s+/g, "")}`,
      to: `/gift-finder?occasion=${o.value}`,
      className: CHIP_STYLE.occasion,
    }));

  const recipients = (p.recipient_tags ?? [])
    .map(recipientByValue)
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      label: `#${r.label.replace(/\s+/g, "")}`,
      to: `/gift-finder?recipient=${r.value}`,
      className: CHIP_STYLE.recipient,
    }));

  const category: Chip[] = categoryName
    ? [
        {
          label: `#${categoryName.replace(/\s*&\s*/g, "").replace(/\s+/g, "")}`,
          to: `/?tab=${p.category_slug ?? ""}`,
          className: CHIP_STYLE.category,
        },
      ]
    : [];

  const out: Chip[] = [];
  // One of each kind, in the order a shopper cares about them.
  for (const list of [occasions, recipients, category]) if (list[0]) out.push(list[0]);
  // Then backfill from whatever is left over, still capped at three.
  for (const list of [occasions, recipients]) {
    for (const c of list.slice(1)) {
      if (out.length >= 3) break;
      out.push(c);
    }
  }
  return out.slice(0, 3);
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
  const {
    id,
    title,
    price,
    compare_at_price,
    stock_quantity,
    product_images,
    partner,
    compact = false,
    /**
     * UNIFORM MODE — every card exactly the same size as its siblings.
     *
     * The free-height card above is right for the masonry feed and wrong for
     * a swipe row: a row of photos with their own aspect ratios is a row of
     * different-height cards with ragged gaps. Uniform mode pins the photo to
     * a square and gives the text below it a fixed box, so a rail (or a
     * favorites grid) reads as one clean band. It changes no content — the
     * same store, title, price and honest low-stock line — only its geometry.
     */
    uniform = false,
  } = props;
  const uri = gridImage(product_images);
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds.has(id);
  const [loaded, setLoaded] = useState(false);

  // One shared, cached query however many cards are on screen — every card
  // asks for the same key, so this is a map lookup after the first.
  const categories = useCategories();
  const category = categories.data?.find((c) => c.id === props.category_id) ?? null;

  const inStock = stock_quantity == null || stock_quantity > 0;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= LOW_STOCK;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);
  const off = onSale ? Math.round((1 - Number(price) / Number(compare_at_price)) * 100) : null;
  const badge = badgeFor(props);
  const chips = chipsFor({ ...props, category_slug: category?.slug ?? null }, category?.name);

  return (
    <div className={`group w-full break-inside-avoid ${uniform ? "flex flex-col" : "mb-3"}`}>
      <Link
        to={`/product/${id}`}
        className="block w-full transition-transform duration-150 active:scale-[0.97]"
      >
        {/* No fixed ratio: the tinted box is sized by the image itself, so the
            card is as tall as its photo and the columns fall out of step.
            Uniform mode squares it, which is the whole point of uniform. */}
        <div
          className={`relative w-full overflow-hidden rounded-card bg-surface-sunk ${
            uniform ? "aspect-square" : ""
          }`}
        >
          {uri ? (
            <img
              src={uri}
              alt={title}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className={`w-full object-cover transition-all duration-500 ${
                uniform ? "h-full" : "h-auto"
              } ${loaded ? "blur-0 opacity-100" : "blur-md opacity-0"}`}
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
            /* The heart is 28px of ink inside a 40px invisible hit area.
               Both numbers matter: at 32px it dominated the photo, and at a
               32px TARGET it would be under the minimum for a control sitting
               on top of a whole-card link, where a near-miss opens the
               product instead. So the circle shrank and the target did not. */
            className="absolute right-0 top-0 flex h-[40px] w-[40px] items-center justify-center transition active:scale-90"
          >
            {/* Explicit px, not the spacing scale: this project's scale is
                bespoke — `h-7` is 48px here, not the 28px it is by default —
                and the whole point of this control is its exact size. */}
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-pill bg-white/85 text-ink/70 backdrop-blur-[2px] transition hover:text-ink">
              <HeartIcon className="h-4 w-4" filled={isFavorite} />
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

      {/* Uniform mode boxes everything under the photo at one fixed height,
          so a missing store name or a low-stock line cannot make this card
          taller than the one beside it. `contents` means the free-height card
          is laid out exactly as before. */}
      <div className={uniform ? "h-[92px] overflow-hidden" : "contents"}>
      {/* Store first — the trust signal, and its own link. Its own colour
          too, so "who is this from" is scannable without reading the title. */}
      {partner?.name ? (
        <Link
          to={storePath(partner)}
          className={`${
            compact ? "mt-1" : "mt-1.5"
          } -my-1 block truncate py-1 text-[11px] font-medium leading-tight tracking-[0.01em] text-store-name underline-offset-2 hover:underline`}
        >
          {partner.name}
        </Link>
      ) : null}

      <Link to={`/product/${id}`} className="block w-full">
        {/* ONE line, ellipsed. Two lines of bold set every card to a
            different height for no information gained — the full title is on
            the product page, which is one tap away. */}
        <p className="mt-0.5 truncate text-[13px] font-normal leading-snug text-ink">{title}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-price">{formatMoney(price)}</span>
          {onSale ? (
            <>
              <span className="text-[11px] text-muted line-through">{formatMoney(compare_at_price)}</span>
              <span className="text-[11px] font-semibold text-persimmon">-{off}%</span>
            </>
          ) : null}
        </div>
        {/* Only where stock is genuinely tracked and genuinely low. */}
        {lowStock ? (
          <p className="mt-0.5 text-[11px] font-semibold text-persimmon">Only {stock_quantity} left</p>
        ) : null}
        {/* Only where the seller genuinely wraps this item — about half the
            catalogue does. Printing it on everything would be a promise the
            other half cannot keep. Not shown on the uniform card, whose text
            box is a fixed height. */}
        {!uniform && props.gift_wrap_available ? (
          <p className="mt-0.5 text-[11px] text-muted">Arrives wrapped</p>
        ) : null}
      </Link>

      {chips.length > 0 ? (
        // One chip only in uniform mode: three of them wrap onto a second
        // line on a narrow card, and a wrapping row is a variable height.
        <div className={`mt-1 flex gap-1 ${uniform ? "flex-nowrap overflow-hidden" : "flex-wrap"}`}>
          {(uniform ? chips.slice(0, 1) : chips).map((c) => (
            <Link
              key={`${c.className}-${c.to}`}
              to={c.to}
              className={`rounded-[4px] px-1.5 py-[3px] text-[10px] font-medium leading-none ${c.className}`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}
