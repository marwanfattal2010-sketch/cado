import { useParams } from "react-router-dom";
import { useStore, useStoreProducts } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ButtonLink } from "../components/ui";

export function Store() {
  const { id } = useParams<{ id: string }>();
  const store = useStore(id);
  const products = useStoreProducts(id);

  if (store.isLoading) {
    // The placeholder is the real page with the words taken out: the same
    // sunk header band, the same padding, the same grid underneath. The old
    // one was a centred stack on the plain canvas with different margins, so
    // the band and the grid both landed somewhere else when the store
    // arrived. Bars sit INSIDE the real headings so the line boxes — and
    // therefore the band's height — are the ones the page is about to use.
    return (
      // Keyed against the loaded branch below. A store with no description or
      // no city makes the real band shorter than any placeholder can predict,
      // and matching the loaded markup this closely means React would
      // otherwise reconcile the two and *move* the grid instead of replacing
      // the band it sits under.
      <div key="store-loading" aria-busy="true">
        <div className="border-b border-line bg-surface-sunk px-6 py-12 text-center">
          <h1 className="font-display text-display">
            <span className="skeleton inline-block h-[26px] w-2/3 rounded-pill align-middle" />
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-body text-muted">
            <span className="skeleton inline-block h-[11px] w-4/5 rounded-pill align-middle" />
          </p>
          <p className="mt-2 text-eyebrow uppercase">
            <span className="skeleton inline-block h-[9px] w-28 rounded-pill align-middle" />
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-8">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  // The old version treated "no store" as "still loading", so a bad link
  // span forever on the word Loading.
  if (!store.data) {
    return (
      <div key="store-missing" className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Store not found</h1>
        <p className="mt-2 text-body text-muted">This store may have closed, or the link is wrong.</p>
        <ButtonLink to="/browse" className="mt-6">
          Browse stores
        </ButtonLink>
      </div>
    );
  }

  const list = products.data ?? [];

  return (
    <div key="store-loaded">
      <div className="border-b border-line bg-surface-sunk px-6 py-12 text-center">
        <h1 className="font-display text-display">{store.data.name}</h1>
        {store.data.description ? (
          <p className="mx-auto mt-3 max-w-lg text-body text-muted">{store.data.description}</p>
        ) : null}
        {store.data.city ? (
          <p className="mt-2 text-eyebrow uppercase text-gold">{store.data.city}, Lebanon</p>
        ) : null}
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {products.isLoading ? (
          <ProductGridSkeleton count={6} />
        ) : list.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-muted">This store hasn't listed anything yet.</p>
            <ButtonLink to="/browse" variant="secondary" className="mt-6">
              See other stores
            </ButtonLink>
          </div>
        ) : (
          <div className="grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {list.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
