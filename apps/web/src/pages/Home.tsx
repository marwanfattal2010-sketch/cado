import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useFeaturedProducts, useTrendingProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { CategoryTile } from "../components/CategoryTile";
import { GiftCardTile } from "../components/GiftCardTile";

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();
  const featured = useFeaturedProducts();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
        <h1 className="font-display text-5xl leading-tight tracking-wide sm:text-6xl">Never show up empty-handed.</h1>
        <Link
          to="/gift-finder"
          className="mt-8 inline-block rounded-full bg-ink px-10 py-4 text-sm font-medium tracking-wide text-cream"
        >
          Find a gift now
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-5">
          {categories.data?.map((cat) => (
            <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} />
          ))}
          <GiftCardTile />
        </div>
      </section>

      {trending.data && trending.data.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">TRENDING GIFTS</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {trending.data.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      ) : null}

      {featured.data && featured.data.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">RECOMMENDED FOR YOU</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {featured.data.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
