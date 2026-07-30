import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useFeaturedProducts, useTrendingProducts, useUpcomingOccasionEvents } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();
  const featured = useFeaturedProducts();
  const occasions = useUpcomingOccasionEvents();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <h1 className="font-display text-5xl leading-tight tracking-wide sm:text-6xl">
          Find the perfect gift,
          <br />
          delivered.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-ink/60">
          Lebanon's marketplace for flowers, fashion, jewelry, beauty, kids' gifts, and chocolate — from your
          favorite local stores.
        </p>
        <Link
          to="/gift-finder"
          className="mt-8 inline-block rounded-full bg-ink px-8 py-3 text-sm tracking-wide text-cream"
        >
          Find a gift
        </Link>
      </section>

      {occasions.data && occasions.data.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">UPCOMING OCCASIONS</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {occasions.data.map((event) => (
              <div key={event.id} className="min-w-[220px] rounded-2xl bg-ink/5 p-5">
                <p className="font-medium">{event.title}</p>
                <p className="mt-1 text-sm text-ink/50">{event.event_date}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">CATEGORIES</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
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
