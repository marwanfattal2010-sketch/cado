import { Link } from "react-router-dom";
import { accentColor, type BrowseTile } from "../../../lib/browse";

const MIN_ITEMS = 3;

/**
 * The row of tall rectangular shortcuts under the banner.
 *
 * These carry no photograph on purpose. Every other tile on the page borrows
 * a real product photo, but there is no honest photo for "Under $25" or
 * "Same-day" — whichever product got picked would read as an advertisement
 * for that one item. So the card is a tint of the tab's accent with the solid
 * label bar the design calls for, and nothing pretends to be a picture.
 *
 * `minItems: 3` — fewer real tiles than that and the whole row is hidden
 * rather than padded out.
 */
export function EntryCards({
  tiles,
  accentToken,
  onTile,
}: {
  tiles: BrowseTile[];
  accentToken: string;
  onTile: (tile: BrowseTile) => void;
}) {
  if (tiles.length < MIN_ITEMS) return null;

  return (
    <div className="scroll-row pt-4" style={{ ["--row-gap" as string]: "8px" }}>
      {tiles.map((tile) => {
        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: accentColor(accentToken, 0.12) }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[146px]"
              style={{
                background: `linear-gradient(160deg, ${accentColor(accentToken, 0.22)}, ${accentColor(
                  accentToken,
                  0.04
                )})`,
              }}
            />
            <span
              className="absolute inset-x-0 bottom-0 flex h-[30px] items-center justify-center px-1.5 text-[13px] font-bold leading-none text-inverse"
              style={{ background: accentColor(accentToken) }}
            >
              {tile.label}
            </span>
          </>
        );

        const shell =
          "relative block h-[176px] w-[116px] shrink-0 overflow-hidden rounded-[8px] transition-transform duration-press ease-out active:scale-[0.97]";

        return tile.link_type === "url" ? (
          <Link key={tile.id} to={tile.link_value} className={shell}>
            {inner}
          </Link>
        ) : (
          <button key={tile.id} type="button" onClick={() => onTile(tile)} className={shell}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
