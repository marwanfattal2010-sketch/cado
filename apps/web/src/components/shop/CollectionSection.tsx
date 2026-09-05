import { Link } from "react-router-dom";
import { Img } from "../Img";
import { formatMoney } from "../../lib/money";
import { deliveryWord } from "../../lib/deliveryPromise";
import { productImageUrl } from "../../lib/images";
import type { FeedProduct } from "../../lib/browse";

/**
 * THE SECTION SHAPE, and every product row on the app now has it.
 *
 * A flat "title + horizontal row" gives a scroll no landmarks: five of them in
 * a column and the page is one long undifferentiated strip of cards. Three
 * things fix that, and they only work together:
 *
 *   1. The row sits in a ROUNDED CONTAINER on a tint, so a section is a
 *      visible object with edges rather than a stretch of page.
 *   2. A tall COLLECTION TILE leads the row — a photograph with the section's
 *      name across it. It is the poster for the row, and because it is a
 *      different shape from the cards it also tells you the row scrolls.
 *   3. Every card after it is IDENTICAL in width and height, so the eye stops
 *      measuring cards and starts reading products.
 *
 * The container is `--page` grey normally and `--tint` pale blue for Super
 * Deals — the one row that gets to look different, because a discount is the
 * one thing worth interrupting a scroll for.
 */

export function CollectionSection({
  title,
  products,
  href,
  tilePhoto,
  tileLabel,
  tone = "page",
  minItems = 3,
}: {
  title: string;
  products: FeedProduct[];
  /** Where both the pill and the collection tile lead. */
  href: string;
  /** The poster photograph. Without one the tile is skipped, never faked. */
  tilePhoto?: string | null;
  /** Uppercase words across the tile. Defaults to the section's own title. */
  tileLabel?: string;
  tone?: "page" | "tint";
  minItems?: number;
}) {
  // A rail under its floor is hidden outright rather than padded — the rule
  // the whole page follows.
  if (products.length < minItems) return null;

  return (
    <section className="mt-4 px-[var(--page-x)]">
      <div className={`rounded-[20px] ${tone === "tint" ? "bg-tint" : "bg-page"} px-3 pb-4 pt-3.5`}>
        <div className="flex items-center justify-between gap-3 pb-3">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
          {/* A pill, not a bare link: on a tinted ground an underlined word
              reads as body copy, a pill reads as a control. */}
          <Link
            to={href}
            className="shrink-0 rounded-pill border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-ink"
          >
            All items ›
          </Link>
        </div>

        <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
          {tilePhoto ? (
            <Link
              to={href}
              className="card-press relative block w-[132px] shrink-0 overflow-hidden rounded-[20px] bg-page"
              style={{ aspectRatio: "132 / 232" }}
            >
              <Img src={tilePhoto} className="absolute inset-0 h-full w-full object-cover" />
              {/* The gradient is at the TOP because the title is at the top.
                  A scrim at the foot of a tile whose words are at its head
                  darkens the one part of the photograph nothing needed. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,.62) 0%, rgba(0,0,0,0) 100%)",
                }}
              />
              <span className="absolute inset-x-3 top-3 text-[15px] font-bold uppercase leading-tight tracking-[0.02em] text-white">
                {tileLabel ?? title}
              </span>
            </Link>
          ) : null}

          {products.slice(0, 12).map((p) => (
            <RowCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * One product, and every product in every row is this card.
 *
 * Fixed width AND a fixed 1:1 photo box, so a row cannot step up and down as
 * the catalogue's mixed photography arrives. The text block underneath is
 * fixed-height for the same reason: a two-line title next to a one-line title
 * used to leave the prices on different baselines.
 */
function RowCard({ p }: { p: FeedProduct }) {
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  const uri = path ? productImageUrl(path) : null;
  const onSale = p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price);
  const off = onSale
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
    : null;

  return (
    <div className="card-press w-[144px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-white">
      <Link to={`/product/${p.id}`} className="block">
        <span className="relative block aspect-square overflow-hidden bg-white">
          {uri ? <Img src={uri} className="h-full w-full object-cover" /> : null}
          {onSale && off ? (
            <span className="absolute left-0 top-0 rounded-br-[10px] bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-white">
              -{off}%
            </span>
          ) : null}
          {/* The quick-add. One persimmon circle per card, and the only
              persimmon on a full-price card. */}
          <span
            aria-hidden
            className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-pill bg-accent text-[20px] font-bold leading-none text-white ring-2 ring-white"
          >
            +
          </span>
        </span>
      </Link>
      <div className="px-2.5 pb-2.5 pt-2">
        <Link to={`/product/${p.id}`} className="block">
          <p className="line-clamp-2 h-[38px] text-[15px] font-semibold leading-tight text-ink">
            {p.title}
          </p>
        </Link>
        <p className={`mt-1 text-[17px] font-bold leading-none ${onSale ? "text-accent" : "text-ink"}`}>
          {formatMoney(p.price)}
          {onSale ? (
            <s className="ml-1.5 text-[12px] font-normal text-text-3">
              {formatMoney(p.compare_at_price!)}
            </s>
          ) : null}
        </p>
        {p.partner?.name ? (
          <p className="mt-1 truncate text-[13px] text-muted">
            {p.partner.name.replace(/\[.*?\]\s*/g, "")}
          </p>
        ) : null}
        <p className="mt-0.5 text-[13px] text-success">{deliveryWord()}</p>
      </div>
    </div>
  );
}
