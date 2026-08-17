import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { ProductCard } from "../../ProductCard";
import { PRODUCT_CARD_COLUMNS, accentColor, type FeedProduct } from "../../../lib/browse";

/** Under this there is no "top" to speak of, only the category itself. */
const MIN_PRODUCTS = 4;
const SHOWN = 8;

/**
 * "Top of [category]" — a horizontal rail between the deals and the grid.
 *
 * WHAT "TOP" HONESTLY MEANS HERE, because the brief asked for best sellers
 * by real order data and that data is not reachable.
 *
 * The storefront cannot read `order_items` under RLS — that is deliberate,
 * one customer must not be able to count another's purchases — and there is
 * no view, no aggregate and no counter anywhere in the schema that exposes
 * sales volume to an anonymous visitor. The Bestseller badge on ProductCard
 * has been sitting dormant for exactly the same reason.
 *
 * So this uses the fallback the brief itself allows, in this order:
 *
 *   1. `is_trending` — an editorial flag a human sets in the dashboard. Not
 *      a sales rank, and it does not pretend to be one.
 *   2. newest first, for whatever is left.
 *
 * What it will NOT do is invent a rank. A row of products under a heading
 * that implies "most bought" when nothing was measured is precisely the kind
 * of fake the brief's rule 7 forbids — it is the same lie as "4.4k sold",
 * just wearing a heading instead of a number. The heading says "Top of", the
 * ordering is real, and no product claims a figure it cannot support.
 */
function useTopProducts(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["shop-top", categoryId ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        // Trending first, then newest inside each group. One query.
        .order("is_trending", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });
}

export function TopOfCategory({
  categoryId,
  categoryName,
  accentToken,
}: {
  categoryId?: string;
  categoryName?: string | null;
  accentToken: string;
}) {
  const top = useTopProducts(categoryId);
  const rows = top.data ?? [];

  if (rows.length < MIN_PRODUCTS) return null;

  return (
    <section className="pt-6">
      <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)]">
        {/* The category's own accent on the heading, so each page reads as
            its own place rather than as one long grey scroll. */}
        <h2 className="font-display text-h2" style={{ color: accentColor(accentToken) }}>
          Top of {categoryName ?? "CADO"}
        </h2>
      </div>

      {/*
        A RAIL, not a grid. Two more full-width grid sections stacked on one
        page turns scrolling into work; a rail adds a section's worth of
        interest for one row's worth of height, which is the whole reason the
        reference uses them.

        `w-[46%]` shows two cards and the edge of a third at 375px — the peek
        is what tells a thumb there is more to the right.
      */}
      <div className="scroll-row pt-3" style={{ ["--row-gap" as string]: "10px" }}>
        {rows.slice(0, SHOWN).map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 sm:w-[30%]">
            <ProductCard {...p} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
