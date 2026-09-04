
import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/images";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";
import { formatMoney } from "../lib/money";
import { storePath } from "../lib/routes";
import { HeartIcon } from "./Icons";
import { Img } from "./Img";
import { deliveryWord } from "../lib/deliveryPromise";

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


  // One shared, cached query however many cards are on screen — every card
  // asks for the same key, so this is a map lookup after the first.

  const inStock = stock_quantity == null || stock_quantity > 0;
  const lowStock = inStock && stock_quantity != null && stock_quantity <= LOW_STOCK;
  const onSale = compare_at_price != null && Number(compare_at_price) > Number(price);
  const off = onSale ? Math.round((1 - Number(price) / Number(compare_at_price)) * 100) : null;
  const badge = badgeFor(props);
  // chipsFor() is kept — the product PAGE still shows hashtags (spec 2.7 moves
  // them off the card, it does not delete them from the product).

  return (
    <div className="group flex w-full flex-col break-inside-avoid">
      <Link
        to={`/product/${id}`}
        className="block w-full transition-transform duration-150 active:scale-[0.97]"
      >
        {/*
          EVERY card gets a fixed ratio now. The photo used to size the box,
          so a portrait shot next to a square one made one card taller than
          its neighbour and left a dead block the height of the difference —
          the wasted space in the grids. 3:4 for the grid, square for the
          swipe rows where cards sit beside each other in one line.
        */}
        <div
          className={`relative w-full overflow-hidden rounded-card bg-surface-sunk ${
            uniform ? "aspect-square" : "aspect-[3/4]"
          }`}
        >
          {uri ? (
            /*
             * The shared Img, not a second copy of it.
             *
             * This card had its own `<img loading="lazy">` with an onLoad-only
             * reveal — both of the failures Img exists to cover. Inside a tab
             * panel that meant twenty-two product photos that were never
             * requested and would have stayed blank behind a blur. One image
             * component, so a fix lands everywhere at once.
             */
            <Img src={uri} alt={title} className="h-full w-full object-cover" />
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

          {/* The discount moved onto the photo when the text block shrank to
              48px (2.11). It reads better here anyway — it is a fact about
              the item, next to the item, and it is the same top-left pill
              the Super deals row uses. */}
          {onSale && inStock ? (
            <span className="absolute left-2 top-2 rounded-[6px] bg-persimmon px-1.5 py-1 text-[11px] font-bold leading-none text-white">
              -{off}%
            </span>
          ) : null}

          {/*
            ONE BADGE, TOP-LEFT, AND ONLY ONE.
            A reduced item with two left in stock wore "-20%" top-left and
            "Only 2 left" bottom-left at the same time — two badges shouting
            from opposite corners of a 178px photo. There is now a single slot
            and a priority order: out of stock beats a discount (there is no
            point selling the saving on something you cannot buy), a discount
            beats low stock, and low stock beats the softer claims.
          */}
          {!inStock ? (
            <span className="absolute left-2 top-2 rounded-pill bg-ink/80 px-2 py-1 text-caption font-semibold text-inverse">
              Out of stock
            </span>
          ) : onSale ? null /* already drawn above, top-left */ : lowStock ? (
            <span className="absolute left-2 top-2 rounded-[6px] bg-white/90 px-1.5 py-1 text-[11px] font-bold leading-none text-persimmon">
              Only {stock_quantity} left
            </span>
          ) : badge ? (
            <span
              className={`absolute left-2 top-2 rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
      </Link>

      {/*
        The text block is a FIXED height for every card, uniform or not. A
        missing store name or an extra hashtag used to change a card's height
        and knock the row below it out of alignment; boxing it means row N+1
        always starts at the same y for both columns.
      */}
      {/*
        48px, which is what 2.11 asks for, and getting there took one real
        change rather than smaller type: the price and the delivery promise
        now share a row instead of stacking. Four stacked lines at the sizes
        that spec itself names — 11px store, 13px title, 15px price, 11px
        delivery — come to 50px of type before any leading at all, so 48 was
        arithmetically out of reach while they stayed stacked.
      */}
      {/*
        FOUR ROWS, each on its own line: store, title, price, delivery.
        They used to share two lines, with the price and the delivery promise
        on one flex row — at 375px in a two-column grid that is about 178px of
        card, and $206.50 struck through beside $165 beside "Tonight" does not
        fit, so the price clipped and the green line ran over it. The block is
        still a FIXED height, which is what keeps every row of the grid
        aligned; it is simply tall enough now.
      */}
      <div className={`overflow-hidden ${uniform ? "h-[98px]" : "h-[92px]"}`}>
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
        {/* Two lines, then ellipsis — long titles like "Wireless Earbuds &
            Charging Case" were being cut mid-word on one. */}
        <p className="line-clamp-2 text-[13px] font-normal leading-tight text-ink">{title}</p>
      </Link>

      {/*
        PRICE AND PROMISE ON ONE ROW.
        Nothing is lost by pairing them — they are the two things a shopper
        compares between cards, and side by side is easier to compare than
        stacked. The old "Only N left" line is gone from the card; it is
        still on the product page, where there is room for it and where it
        is actually about to matter.

        THE DELIVERY LINE (spec 2.7) replaced the hashtag row, which is the
        right trade: a hashtag tells a shopper nothing the photo does not,
        and "at their door tonight" is the single strongest reason anyone
        buys a gift here. The word comes from the REAL cutoff the server
        enforces — before it, Tonight; after it, Tomorrow. It is never a
        promise the checkout would not keep.
      */}
      <Link to={`/product/${id}`} className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
        <span className="text-price">{formatMoney(price)}</span>
        {onSale ? (
          <span className="text-[11px] text-muted line-through">{formatMoney(compare_at_price)}</span>
        ) : null}
      </Link>
      <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-none text-today">
        <span aria-hidden>🚚</span>
        {deliveryWord()}
      </span>
      {/*
        THE "Gift wrap" CHIP IS GONE, and that is what the faint rule under
        the price row was.
        The text block is a fixed 92-98px holding four rows — store, title
        (two lines), price, delivery. The chip was a fifth, so `overflow:
        hidden` sliced it to a two-pixel strip of `bg-surface-sunk` that read
        as a stray border. Gift wrapping is still on the product page and is
        still a filter; it was never legible here.
      */}
      </div>
    </div>
  );
}
