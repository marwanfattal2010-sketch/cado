import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useCatalogue, useStoreDirectory } from "../hooks/useCatalogue";
import { StoreSquare } from "../components/shop/StoreSquare";
import { ChevronLeftIcon } from "../components/Icons";
import { Skeleton } from "../components/Skeleton";
import { categoryStores, storeDisplayName } from "../lib/browse";

/**
 * `/stores/:cat` — every shop in one category.
 *
 * The tab shows eight in a four-across grid because it is a shortcut, not a
 * directory. This is the directory: the same squares at three across, bigger,
 * running down the page, with nothing else on it.
 *
 * WHO IS ON IT is `categoryStores` in lib/browse.ts — the same rule the tab's
 * circle row uses, so "See all 11" cannot lead to a page of 5. A shop is here
 * if it stocks the category or is pinned to it (0096), pinned ones first in
 * their pinned order. Still no curated list in this file: a shop that stops
 * stocking Fashion drops off on its own, and a pinned one moves with an
 * UPDATE.
 */
export function CategoryStores() {
  const { cat = "" } = useParams();
  const navigate = useNavigate();
  const categories = useCategories();
  const catalogue = useCatalogue();
  const directory = useStoreDirectory();

  const category = categories.data?.find((c) => c.slug === cat);
  const categoryName = category?.name ?? "";

  const stores = useMemo(() => {
    if (!category) return [];
    return categoryStores({
      stores: directory.data ?? [],
      products: catalogue.data ?? [],
      categoryId: category.id,
    }).map((s) => ({
      id: s.id,
      slug: s.slug as string,
      name: storeDisplayName(s.name),
      // Unchanged from before: cover photo where there is one, logo otherwise.
      // A pinned shop with neither yet passes `art: null`, and StoreSquare
      // draws an empty white disc — which is honest, and is what it should
      // keep doing until Marwan drops the real logo file in.
      art: s.cover_image_url ?? s.logo_url,
      isLogo: !s.cover_image_url,
    }));
  }, [catalogue.data, directory.data, category]);

  const loading = categories.isLoading || catalogue.isLoading || directory.isLoading;

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="flex items-center gap-1 px-2 pb-2 pt-1.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">
            Stores in {categoryName}
          </h1>
          <p className="text-[11px] leading-none text-muted">
            {stores.length} {stores.length === 1 ? "shop" : "shops"}
          </p>
        </div>
      </div>

      <div className="px-[var(--page-x)] pb-16">
        {loading ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-[12px]" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-muted">
            No shops stock {categoryName.toLowerCase()} yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            {stores.map((s) => (
              <StoreSquare key={s.id} store={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
