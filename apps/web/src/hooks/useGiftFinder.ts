import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { curatedTitles } from "../lib/curation";
import { budgetBySlug, inBudgetRange, occasionByValue } from "../lib/filters";

// recipient_tags and the category embed ride along so the results screen can
// build its refine-chips from the gifts actually in view, rather than from a
// hardcoded list that would offer filters matching nothing. Both are plain
// reads on columns the storefront already exposes elsewhere.
const FIELDS =
  "id, title, price, compare_at_price, currency, same_day, stock_quantity, tags, created_at, is_trending, recipient_tags, occasion_tags, color, category:categories(slug, name), subcategory:subcategories(slug, name), product_images(storage_path, is_primary), partner:partners(id, name)";

export type Row = {
  id: string;
  title: string;
  price: number;
  recipient_tags?: string[] | null;
  category?: { slug: string; name: string } | null;
  [k: string]: unknown;
};

export type GiftResult = {
  items: Row[];
  /**
   * How honest the screen has to be about what it is showing.
   *   null                — exactly what was asked for.
   *   "occasion-thin"     — too few gifts for that occasion, so the occasion
   *                         was dropped and other gifts for the same person
   *                         are shown instead.
   *   "occasion-untagged" — nothing in the catalogue carries that occasion
   *                         tag at all yet.
   *
   * The budget is NEVER relaxed. Showing a $65 gift under a heading that
   * says "Under $20" is exactly what teaches people not to trust a filter,
   * so a thin band shows a thin grid and says why.
   */
  relaxed: null | "occasion-thin" | "occasion-untagged";
  /** How many matched before the budget was applied — lets the empty state
   *  say "there are 12 gifts for Mom, just none in this band". */
  totalBeforeBudget: number;
};

async function fetchByTitles(titles: string[]) {
  if (!titles.length) return [];
  const { data, error } = await supabase.from("products").select(FIELDS).eq("is_active", true).in("title", titles);
  if (error) throw error;
  // Preserve the curated order rather than whatever the database returns.
  const order = new Map(titles.map((t, i) => [t, i]));
  return (data ?? []).slice().sort((a, b) => (order.get(a.title) ?? 99) - (order.get(b.title) ?? 99));
}

async function fetchByTags(recipient?: string | null, occasion?: string | null) {
  let q = supabase.from("products").select(FIELDS).eq("is_active", true);
  if (recipient) q = q.contains("recipient_tags", [recipient]);
  if (occasion) q = q.contains("occasion_tags", [occasion]);
  /**
   * 200, not 60.
   *
   * Everything below this — the budget band, the category answer, every
   * refine chip — is applied client-side to whatever this returns, so the cap
   * silently decided the answer: with 72 active products, "Under $50" showed
   * 21 of the real 23, and "Under $50 + Chocolate" showed 1 of the real 3,
   * because the missing rows were simply not among the newest 60. A count
   * that disagrees with the catalogue is worse than a slightly larger fetch.
   */
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

/**
 * Backs every path into a gift grid: an occasion chip, a recipient card, a
 * budget chip, and the two-step quiz. Any combination of the three filters
 * is valid, including none at all — a "Skip" on step one has to land on
 * real gifts, not a dead end.
 */
export function useGiftResults(opts: {
  recipient?: string | null;
  occasion?: string | null;
  budget?: string | null;
}) {
  const { recipient = null, occasion = null, budget = null } = opts;

  return useQuery<GiftResult>({
    queryKey: ["gift-results", recipient, occasion, budget],
    queryFn: async () => {
      const occ = occasionByValue(occasion);
      // "just-because" means no occasion, and an occasion nothing is tagged
      // with has nothing to filter on — neither should reach the database.
      const occasionTag = occ?.tagged ? occ.value : null;
      const band = budgetBySlug(budget);

      let base: Row[] = [];
      let relaxed: GiftResult["relaxed"] = null;

      // Hand-picked lists first, and only for combinations someone actually
      // curated. Pure tag-filtering is what makes a gift finder feel like it
      // doesn't understand you.
      const curated = recipient && occasionTag ? curatedTitles(recipient, occasionTag) : null;
      if (curated) base = (await fetchByTitles(curated)) as unknown as Row[];

      if (base.length < 4) base = await fetchByTags(recipient, occasionTag);

      // Too thin for that occasion — widen to the same person, and say so.
      if (occasionTag && base.length < 4) {
        const wider = await fetchByTags(recipient, null);
        if (wider.length > base.length) {
          base = wider;
          relaxed = "occasion-thin";
        }
      }

      // The occasion exists as a chip but nothing carries the tag yet.
      if (occ && !occ.tagged && occ.value !== "just-because") relaxed = "occasion-untagged";

      return {
        items: base.filter((p) => inBudgetRange(Number(p.price), band)),
        relaxed,
        totalBeforeBudget: base.length,
      };
    },
  });
}
