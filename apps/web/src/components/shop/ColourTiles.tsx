import { Link } from "react-router-dom";

/**
 * THE ONE COLOURFUL TILE SET, AND THERE IS ONLY EVER ONE PER PAGE.
 *
 * Everything else in the app is white or persimmon, and colour comes
 * from photography. This row is the single deliberate exception: a block of
 * flat, soft hues that gives a page one spot of playfulness without letting
 * colour leak into the furniture.
 *
 * The "only one per page" rule is the entire point. Two colourful rows and the
 * page is a pastel patchwork again — which is what the reset was for. On the
 * All tab this is Shop by occasion; on a category tab it is "Gift for…".
 * Nothing else may use these hues.
 *
 * NO PHOTOGRAPHS ON THESE TILES. A photo underneath the type turns seven flat
 * colours into seven murky ones, and the label stops being readable at the top
 * of the tile where it sits.
 */

/**
 * Seven fixed hues, always in this order, assigned by POSITION rather than by
 * what the tile says. Fixing the order is what makes two different pages using
 * this component look like the same component: the first tile is always the
 * blue one. Tying a hue to a meaning would mean inventing a colour language on
 * top of the one the app already has.
 */
const HUES = ["#C9D3FF", "#BFEAC7", "#FFC9D9", "#FFE7A3", "#FFB8B8", "#A9E9F0", "#D9C9FF"];

export type ColourTile = { key: string; label: string; href: string };

export function ColourTiles({
  title,
  tiles,
  columns = 3,
}: {
  title: string;
  tiles: ColourTile[];
  /** 2 or 3 across. Every tile is the same size either way. */
  columns?: 2 | 3;
}) {
  if (!tiles.length) return null;

  return (
    <section className="mt-5 px-[var(--page-x)]">
      <h2 className="pb-3 text-[20px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      <div className={`grid gap-2.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {tiles.map((t, i) => (
          <Link
            key={t.key}
            to={t.href}
            className="card-press relative flex aspect-[4/3] items-end overflow-hidden rounded-[20px] p-3"
            style={{ background: HUES[i % HUES.length] }}
          >
            {/*
              A single soft motif, identical on every tile, so the row reads as
              one set rather than seven unrelated swatches. Drawn rather than
              imported: at this size and opacity it is texture, and a file per
              tile would be seven requests for something nobody looks at.
            */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full"
              style={{ background: "rgba(255,255,255,0.38)" }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-6 h-20 w-20 rounded-full"
              style={{ background: "rgba(255,255,255,0.22)" }}
            />
            {/*
              Dark type, not white. White on a soft pastel fails contrast at
              every one of these seven hues — the brief's own rule that body
              text on a tinted ground must be dark. #111 on the lightest of
              them still clears AA comfortably.
            */}
            <span className="relative z-[1] text-[13px] font-bold uppercase leading-tight tracking-[0.02em] text-ink">
              {t.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
