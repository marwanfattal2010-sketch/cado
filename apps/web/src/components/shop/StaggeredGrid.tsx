import { Link } from "react-router-dom";
import { Img } from "../Img";
import { formatMoney } from "../../lib/money";
import { storePath } from "../../lib/routes";
import { deliveryWord } from "../../lib/deliveryPromise";
import { productImageUrl } from "../../lib/images";
import type { FeedProduct } from "../../lib/browse";

/**
 * THE STAGGERED GRID, and the card that makes it stagger.
 *
 * The old grid pinned every photo to one ratio, so two columns marched down
 * the page in lockstep and the page read as a spreadsheet. Here each photo
 * keeps its own shape — a cap is square, a dress is tall — and the columns
 * fall out of step on their own. That offset is the whole effect.
 *
 * THE CLAMP IS THE POINT, THOUGH. Left alone, one 1:2 product photo makes a
 * card twice the height of its neighbour and the column below it never
 * recovers. Ratios are clamped to 1:1 – 1:1.5 and anything outside is
 * LETTERBOXED on white rather than cropped: cropping a tall product to fit is
 * how you end up selling a photograph of someone's knees.
 */

const MIN_RATIO = 1; // square
const MAX_RATIO = 1.5; // tall

/**
 * The ratio this card will use.
 *
 * `product_images` stores no width or height, so the real ratio is not known
 * until the browser has the file. Rather than guess or measure-then-reflow,
 * the shape is derived from the product's id — stable per product, so a card
 * is the same height every time you see it and the page does not reshuffle on
 * a re-render — and then the image is `object-contain` inside it, which is
 * what makes the letterbox rule true regardless of the real ratio.
 */
function ratioFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const steps = [1, 1.15, 1.25, 1.35, 1.5];
  return steps[h % steps.length] ?? MIN_RATIO;
}

export type CollectionCard = {
  key: string;
  title: string;
  href: string;
  items: { photo: string | null; price: number; note: string }[];
};

export function StaggeredGrid({
  products,
  collections = [],
  tone = "white",
}: {
  products: FeedProduct[];
  /**
   * Flowers sits on cream and wants no gutter at all; Fashion wants a gutter,
   * but a warm one — the default is a neutral grey that reads cool beside
   * persimmon. `white` (the results page) keeps that original grey.
   */
  tone?: "white" | "cream" | "fashion";
  /**
   * Two cards of a different shape at the top of the grid, one per column.
   * They break the rhythm exactly where the grid starts, which is what stops
   * the first screen of it reading as a wall.
   */
  collections?: CollectionCard[];
}) {
  return (
    <div className={tone === "white" ? "stagger" : `stagger stagger--${tone}`}>
      {collections.map((c) => (
        <CollectionTile key={c.key} card={c} />
      ))}
      {products.map((p) => (
        <StaggerCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function CollectionTile({ card }: { card: CollectionCard }) {
  return (
    <Link to={card.href} className="card-press block rounded-[16px] border border-card-line bg-white px-2.5 pb-3 pt-2.5 shadow-card">
      {/* Not italic any more: it was the only italic on the page, which made
          these two cards read as a different product rather than as a heading
          in the same family as every other section title. */}
      <span className="mb-2 flex items-center justify-between text-[14px] font-extrabold text-ink">
        {card.title}
        <span aria-hidden className="not-italic">
          ›
        </span>
      </span>
      <span className="grid grid-cols-2 gap-1.5">
        {card.items.map((it, i) => (
          <span key={i} className="block">
            <span className="photo-4x5 block rounded-[10px]">
              {it.photo ? <Img src={it.photo} className="h-full w-full object-cover" /> : null}
            </span>
            <b className="mt-1 block text-[13px] font-extrabold text-persimmon">
              {formatMoney(it.price)}
            </b>
            <span className="block text-[10.5px] text-persimmon">{it.note}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}

function StaggerCard({ product: p }: { product: FeedProduct }) {
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  const uri = path ? productImageUrl(path) : null;
  const onSale = p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price);
  const off = onSale
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
    : null;
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratioFor(p.id)));

  return (
    <div className="card-press overflow-hidden rounded-[16px] border border-card-line bg-white shadow-card">
      <Link to={`/product/${p.id}`} className="block">
        <span
          className="relative block w-full overflow-hidden bg-white"
          style={{ aspectRatio: `1 / ${ratio}` }}
        >
          {/* object-contain, so a photo outside the clamp letterboxes on white
              instead of losing the product to a crop. */}
          {uri ? <Img src={uri} className="h-full w-full object-contain" /> : null}
          {onSale && off ? (
            <span className="absolute left-0 top-0 rounded-br-[10px] bg-persimmon px-2 py-1 text-[11px] font-extrabold leading-none text-white">
              -{off}%
            </span>
          ) : null}
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-pill bg-white/90 text-[11px] text-muted"
          >
            ♡
          </span>
        </span>
      </Link>
      {/*
        FOUR ROWS, each on its own line: store, title, price, delivery. No
        fixed height here — a column card is allowed to end where its content
        ends, which is the opposite of the old grid's fixed text box, and is
        what keeps two neighbours different heights.
      */}
      <div className="px-2.5 pb-3 pt-2">
        {p.partner?.name ? (
          <Link
            to={storePath(p.partner)}
            className="block truncate text-[10.5px] text-muted"
          >
            {p.partner.name.replace(/\[.*?\]\s*/g, "")}
          </Link>
        ) : null}
        <Link to={`/product/${p.id}`} className="mt-0.5 block">
          <p className="line-clamp-2 text-[12.5px] leading-tight text-ink">{p.title}</p>
        </Link>
        {/* Ink at full price, coral on sale. The colour IS the discount
            signal, so wearing it at full price spends it for nothing. */}
        <p className={`mt-1 text-[15px] font-extrabold leading-none ${onSale ? "text-accent" : "text-ink"}`}>
          {formatMoney(p.price)}
          {onSale ? (
            <s className="ml-1.5 text-[11px] font-normal text-muted">
              {formatMoney(p.compare_at_price!)}
            </s>
          ) : null}
        </p>
        <p className="mt-1 text-[11px] leading-none text-today">{deliveryWord()}</p>
      </div>
    </div>
  );
}
