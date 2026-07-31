import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { useSearchProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { CategoryTile } from "../components/CategoryTile";
import { GiftCardTile } from "../components/GiftCardTile";

export function Browse() {
  const [query, setQuery] = useState("");
  const categories = useCategories();
  const search = useSearchProducts(query);
  const searching = query.trim().length > 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl">Browse</h1>
      <input
        className="mt-6 w-full max-w-md rounded-full border border-ink/15 px-5 py-3 text-sm outline-none focus:border-ink/40"
        placeholder="Search for gifts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching ? (
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {search.data?.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
          {search.data?.length === 0 ? <p className="text-ink/50">No results for "{query}"</p> : null}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {categories.data?.map((cat) => (
            <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} />
          ))}
          <GiftCardTile />
        </div>
      )}
    </div>
  );
}
