import { useParams } from "react-router-dom";
import { useStore, useStoreProducts } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";

export function Store() {
  const { id } = useParams<{ id: string }>();
  const store = useStore(id);
  const products = useStoreProducts(id);

  if (store.isLoading || !store.data) {
    return <div className="mx-auto max-w-6xl px-6 py-24 text-center text-ink/40">Loading...</div>;
  }

  return (
    <div>
      <div className="border-b border-ink/10 bg-ink/[0.03] px-6 py-16 text-center">
        <h1 className="font-display text-4xl">{store.data.name}</h1>
        {store.data.description ? <p className="mx-auto mt-3 max-w-lg text-ink/60">{store.data.description}</p> : null}
        {store.data.city ? <p className="mt-2 text-sm tracking-wide text-gold">{store.data.city}, Lebanon</p> : null}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {products.data?.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
        {products.data?.length === 0 ? <p className="text-ink/50">This store has no products yet.</p> : null}
      </div>
    </div>
  );
}
