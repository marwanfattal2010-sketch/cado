import { Img } from "../../Img";
import { accent, type CategoryTheme } from "../../../lib/categoryTheme";
import type { TabFilter } from "../../../lib/tabFilter";

export type ResolvedTile = {
  label: string;
  photo: string | null;
  apply: TabFilter;
};

/**
 * The tall tile row (spec 2) — the old Jewelry page's shape: a portrait
 * photo with a solid label bar across the bottom in the category accent.
 *
 * This ONE row replaces three separate things that were all doing the same
 * job a few pixels apart: the "Gift for…" avatar row, the small quick-tile
 * strip, and the "New arrivals" card. Between them they offered the same
 * shopper the same five or six entry points three times in the first screen
 * and a half, which is most of why the tabs felt cramped.
 *
 * A tile is only rendered when a real product matches its label, so the photo
 * is always of the thing the tile says. Nothing here falls back to stock
 * imagery or a neutral swatch with a hopeful caption.
 */
export function TallTiles({
  tiles,
  theme,
  onSelect,
}: {
  tiles: ResolvedTile[];
  theme: CategoryTheme;
  onSelect: (filter: TabFilter) => void;
}) {
  if (tiles.length === 0) return null;

  return (
    <div
      className="scroll-row"
      style={{ ["--row-gap" as string]: "10px" }}
    >
      {tiles.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSelect(t.apply)}
          className="relative block h-[172px] w-[124px] shrink-0 overflow-hidden rounded-[10px] bg-surface-sunk transition-transform duration-press ease-out active:scale-[0.97]"
        >
          {t.photo ? (
            <Img src={t.photo} className="absolute inset-x-0 top-0 h-[140px] w-full object-cover" />
          ) : (
            /*
             * A NEUTRAL MARK, not a blank panel and never a borrowed photo.
             *
             * This happens when every product matching the label has already
             * given its photo to a slot above — on a seven-product category
             * that is real. A flat tint reads as a broken image; a mark reads
             * as a deliberate one. Showing a picture of something else here
             * would be worse than either.
             */
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 flex h-[140px] items-center justify-center text-[26px]"
              style={{ background: accent(theme, 0.12), color: accent(theme, 0.55) }}
            >
              ◇
            </span>
          )}
          <span
            className="absolute inset-x-0 bottom-0 flex h-[32px] items-center justify-center px-1.5 text-[12px] font-bold leading-none text-white"
            style={{ background: accent(theme) }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
