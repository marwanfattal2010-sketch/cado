import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProductsByCategory } from "../hooks/useProducts";
import { useStoresByCategory, useSubcategories } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [subcategory, setSubcategory] = useState<string | undefined>(undefined);
  const subcategories = useSubcategories(slug);
  const stores = useStoresByCategory(slug);
  const products = useProductsByCategory(slug, subcategory);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl capitalize">{slug?.replace(/-/g, " ")}</h1>

      {subcategories.data && subcategories.data.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSubcategory(undefined)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              !subcategory ? "border-ink bg-ink text-cream" : "border-ink/15 text-ink/60"
            }`}
          >
            All
          </button>
          {subcategories.data.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubcategory(sub.slug)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                subcategory === sub.slug ? "border-ink bg-ink text-cream" : "border-ink/15 text-ink/60"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      ) : null}

      {stores.data && stores.data.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink/50">STORES IN THIS CATEGORY</h2>
          <div className="flex flex-col gap-5">
            {stores.data.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.id}`}
                className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl bg-ink"
              >
                <img
                  src={`/categories/${slug}.jpg`}
                  alt={store.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="relative p-5">
                  <p className="font-display text-2xl font-semibold text-white sm:text-3xl">{store.name}</p>
                  {store.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-white/70">{store.description}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink/50">
          {subcategory ? "PRODUCTS" : "ALL PRODUCTS"}
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {products.data?.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
        {products.data?.length === 0 ? <p className="text-ink/50">No products here yet.</p> : null}
      </div>
    </div>
  );
}
