import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useFeaturedProducts, useTrendingProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { CategoryTile } from "../components/CategoryTile";
import { GiftCardTile } from "../components/GiftCardTile";
import { HeroCarousel } from "../components/HeroCarousel";

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();
  const featured = useFeaturedProducts();

  return (
    <div>
      <section className="relative flex h-[70vh] min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <HeroCarousel />
        <h1 className="relative font-display text-5xl leading-tight tracking-wide text-white sm:text-6xl">
          Never show up empty-handed.
        </h1>
        <Link
          to="/gift-finder"
          className="relative mt-8 inline-block rounded-full bg-cream px-10 py-4 text-sm font-medium tracking-wide text-ink"
        >
          Find a gift now
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-6 text-center">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">What are you searching for?</h2>
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
