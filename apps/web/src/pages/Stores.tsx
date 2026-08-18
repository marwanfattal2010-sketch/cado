import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { useTopStores } from "../hooks/useStores";

/**
 * /stores — every live store, one card each.
 *
 * This page exists because "Stores on CADO" needed a See-all destination and
 * there was none: /partners is the sell-with-us pitch for store OWNERS, and
 * /browse is categories. It deliberately reuses useTopStores' ordering — by
 * how much a store actually has to sell — and the existing StoreCard, so a
 * store looks the same here as it does everywhere else.
 */
export function Stores() {
  const stores = useTopStores();
  const list = (stores.data ?? []).filter((s) => s.is_live);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-h1">Stores on CADO</h1>
      <p className="mt-2 max-w-sm text-body text-muted">
        Real Lebanese shops, one checkout. Tap a store to see everything it sells.
      </p>

      {stores.isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <StoreCard key={s.id} store={s} />
          ))}
        </div>
      )}
    </div>
  );
}
