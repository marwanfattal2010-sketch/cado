import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useSearchProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

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
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {categories.data?.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="rounded-2xl border border-ink/10 px-4 py-6 text-center text-sm font-medium hover:border-ink/30"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
