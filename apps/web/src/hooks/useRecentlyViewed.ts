import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";

/**
 * Recently viewed, device-local only.
 *
 * Deliberately localStorage and nothing else: no login needed, no server
 * writes, nothing anyone else can read. The list is the last ten product ids
 * this DEVICE opened, newest first — which is also why the section simply
 * does not exist in a fresh browser: there is no honest thing to show.
 */
const KEY = "cado-recently-viewed";
const MAX = 10;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Called by the product page on open. Failure is fine; it is only a memory. */
export function recordRecentlyViewed(productId: string) {
  try {
    const next = [productId, ...read().filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage must never break the product page.
  }
}

export function useRecentlyViewed() {
  const ids = read();
  return useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<FeedProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .in("id", ids)
        .eq("is_active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as FeedProduct[];
      // The database returns them in its own order; the list's order is the
      // device's history, so re-impose it.
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)).filter((r): r is FeedProduct => !!r);
    },
  });
}
