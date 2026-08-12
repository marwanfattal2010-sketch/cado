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

/**
 * Photo, name, one line. No avatar.
 *
 * The 44px circle used to hold a two-letter monogram whenever a store had no
 * logo, which is most of them — so the row read as "BB · CS · CC", three
 * placeholders pretending to be brands. The storefront photo is the brand
 * here; a circle in front of it was only ever competing with it.
 */
function Label({ store }: { store: StoreCardStore }) {
  return (
    /* Name only, bottom-left. At 150px square there is no room for a
       description line without it truncating to nothing useful. */
    <div className="relative mt-auto p-3">
      <span className="block truncate text-[14.5px] font-bold leading-tight text-inverse drop-shadow">
        {store.name}
      </span>
    </div>
  );
}

/* Square, 150px. Small enough that three-and-a-bit are on screen at 375px,
   so the row obviously swipes; the 70vw landscape card before this showed
   barely more than one and read as a banner rather than a rail. */
const SHELL =
  "relative flex aspect-square w-[150px] shrink-0 flex-col overflow-hidden rounded-card bg-primary";

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
        <Label store={store} />
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
