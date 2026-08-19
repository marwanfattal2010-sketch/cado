import { ProductCard } from "./ProductCard";
import type { FeedProduct } from "../lib/browse";

/**
 * THE horizontal product row. Every swipe row on Home renders this one
 * component, so "the rows don't match each other" cannot come back one
 * section at a time.
 *
 * The rules it enforces, all in one place:
 *  - every card the same fixed WIDTH (px, not %, so a row on a phone and the
 *    same row on a tablet are still a row of equal cards),
 *  - every card the same HEIGHT and the same photo ratio (`uniform`),
 *  - one 12px gap between cards, and the leading inset comes from
 *    `.scroll-row`'s page-margin padding, so card one lines up under the
 *    section title instead of being clipped by the screen edge.
 *
 * The card is deliberately narrow enough that the next one peeks in — the
 * row has to look swipeable without an arrow telling you so.
 */
export function ProductRail({ products, limit = 12 }: { products: FeedProduct[]; limit?: number }) {
  const list = products.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
      {list.map((p) => (
        <div key={p.id} className="w-[152px] shrink-0">
          <ProductCard {...p} compact uniform />
        </div>
      ))}
    </div>
  );
}
