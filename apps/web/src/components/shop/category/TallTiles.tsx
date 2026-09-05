import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { accent, type CategoryTheme } from "../../../lib/categoryTheme";

export type ResolvedTile = {
  label: string;
  photo: string | null;
  /**
   * Where the tile goes — a saved view on the results page.
   *
   * A tab that filters its own grid in place passes `onSelect` instead, and
   * the tile renders as a button. Same tile, same size, same label bar: the
   * only difference is whether tapping it navigates or narrows the grid
   * further down the page you are already on.
   */
  href?: string;
  onSelect?: () => void;
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
export function TallTiles({ tiles, theme }: { tiles: ResolvedTile[]; theme?: CategoryTheme }) {
  if (tiles.length === 0) return null;

  return (
    <div
      /*
       * -mx-[var(--page-x)] — the bleed every other rail on the page already
       * has, and the reason the last tile looked cut off.
       *
       * The row sits inside a container that is already padded by the page
       * gutter, and `.scroll-row` adds that same gutter again. Doubled, the
       * scrollport is 64px narrower than the screen, so the third tile ran
       * under the right edge with no trailing space to scroll into. Pulling
       * the row back out by one gutter lets it scroll the full width, with the
       * leading and trailing space `.scroll-row` provides.
       */
      className="scroll-row -mx-[var(--page-x)]"
      style={{ ["--row-gap" as string]: "10px" }}
    >
      {tiles.map((t) => {
        // A button when the tile narrows the grid below, a link when it goes
        // somewhere. Identical geometry either way.
        const Shell = (t.onSelect ? "button" : Link) as React.ElementType;
        const shellProps = t.onSelect
          ? { type: "button" as const, onClick: t.onSelect }
          : { to: t.href as string };
        return (
        <Shell
          key={t.label}
          {...shellProps}
          className="relative block h-[172px] w-[124px] shrink-0 overflow-hidden rounded-[10px] bg-surface-sunk text-left transition-transform duration-press ease-out active:scale-[0.97]"
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
              style={{ background: "rgb(var(--surface-sunk))", color: "rgb(var(--persimmon) / 0.5)" }}
            >
              ◇
            </span>
          )}
          <span
            /* THE TAB'S ACCENT, and this row is one of only two places it
               appears — the other is the hero tint above. Near-black was
               safe and said nothing; the bar is what makes a row of five
               photographs read as belonging to THIS category.
               It is not persimmon and never becomes persimmon: persimmon
               means "press this" and is reserved for prices, discount
               badges, the quick-add and the nav. */
            className="absolute inset-x-0 bottom-0 flex h-[32px] items-center justify-center px-1.5 text-[12px] font-bold leading-none text-white"
            style={{ background: accent(theme) }}
          >
            {t.label}
          </span>
        </Shell>
        );
      })}
    </div>
  );
}
