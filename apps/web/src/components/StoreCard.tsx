import { Link } from "react-router-dom";
import { Img } from "./Img";

export type StoreCardStore = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  is_live?: boolean | null;
};

/** Two letters, from the first two words. Only ever a fallback for a store
 *  that hasn't uploaded a logo — rendered as a cream monogram on the cover
 *  rather than as the whole card, which is what made the old initial-circles
 *  look like a placeholder instead of a brand. */
function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function Cover({ store }: { store: StoreCardStore }) {
  return (
    <>
      <div className="absolute inset-0 bg-surface-sunk" />
      <Img
        src={store.cover_image_url}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Deep enough at the base to keep the name legible over a light
          photo, clear at the top so the photo is still the subject. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
    </>
  );
}

function Label({ store, muted = false }: { store: StoreCardStore; muted?: boolean }) {
  return (
    <div className="relative mt-auto flex items-end gap-3 p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-pill ${
          muted ? "bg-canvas/25 text-inverse/70" : "bg-canvas text-ink"
        } shadow-rest`}
      >
        {store.logo_url ? (
          <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-[15px] font-semibold leading-none">
            {monogram(store.name)}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-h2 leading-tight text-inverse drop-shadow">
          {store.name}
        </span>
        {store.description ? (
          <span className="mt-0.5 block truncate text-caption text-inverse/75">{store.description}</span>
        ) : null}
      </span>
    </div>
  );
}

const SHELL =
  "relative flex aspect-[4/3] w-[70vw] max-w-[300px] shrink-0 flex-col overflow-hidden rounded-card bg-primary sm:w-[280px]";

/**
 * The store card. Large enough to feel like a storefront rather than an
 * avatar: ~70% of the screen width, so the next card always peeks and the
 * row obviously swipes.
 *
 * A store with `is_live: false` is a real signing with no products yet. It
 * gets the "Coming soon" treatment in the same card style so the row still
 * looks consistent, and it is never a link — a dead tap is worse than an
 * honest label.
 *
 * `interactive={false}` renders the same live card WITHOUT the anchor, for
 * callers that wrap it in their own control (the category page uses it as a
 * filter button). It is a separate prop from `is_live` on purpose: faking
 * is_live to suppress the link is how live stores ended up wearing a
 * "Coming soon" badge on the category page.
 */
export function StoreCard({
  store,
  interactive = true,
}: {
  store: StoreCardStore;
  interactive?: boolean;
}) {
  if (store.is_live === false) {
    return (
      <div aria-disabled="true" className={SHELL}>
        {store.cover_image_url ? <Cover store={store} /> : null}
        <span className="absolute left-4 top-4 rounded-pill bg-canvas/90 px-2.5 py-1 text-caption font-semibold text-ink">
          Coming soon
        </span>
        <Label store={store} muted />
      </div>
    );
  }

  const body = (
    <>
      <Cover store={store} />
      <Label store={store} />
    </>
  );

  if (!interactive) return <div className={`${SHELL} shadow-rest`}>{body}</div>;

  return (
    <Link to={`/store/${store.id}`} className={`group ${SHELL} shadow-rest`}>
      {body}
    </Link>
  );
}

/** Same footprint as the card, so a row doesn't reflow when it loads. */
export function StoreCardSkeleton() {
  return <div className="skeleton aspect-[4/3] w-[70vw] max-w-[300px] shrink-0 rounded-card sm:w-[280px]" />;
}
