import { Link } from "react-router-dom";
import { SectionHead } from "../SectionHead";
import { Skeleton } from "../Skeleton";
import { Img } from "../Img";
import { storePath } from "../../lib/routes";
import { useFeaturedStores, type FeaturedStore } from "../../hooks/useHomeEndless";

/**
 * "Stores on CADO" — the big swipeable store cards at the top of the lower
 * half. ~85% of the viewport wide so the next card peeks, which is the one
 * visual cue that the row scrolls.
 *
 * THE HOOK LINE UNDER THE NAME IS NEVER INVENTED. It is `partners.tagline`,
 * written by an admin; when that is empty it falls back to the store's own
 * description, then to its city — real facts already in the row. The spec's
 * example taglines include promo lines ("Up to 20% off this week"), and an
 * admin may truthfully write one; this component will faithfully show it.
 * What it will not do is fabricate one when the field is blank.
 */
export function FeaturedStores() {
  const stores = useFeaturedStores();

  if (stores.isLoading) {
    return (
      <section className="pt-7">
        <SectionHead title="Stores on CADO" />
        <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[180px] w-[85%] shrink-0 rounded-card" />
          ))}
        </div>
      </section>
    );
  }

  const list = stores.data ?? [];
  // Migration not applied yet, or nobody featured: the section does not
  // exist. The small logo row below still lists every store.
  if (list.length === 0) return null;

  return (
    <section className="pt-7">
      <SectionHead title="Stores on CADO" to="/stores" />
      <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
        {list.map((s) => (
          <FeaturedStoreCard key={s.id} store={s} />
        ))}
      </div>
    </section>
  );
}

function hook(store: FeaturedStore): string | null {
  if (store.tagline?.trim()) return store.tagline;
  if (store.description?.trim()) return store.description;
  return store.city ? `From ${store.city}` : null;
}

function FeaturedStoreCard({ store }: { store: FeaturedStore }) {
  const image = store.cover_image_url ?? store.logo_url;
  return (
    <Link
      to={storePath(store)}
      className="w-[85%] max-w-[420px] shrink-0 overflow-hidden rounded-card bg-surface shadow-rest transition-transform duration-press ease-out active:scale-[0.98]"
    >
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-surface-sunk">
        {image ? (
          <Img src={image} className="h-full w-full object-cover" />
        ) : (
          /* No cover and no logo: the name carries the card on a tinted
             field. Nothing invented, just quieter. */
          <div className="flex h-full w-full items-center justify-center bg-persimmon/10">
            <span className="font-display text-h2 text-persimmon">{store.name}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="truncate font-display text-h2">{store.name}</p>
        {hook(store) ? (
          <p className="mt-0.5 truncate text-caption text-muted">{hook(store)}</p>
        ) : null}
      </div>
    </Link>
  );
}
