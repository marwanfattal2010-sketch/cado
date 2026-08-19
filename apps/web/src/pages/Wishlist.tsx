import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { useFavorites, useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { useCategories } from "../hooks/useCategories";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { HeartIcon } from "../components/Icons";
import { ButtonLink, useToast } from "../components/ui";

/** Chips only earn their place once the list is big enough to need them. */
const CHIPS_FROM = 8;

/**
 * Favorites as a proper shop grid: the same ProductCard as every other page
 * (same photo, title, price, store colour, small heart), two columns, and the
 * heart on a card does here what it does everywhere — with an Undo, because
 * this is the one page where a mis-tap erases the very thing being looked at.
 *
 * No login gate on purpose: signed-out hearts live on this device (see
 * useFavorites) and render here just the same.
 */
export function Wishlist() {
  const { session } = useAuth();
  const favorites = useFavorites();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const toast = useToast();
  const categories = useCategories();

  const items = useMemo(() => favorites.data ?? [], [favorites.data]);
  const [filter, setFilter] = useState<string | null>(null);

  /**
   * The Undo mechanics. The heart itself removes (shared behaviour, not a
   * new one), so this page just watches the id set: when an id that was here
   * disappears, offer to put it back. The ref keeps the previous set;
   * comparing inside an effect keeps render pure.
   */
  const prevIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = favoriteIds;
    const before = prevIds.current;
    prevIds.current = new Set(now);
    if (!before) return;
    for (const id of before) {
      if (!now.has(id)) {
        toast("Removed from favorites", {
          label: "Undo",
          onClick: () => toggleFavorite.mutate({ productId: id, isFavorite: false }),
        });
        break; // one removal per tap; one toast.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteIds]);

  /** Categories actually present in the list — never an empty chip. */
  const presentCats = useMemo(() => {
    const ids = new Set(items.map((f) => f.product?.category_id).filter(Boolean));
    return (categories.data ?? []).filter((c) => ids.has(c.id));
  }, [items, categories.data]);

  const shown = filter ? items.filter((f) => f.product?.category_id === filter) : items;

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <div className="flex items-baseline gap-2">
        <h1 className="font-display text-h1">Your favorites</h1>
        {items.length > 0 ? (
          <span className="text-caption text-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {!session && items.length > 0 ? (
        <p className="mt-1 text-caption text-muted">
          Saved on this device — log in to keep them on every device.
        </p>
      ) : null}

      {items.length >= CHIPS_FROM && presentCats.length > 1 ? (
        <div className="scroll-row mt-4" style={{ ["--row-gap" as string]: "6px" }}>
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            All
          </FilterChip>
          {presentCats.map((c) => (
            <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.name}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {favorites.isLoading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={4} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <HeartIcon className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-body text-muted">Nothing saved yet — tap the heart on anything you like.</p>
          <ButtonLink to="/" variant="accent" className="mt-6">
            Browse gifts
          </ButtonLink>
        </div>
      ) : (
        /* Uniform cards, so this reads as a grid and not as a pile: every
           photo square, every text box the same height, so row two starts on
           one straight line instead of stepping around the tallest card in
           row one. `items-start` keeps the cells from stretching. */
        <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((f) =>
            f.product ? (
              <div
                key={f.id}
                className={`transition-all duration-200 ${
                  favoriteIds.has(f.product.id) ? "" : "scale-95 opacity-0"
                }`}
              >
                <ProductCard {...f.product} compact uniform />
              </div>
            ) : null
          )}
        </div>
      )}
      {/* Clear of the pinned bottom nav. */}
      <div className="h-24" />
    </div>
  );
}

/** The app-wide chip rule: solid rectangles, not pills. */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-[4px] border px-3.5 text-[13px] font-medium transition-colors ${
        active ? "border-persimmon bg-persimmon text-white" : "border-ink bg-canvas text-ink"
      }`}
    >
      {children}
    </button>
  );
}
