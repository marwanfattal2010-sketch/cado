import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { primaryImage } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { Img } from "../../Img";
import { accentColor, PRODUCT_CARD_COLUMNS, type FeedProduct } from "../../../lib/browse";

/** Four is the floor because the card shows two thumbnails and a "see all"
 *  chevron; three products behind that chevron is not a deal section. */
const MIN_PRODUCTS = 4;
const NEW_WINDOW_DAYS = 30;

/**
 * THE TWO THUMBNAILS COME FROM TWO DIFFERENT CATEGORIES.
 *
 * Both lists arrive in one order — newest first — and taking the first two
 * let a single category own the card. Five of the six newest products in the
 * catalogue are chocolate boxes, so New Arrivals was two chocolate boxes, and
 * Super Deals was a linen throw beside another piece of homeware. The card
 * read as a photograph problem and was actually a sampling one: nothing was
 * wrong with the pictures, they were just all of the same thing.
 *
 * So: take the strongest candidate, then the strongest one that isn't from
 * its category. Every product shown still qualifies on its own merits — this
 * only chooses between equals, and falls back to the plain order if the whole
 * list turns out to be one category.
 */
function twoFaces(list: FeedProduct[]): FeedProduct[] {
  const first = list[0];
  if (!first) return [];
  const other = list.find((p) => p.category_id !== first.category_id);
  return other ? [first, other] : list.slice(0, 2);
}

/**
 * Super Deals should lead with the best discount, not the most recent one.
 * The query orders by `created_at` because that is what New Arrivals needs;
 * a deals card ordered that way is showing you whichever markdown was typed
 * in last, which is a fact about the admin panel and not about the shop.
 */
function byDiscount(list: FeedProduct[]): FeedProduct[] {
  const off = (p: FeedProduct) => 1 - Number(p.price) / Number(p.compare_at_price);
  return [...list].sort((a, b) => off(b) - off(a));
}

function useDealProducts(categoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["shop-deals", categoryId ?? "all"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(120);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });
}

/**
 * The two-up "Super Deals" / "New Arrivals" cards.
 *
 * Both halves are real or absent. A product is in Super Deals only when its
 * own `compare_at_price` is genuinely above its price — the percentage is
 * computed from those two numbers and never typed. New Arrivals is a real
 * `created_at` window. Neither renders under four products, and if only one
 * qualifies it takes the full width rather than leaving a hole.
 *
 * The discount comparison is done here rather than in the query because
 * PostgREST filters compare a column to a literal, not to another column.
 * Fetching one page and filtering it is the honest version of that; it is not
 * a sample of the catalogue, it is a cap on how many can appear.
 */
export function DealPair({
  categoryId,
  accentToken,
}: {
  categoryId?: string;
  accentToken: string;
}) {
  const products = useDealProducts(categoryId, true);
  const rows = products.data ?? [];

  const onSale = rows.filter(
    (p) => p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)
  );
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const fresh = rows.filter((p) => new Date(p.created_at).getTime() >= cutoff);

  /*
   * THE HEADING IS A LINK NOW, NOT A FILTER SWITCH.
   *
   * Both halves used to call `onSelect`, which set a client-side filter object
   * on the panel underneath and left you on the home page — "Super Deals" in
   * particular passed no filter at all, so the tap did very little and never
   * looked like arriving anywhere. They open /deals and /new: the one results
   * page, with the sort row, the facet chips and the filter sheet the category
   * tabs use.
   */
  const cards: { key: string; title: string; items: FeedProduct[]; to: string }[] = [];
  if (onSale.length >= MIN_PRODUCTS) {
    // Best deals, not newest deals — see `byDiscount`.
    cards.push({ key: "deals", title: "Super Deals", items: twoFaces(byDiscount(onSale)), to: "/deals" });
  }
  if (fresh.length >= MIN_PRODUCTS) {
    cards.push({ key: "new", title: "New Arrivals", items: twoFaces(fresh), to: "/new" });
  }
  if (cards.length === 0) return null;

  return (
    <div className="flex gap-2 px-[var(--page-x)] pt-4">
      {cards.map((card) => (
        <div key={card.key} className="min-w-0 flex-1 rounded-[12px] bg-surface p-3 shadow-rest">
          <Link
            to={card.to}
            aria-label={`See all ${card.title}`}
            className="mb-2 flex w-full items-center justify-between gap-2"
          >
            <span className="truncate text-[15px] font-extrabold tracking-[-0.01em]">{card.title}</span>
            <span aria-hidden className="text-[15px] leading-none" style={{ color: accentColor(accentToken) }}>
              ›
            </span>
          </Link>
          <div className="flex gap-2">
            {card.items.map((p) => {
              const off =
                p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)
                  ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
                  : null;
              return (
                <Link key={p.id} to={`/product/${p.id}`} className="min-w-0 flex-1">
                  <span className="block aspect-square w-full overflow-hidden rounded-[8px] bg-surface-sunk">
                    <Img src={primaryImage(p.product_images)} className="h-full w-full object-cover" />
                  </span>
                  <span className="mt-1 block truncate text-[13px] font-bold">{formatMoney(p.price)}</span>
                  {off != null && off > 0 ? (
                    <span className="block text-[11px] font-semibold text-alert">-{off}%</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
