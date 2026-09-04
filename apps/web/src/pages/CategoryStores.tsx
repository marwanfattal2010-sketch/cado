import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useCatalogue, useStoreDirectory } from "../hooks/useCatalogue";
import { StoreSquare } from "../components/shop/StoreSquare";
import { ChevronLeftIcon } from "../components/Icons";
import { Skeleton } from "../components/Skeleton";

/**
 * `/stores/:cat` — every shop stocking one category.
 *
 * The tab shows eight in a four-across grid because it is a shortcut, not a
 * directory. This is the directory: the same squares at three across, bigger,
 * running down the page, with nothing else on it.
 *
 * "Stocking this category" means having an active product in it, which is why
 * this reads the catalogue rather than a curated list — a shop that stops
 * stocking Fashion drops off this page on its own.
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
    const ids = new Set(
      (catalogue.data ?? []).filter((p) => p.category_id === category.id).map((p) => p.partner_id)
    );
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id) && s.slug)
      .map((s) => ({
        id: s.id,
        slug: s.slug as string,
        name: s.name.replace(/\[.*?\]\s*/g, ""),
        art: s.cover_image_url ?? s.logo_url,
        isLogo: !s.cover_image_url,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
