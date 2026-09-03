import { Img } from "../../Img";
import { accent, type CategoryTheme } from "../../../lib/categoryTheme";

/**
 * The category hero — static, editorial, one photo (spec 1).
 *
 * NOT a carousel. The old one rotated three slides with price pills and dots,
 * which meant the first thing on every category page was a control rather
 * than a picture of what is for sale. A single still image with a serif line
 * over it is the old Jewelry page's look, and it is the one Marwan asked to
 * come back.
 *
 * THE GRADIENT IS DIRECTIONAL, and that is the whole trick. A flat scrim over
 * the whole photo is what made the old hero look grey and dead — it dimmed
 * the product to make the text readable. This one is strong only in the
 * bottom-left corner where the words are and fades to nothing by the
 * top-right, so the photo is still plainly a photo.
 */
export function CategoryHero({
  theme,
  photo,
  onShopNow,
}: {
  theme: CategoryTheme;
  photo: string | null;
  onShopNow: () => void;
}) {
  return (
    <section className="relative h-[260px] w-full overflow-hidden">
      {photo ? (
        /* `eager` — this is the one image above the fold on every category
           tab, and a lazily-loaded hero is a blank hero for the first paint.
           On Toys that meant arriving at a flat blue panel. */
        <Img src={photo} eager className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{ background: accent(theme) }} />
      )}

      {/*
        Two stops, both in the category accent. `to top right` puts the dense
        end under the type in the bottom-left; by 72% it is fully transparent,
        so the top-right corner of the photo is untouched.
      */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top right, ${accent(theme, 0.94)} 0%, ${accent(
            theme,
            0.72
          )} 28%, ${accent(theme, 0.2)} 55%, transparent 72%)`,
        }}
      />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h1 className="max-w-[15ch] font-display text-[27px] leading-[1.08] text-white">
          {theme.heroTitle}
        </h1>
        <p className="mt-2 max-w-[26ch] text-[13px] leading-snug text-white/85">
          {theme.heroSubtitle}
        </p>
        <button
          type="button"
          onClick={onShopNow}
          /* A white box, not a filled pill: on ten different accents a white
             outline is the one treatment that reads the same on all of them. */
          className="mt-4 inline-flex min-h-[40px] items-center border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-transform duration-press ease-out active:scale-[0.97]"
        >
          Shop now
        </button>
      </div>
    </section>
  );
}
