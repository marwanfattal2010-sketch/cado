import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Img } from "../../Img";
import { productImageUrl } from "../../../lib/images";
import { useTileImages } from "../../../hooks/useBrowseConfig";
import { accentColor, type BrowseTile } from "../../../lib/browse";

const ROWS = 3;
const COLUMNS_PER_PAGE = 5;
/** Columns visible at rest. The .6 is the peek — the sliver of the next
 *  column that tells anyone the grid scrolls sideways. */
const PEEK_COLUMNS = 4.6;

/**
 * The card of small squircle subcategory tiles.
 *
 * Layout: pages of 5 columns × 3 rows, each page snapping. Within a page the
 * grid fills **column-major** — down, then across — so a short list leaves a
 * ragged right edge rather than three half-empty rows.
 *
 * The peek matters: the page is sized to ~4.6 columns of the viewport so the
 * next column is visibly cut off, which is the only thing that tells anyone
 * the grid scrolls.
 *
 * The "under five tiles, one row not three" rule falls out of the row maths
 * rather than being a separate branch: rows is however many are needed at
 * five across. Nothing is ever padded to fill a row, and with no tiles at all
 * the block does not render.
 */
export function CategoryCircles({
  tiles,
  title,
  accentToken,
}: {
  tiles: BrowseTile[];
  title: string | null;
  accentToken: string;
}) {
  const navigate = useNavigate();
  const images = useTileImages();

  const perPage = ROWS * COLUMNS_PER_PAGE;
  /**
   * Everything fits on one page until a category has more than fifteen
   * subcategories, and none does. In that case the grid is a plain
   * full-width block that wraps five to a row — reserving five tracks and a
   * peek for nine tiles left two empty columns of white and made the card
   * look broken. Paging (and with it column-major fill, which is what keeps
   * rows full when you scroll) only switches on once there is a second page
   * to scroll to.
   */
  const paged = tiles.length > perPage;
  const rows = paged ? ROWS : Math.ceil(tiles.length / COLUMNS_PER_PAGE);
  const columns = paged ? COLUMNS_PER_PAGE : Math.min(tiles.length, COLUMNS_PER_PAGE);

  const pages = useMemo(() => {
    if (!paged) return [tiles];
    const out: BrowseTile[][] = [];
    for (let i = 0; i < tiles.length; i += perPage) out.push(tiles.slice(i, i + perPage));
    return out;
  }, [tiles, paged, perPage]);

  if (tiles.length === 0) return null;

  const open = (tile: BrowseTile) => {
    if (tile.link_type === "category") navigate(`/category/${tile.link_value}`);
    else if (tile.link_type === "url") navigate(tile.link_value);
  };

  /**
   * Three sources, in order of how specific they are: artwork uploaded for
   * this tile, then a photo of something genuinely inside it, then the
   * project's own category image.
   *
   * That last one is what fixes Electronics. It is a real category with zero
   * products, so there is no product photo to borrow and it was rendering as
   * a grey letter tile — but /public/categories already holds the same
   * photograph the category cards elsewhere in the app use, so it is a file
   * this project owns rather than a stock image pulled in to fill a hole.
   */
  const imageFor = (tile: BrowseTile) => {
    if (tile.image_url) return tile.image_url;
    const path =
      tile.link_type === "category"
        ? images.byCategory.get(tile.link_value)
        : images.bySubcategory.get(tile.link_value);
    if (path) return productImageUrl(path);
    return tile.link_type === "category" ? `/categories/${tile.link_value}.jpg` : null;
  };

  return (
    <section className="px-[var(--page-x)] pt-4">
      <div className="rounded-[12px] bg-surface p-3 shadow-rest">
        {title ? <h2 className="mb-2 px-0.5 text-[15px] font-bold tracking-[-0.01em]">{title}</h2> : null}
        <div className="scroll-row scroll-row-flush" style={{ ["--row-gap" as string]: "0px" }}>
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className={`grid shrink-0 gap-y-3 ${paged ? "grid-flow-col" : "grid-flow-row"}`}
              style={{
                // Inline, not a Tailwind arbitrary value: Tailwind treats the
                // last `/` in `w-[calc(100%/4.6*5)]` as an opacity modifier,
                // so the utility compiles to nothing and the tracks silently
                // fall back to content width.
                width: paged ? `calc(100% / ${PEEK_COLUMNS} * ${COLUMNS_PER_PAGE})` : "100%",
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {page.map((tile) => {
                const src = imageFor(tile);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => open(tile)}
                    className="flex flex-col items-center gap-1.5 px-0.5 text-center transition-transform duration-press ease-out active:scale-[0.94]"
                  >
                    <span
                      className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[24px]"
                      style={{ background: accentColor(accentToken, 0.1) }}
                    >
                      {src ? (
                        <Img src={src} className="h-full w-full object-cover" />
                      ) : (
                        // No product photo exists for this one yet. A letter is
                        // honest; a stock photo would not be.
                        <span
                          aria-hidden
                          className="font-display text-h2"
                          style={{ color: accentColor(accentToken) }}
                        >
                          {tile.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
