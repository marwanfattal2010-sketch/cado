import { useParams } from "react-router-dom";
import { useProductsByCategory } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const products = useProductsByCategory(slug);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl capitalize">{slug?.replace(/-/g, " ")}</h1>
      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {products.data?.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
      {products.data?.length === 0 ? <p className="mt-10 text-ink/50">No products in this category yet.</p> : null}
    </div>
  );
}
