import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "../ui";
import { Img } from "../Img";
import { productImageUrl } from "../../lib/images";
import { useBrowseConfig, useTileImages, type BrowseBlockWithContent } from "../../hooks/useBrowseConfig";
import { accentColor, type BrowseTab, type BrowseTile } from "../../lib/browse";

/**
 * The hamburger's full-height sheet: every tab down the left, the selected
 * tab's categories as a grid on the right.
 *
 * It reads the same `category_circles` tiles the panels do, so it can never
 * drift from what the tabs actually show — there is no second list to keep
 * updated. A tab whose circles block is empty (Shoes has no subcategories)
 * offers to open the tab itself rather than showing an empty pane.
 */
export function AllCategoriesSheet({
  open,
  onClose,
  tabs,
  blocksFor,
  activeIndex,
  onSelectTab,
}: {
  open: boolean;
  onClose: () => void;
  tabs: BrowseTab[];
  blocksFor: Map<string, BrowseBlockWithContent[]>;
  activeIndex: number;
  onSelectTab: (index: number) => void;
}) {
  const navigate = useNavigate();
  const images = useTileImages();
  const { hrefForCategory } = useBrowseConfig();
  const [selected, setSelected] = useState(activeIndex);

  // Open on whatever tab you were looking at, not on whatever you last
  // poked at inside the sheet.
  useEffect(() => {
    if (open) setSelected(activeIndex);
  }, [open, activeIndex]);

  const tab = tabs[selected];
  const tiles: BrowseTile[] =
    (tab && blocksFor.get(tab.id)?.find((b) => b.type === "category_circles")?.tiles) ?? [];

  const openTile = (tile: BrowseTile) => {
    onClose();
    if (tile.link_type === "category") navigate(hrefForCategory(tile.link_value));
    else if (tile.link_type === "url") navigate(tile.link_value);
    else onSelectTab(selected);
  };

  return (
    <Sheet open={open} onClose={onClose} title="All categories" fullHeight>
      <div className="flex h-full min-h-0">
        <div className="w-[72px] shrink-0 overflow-y-auto border-r border-line">
          {tabs.map((t, i) => {
            const active = i === selected;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(i)}
                className={`relative block w-full px-2 py-3 text-left text-[12px] leading-tight ${
                  active ? "bg-surface font-bold text-ink" : "font-medium text-muted"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-[3px] rounded-r"
                    style={{ background: accentColor(t.accent_token) }}
                  />
                ) : null}
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-3 py-3">
          {tiles.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                onSelectTab(selected);
                onClose();
              }}
              className="w-full rounded-card bg-surface px-4 py-6 text-center text-body text-muted shadow-rest"
            >
              Open {tab?.label}
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((tile) => {
                const path =
                  tile.link_type === "category"
                    ? images.byCategory.get(tile.link_value)
                    : images.bySubcategory.get(tile.link_value);
                const src = tile.image_url ?? (path ? productImageUrl(path) : null);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => openTile(tile)}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px]"
                      style={{ background: accentColor(tab?.accent_token, 0.1) }}
                    >
                      {src ? (
                        <Img src={src} className="h-full w-full object-cover" />
                      ) : (
                        <span
                          aria-hidden
                          className="font-display text-h2"
                          style={{ color: accentColor(tab?.accent_token) }}
                        >
                          {tile.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight">{tile.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
