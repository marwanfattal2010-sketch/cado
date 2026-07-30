import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { ProductCard } from "../components/ProductCard";

export function GiftFinderResults() {
  const [params] = useSearchParams();
  const recipient = params.get("recipient") ?? "";
  const occasion = params.get("occasion") ?? "";
  const min = Number(params.get("min") ?? 0);
  const max = Number(params.get("max") ?? 100000);

  const results = useQuery({
    queryKey: ["gift-recommendations", recipient, occasion, min, max],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gift_recommendations", {
        p_recipient: recipient,
        p_occasion: occasion,
        p_budget_min: min,
        p_budget_max: max,
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link to="/gift-finder" className="text-sm text-ink/40 hover:text-ink">
        ← Try again
      </Link>
      <h1 className="mt-4 font-display text-3xl">Gifts for this occasion</h1>

      {results.isLoading ? (
        <p className="mt-10 text-ink/50">Finding gifts...</p>
      ) : results.data && results.data.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {results.data.map((p: any) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-ink/50">
          No matches yet — the catalog is still growing.{" "}
          <Link to="/browse" className="font-medium text-ink">
            Browse everything
          </Link>
        </p>
      )}
    </div>
  );
}
