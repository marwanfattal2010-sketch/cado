import { Link } from "react-router-dom";
import { Img } from "../Img";
import { PhotoCard } from "../PhotoCard";
import { SectionHead } from "../SectionHead";
import { GiftCardBanner } from "../GiftCardBanner";
import { useTopStores } from "../../hooks/useStores";
import { OCCASIONS } from "../../lib/filters";
import { storePath } from "../../lib/routes";

/**
 * The three sections carried over from the old Home page when the Shop page
 * took its place.
 *
 * They keep exactly the look they had — same components, same photos, same
 * copy. The only thing changed is the vertical rhythm: `pt-5` instead of
 * `pt-7`, so they sit on the same spacing scale as the Shop page's own
 * sections rather than reading as something pasted in from another screen.
 *
 * All three render only on the All tab. Inside a category tab they would be
 * repeating a page-level pitch nine times over.
 */

/** Every occasion, in the order Marwan set: Visiting Someone leads, because
 *  arriving somewhere with something in your hand is the most common gifting
 *  occasion in Lebanon. Each card goes straight to a filtered grid. */
export function OccasionRail() {
  return (
    <section className="pt-5">
      <SectionHead title="Shop by occasion" />
      <div className="scroll-row">
        {OCCASIONS.map((o) => (
          <PhotoCard key={o.value} to={`/gift-finder?occasion=${o.value}`} img={o.img} label={o.label} />
        ))}
      </div>
    </section>
  );
}

export function GiftCardSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5">
      <GiftCardBanner />
    </section>
  );
}

/**
 * The round store row.
 *
 * The first live store is left out, exactly as before. It used to be the one
 * shown large in the "Store spotlight" card directly above this row, and the
 * circles were "and here is everyone else". The spotlight card is gone with
 * the old Home, but the big Stores cards a section above lead with that same
 * shop, so skipping it here still avoids showing one store twice in a row.
 *
 * Coming-soon stores stay out: a 64px circle has no room for the "Coming
 * soon" label, and an unlabelled dead tap is worse than absence.
 */
export function StoreCirclesRow() {
  const stores = useTopStores();
  const live = (stores.data ?? []).filter((s) => s.is_live);
  const rest = live.slice(1);
  if (rest.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rest.map((store) => (
          <Link
            key={store.id}
            to={storePath(store)}
            className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-16 w-16 overflow-hidden rounded-pill bg-surface-sunk shadow-rest">
              <Img src={store.logo_url ?? store.cover_image_url} className="h-full w-full object-cover" />
            </span>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">
              {store.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
