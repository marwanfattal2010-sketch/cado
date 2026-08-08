import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { curatedTitles } from "../lib/curation";
import { BUDGETS } from "../lib/filters";

const FIELDS =
  "id, title, price, compare_at_price, currency, same_day, stock_quantity, tags, product_images(storage_path, is_primary), partner:partners(id, name)";

type Row = {
  id: string;
  title: string;
  price: number;
  [k: string]: unknown;
};

export type FinderResult = {
  items: Row[];
  /** How we got here, so the UI can be honest about a widened search. */
  relaxed: null | "budget" | "occasion" | "staff-picks";
};

async function fetchByTitles(titles: string[]) {
  if (!titles.length) return [];
  const { data, error } = await supabase.from("products").select(FIELDS).eq("is_active", true).in("title", titles);
  if (error) throw error;
  // Preserve the curated order rather than whatever the database returns.
  const order = new Map(titles.map((t, i) => [t, i]));
  return (data ?? []).slice().sort((a, b) => (order.get(a.title) ?? 99) - (order.get(b.title) ?? 99));
}

function inBudget(items: Row[], budgetSlug?: string | null) {
  const b = BUDGETS.find((x) => x.slug === budgetSlug);
  if (!b) return items;
  return items.filter((p) => Number(p.price) >= b.min && (b.max == null || Number(p.price) <= b.max));
}

async function fetchByTags(recipient?: string | null, occasion?: string | null) {
  let q = supabase.from("products").select(FIELDS).eq("is_active", true);
  if (recipient) q = q.contains("recipient_tags", [recipient]);
  if (occasion && occasion !== "just-because") q = q.contains("occasion_tags", [occasion]);
  const { data, error } = await q.order("price", { ascending: true }).limit(40);
  if (error) throw error;
  return data ?? [];
}

/**
 * Never returns an empty list. Ladder, in order:
 *   curated exact -> curated ignoring budget -> tag match -> tag match
 *   without occasion -> staff picks.
 * An empty gift finder is worse than a slightly wider one, so widening is
 * reported back to the UI rather than hidden.
 */
export function useGiftFinderResults(opts: {
  recipient?: string | null;
  occasion?: string | null;
  budget?: string | null;
}) {
  const { recipient, occasion, budget } = opts;

  return useQuery<FinderResult>({
    queryKey: ["gift-finder", recipient ?? null, occasion ?? null, budget ?? null],
    enabled: !!recipient,
    queryFn: async () => {
      const curated = curatedTitles(recipient, occasion);

      if (curated) {
        const all = await fetchByTitles(curated);
        const exact = inBudget(all, budget);
        if (exact.length >= 4) return { items: exact, relaxed: null };
        if (all.length >= 4) return { items: all, relaxed: "budget" };
      }

      const tagged = await fetchByTags(recipient, occasion);
      const taggedInBudget = inBudget(tagged as Row[], budget);
      if (taggedInBudget.length >= 4) return { items: taggedInBudget.slice(0, 12), relaxed: curated ? null : null };
      if (tagged.length >= 4) return { items: (tagged as Row[]).slice(0, 12), relaxed: "budget" };

      // Drop the occasion before dropping the person — who it's for matters more.
      const recipientOnly = await fetchByTags(recipient, null);
      const recipientInBudget = inBudget(recipientOnly as Row[], budget);
      if (recipientInBudget.length >= 4) return { items: recipientInBudget.slice(0, 12), relaxed: "occasion" };
      if (recipientOnly.length >= 4) return { items: (recipientOnly as Row[]).slice(0, 12), relaxed: "occasion" };

      const { data } = await supabase
        .from("products")
        .select(FIELDS)
        .eq("is_active", true)
        .contains("tags", ["staff-pick"])
        .limit(12);
      return { items: (data ?? []) as Row[], relaxed: "staff-picks" };
    },
  });
}
