import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Img } from "../../Img";
import { productImageUrl } from "../../../lib/images";
import { useTileImages } from "../../../hooks/useBrowseConfig";
import { accentColor, type BrowseTile } from "../../../lib/browse";

const ROWS = 3;
const COLUMNS_PER_PAGE = 5;
const MIN_ITEMS = 5;

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
 * `minItems: 5`. Under five real tiles it degrades to one row and does not
 * pad; under one it does not render at all.
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

  const rows = tiles.length < MIN_ITEMS ? 1 : ROWS;

  /** Column-major within a page: index 0,1,2 fill column one top to bottom. */
  const pages = useMemo(() => {
    const perPage = rows * COLUMNS_PER_PAGE;
    const out: BrowseTile[][] = [];
    for (let i = 0; i < tiles.length; i += perPage) out.push(tiles.slice(i, i + perPage));
    return out;
  }, [tiles, rows]);

  if (tiles.length === 0) return null;

  const open = (tile: BrowseTile) => {
    if (tile.link_type === "category") navigate(`/category/${tile.link_value}`);
    else if (tile.link_type === "url") navigate(tile.link_value);
  };

  const imageFor = (tile: BrowseTile) => {
    if (tile.image_url) return tile.image_url;
    const path =
      tile.link_type === "category"
        ? images.byCategory.get(tile.link_value)
        : images.bySubcategory.get(tile.link_value);
    return path ? productImageUrl(path) : null;
  };

  return (
    <section className="px-[var(--page-x)] pt-4">
      <div className="rounded-[12px] bg-surface p-3 shadow-rest">
        {title ? <h2 className="mb-2 px-0.5 text-[15px] font-bold tracking-[-0.01em]">{title}</h2> : null}
        <div className="scroll-row scroll-row-flush" style={{ ["--row-gap" as string]: "0px" }}>
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className="grid w-[calc(100%/4.6*5)] shrink-0 grid-flow-col gap-y-3"
              style={{
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gridTemplateColumns: `repeat(${COLUMNS_PER_PAGE}, minmax(0, 1fr))`,
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
