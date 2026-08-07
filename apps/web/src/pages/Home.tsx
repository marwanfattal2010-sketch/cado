import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useTrendingProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { CategoryTile } from "../components/CategoryTile";
import { GiftCardTile } from "../components/GiftCardTile";
import { HeroCarousel } from "../components/HeroCarousel";
import { SearchIcon } from "../components/Icons";

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();

  return (
    <div>
      <section className="relative flex h-[60vh] min-h-[380px] flex-col items-center justify-center px-6 text-center">
        <HeroCarousel />
        <p className="relative text-[11px] font-medium tracking-[0.35em] text-gold">GIFTS, DELIVERED</p>
        <h1 className="relative mt-3 font-display text-5xl leading-tight tracking-wide text-white sm:text-6xl">
          Give something beautiful.
        </h1>
        <Link
          to="/gift-finder"
          className="relative mt-8 inline-block rounded-full bg-cream px-10 py-4 text-sm font-medium tracking-wide text-ink"
        >
          Find a gift
        </Link>
      </section>

      <div className="mx-auto max-w-6xl px-6 pt-4">
        <Link
          to="/search"
          className="flex items-center gap-3 rounded-full border border-ink/12 bg-white px-5 py-3.5 text-sm text-ink/40 shadow-sm"
        >
          <SearchIcon className="h-[18px] w-[18px] shrink-0" />
          Search stores or gifts...
        </Link>
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY CATEGORY</h2>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {categories.data?.map((cat, i) => (
            <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} size={i === 0 ? "featured" : "regular"} />
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
    </div>
  );
}
