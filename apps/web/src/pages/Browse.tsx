import { useState } from "react";
import { Link } from "react-router-dom";
import { useStockedCategories } from "../hooks/useCategories";
import { useSearchProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton, Skeleton } from "../components/Skeleton";
import { CategoryTile } from "../components/CategoryTile";

export function Browse() {
  const [query, setQuery] = useState("");
  // Stocked only. This grid is the "what can I shop?" answer, so a tile that
  // opens onto nothing is a wrong answer, not a smaller one.
  const categories = useStockedCategories();
  const search = useSearchProducts(query);
  const searching = query.trim().length > 1;
  const results = search.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-h1">Browse</h1>
      <input
        className="mt-5 w-full max-w-md rounded-pill border border-line bg-surface px-5 py-3.5 text-body outline-none transition focus:border-ink/35"
        placeholder="Search for gifts..."
        aria-label="Search for gifts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching ? (
        search.isLoading ? (
          <div className="mt-8">
            <ProductGridSkeleton count={6} />
          </div>
        ) : results.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-body text-muted">Nothing matches “{query}” yet.</p>
            <p className="mt-2 text-body text-muted">
              Try a category below, or let the{" "}
              <Link to="/gift-finder" className="font-medium text-ink underline">
                gift finder
              </Link>{" "}
              pick for you.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )
      ) : categories.isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : categories.data?.length ? (
        <div className="mt-8 grid animate-fade-in grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {categories.data.map((cat) => (
            <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} />
          ))}
        </div>
      ) : (
        /* Only reachable if every category is out of stock at once, but the
           grid filters itself now, so it can happen — and a bare white page
           with a search box is not an answer. */
        <div className="mt-16 text-center">
          <p className="font-display text-h2">No categories to show yet</p>
          <p className="mx-auto mt-2 max-w-xs text-body text-muted">
            We're still adding gifts. Try a search above, or let the gift finder ask you a couple
            of questions.
          </p>
          <Link
            to="/gift-finder"
            className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
          >
            Open the gift finder
          </Link>
        </div>
      )}
    </div>
  );
}
