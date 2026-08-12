import { useMemo, useState } from "react";
import { useCategories } from "../../hooks/useCategories";
import type { BrowseBlockWithContent } from "../../hooks/useBrowseConfig";
import {
  isFeedFiltered,
  parseFilterValue,
  type BrowseTab,
  type BrowseTile,
  type FeedFilter,
} from "../../lib/browse";
import { BannerCarousel } from "./blocks/BannerCarousel";
import { EntryCards } from "./blocks/EntryCards";
import { CategoryCircles } from "./blocks/CategoryCircles";
import { SubTabs } from "./blocks/SubTabs";
import { DealPair } from "./blocks/DealPair";
import { StoreStrip } from "./blocks/StoreStrip";
import { ProductFeed } from "./blocks/ProductFeed";

/**
 * One tab's page: its own scroll container, its own filter state.
 *
 * `active` controls whether the *contents* mount. The panel element itself
 * always exists — the pager's width depends on it — but a panel two tabs away
 * renders an empty spacer, so opening /shop is six section headers' worth of
 * queries and not thirty-six.
 *
 * Filter state is per panel and deliberately not in the URL: tapping "Under
 * $25" on Chocolate should not follow you to Perfumes, and swiping back to
 * Chocolate should find it exactly as you left it.
 */
export function TabPanel({
  tab,
  blocks,
  active,
  mounted,
}: {
  tab: BrowseTab;
  blocks: BrowseBlockWithContent[];
  active: boolean;
  mounted: boolean;
}) {
  const categories = useCategories();
  const [filter, setFilter] = useState<FeedFilter>({});
  const [group, setGroup] = useState<string | null>(null);

  const categoryId = useMemo(() => {
    const slug = tab.filter.category_slug;
    if (!slug) return undefined;
    return categories.data?.find((c) => c.slug === slug)?.id;
  }, [categories.data, tab.filter.category_slug]);

  const subTabsBlock = blocks.find((b) => b.type === "sub_tabs");
  const groups = useMemo(() => {
    const found = new Set<string>();
    for (const block of blocks) {
      for (const tile of block.tiles) if (tile.group_key) found.add(tile.group_key);
    }
    return [...found];
  }, [blocks]);
  const activeGroup = group ?? groups[0] ?? "";

  const applyTile = (tile: BrowseTile) => {
    if (tile.link_type !== "filter") return;
    const parsed = parseFilterValue(tile.link_value);
    setFilter({ ...parsed, label: tile.label });
  };

  if (!mounted) return <div className="panel" aria-hidden style={{ minHeight: "100%" }} />;

  return (
    <section className="panel" aria-hidden={!active} data-tab={tab.slug}>
      {blocks.map((block) => {
        switch (block.type) {
          case "banner_carousel":
            return (
              <BannerCarousel
                key={block.id}
                banners={block.banners}
                accentToken={tab.accent_token}
                onCta={() => setFilter({})}
              />
            );

          case "entry_cards":
            return (
              <EntryCards
                key={block.id}
                tiles={block.tiles}
                accentToken={tab.accent_token}
                onTile={applyTile}
              />
            );

          case "sub_tabs":
            return (
              <div key={block.id} className="px-[var(--page-x)]">
                <SubTabs
                  groups={groups}
                  active={activeGroup}
                  accentToken={tab.accent_token}
                  onSelect={setGroup}
                />
              </div>
            );

          case "category_circles": {
            // When a sub_tabs block is present the circles belong to the
            // selected group; the crossfade is keyed on the group so React
            // remounts the grid rather than diffing tiles into each other.
            const tiles = subTabsBlock
              ? block.tiles.filter((t) => !t.group_key || t.group_key === activeGroup)
              : block.tiles;
            return (
              <div key={block.id + activeGroup} className="animate-fade-in">
                <CategoryCircles tiles={tiles} title={block.title} accentToken={tab.accent_token} />
              </div>
            );
          }

          case "deal_pair":
            return (
              <DealPair
                key={block.id}
                categoryId={categoryId}
                accentToken={tab.accent_token}
                onSelect={(next) => setFilter(next)}
              />
            );

          case "stores":
            return (
              <StoreStrip
                key={block.id}
                categoryId={categoryId}
                title={block.title}
                activePartnerId={filter.partner_id}
                onSelect={(store) =>
                  setFilter(
                    store ? { partner_id: store.id, partner_name: store.name, label: store.name } : {}
                  )
                }
              />
            );

          case "product_feed":
            return (
              <div key={block.id}>
                {isFeedFiltered(filter) ? (
                  <div className="flex items-center gap-2 px-[var(--page-x)] pt-5">
                    <span className="text-[13px] text-muted">Showing</span>
                    <button
                      type="button"
                      onClick={() => setFilter({})}
                      className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink px-3 text-[13px] font-medium text-inverse"
                    >
                      {filter.label ?? "Filtered"}
                      <span aria-hidden>×</span>
                    </button>
                  </div>
                ) : null}
                <ProductFeed
                  categoryId={categoryId}
                  filter={filter}
                  // The tab's own category has to be resolved before the feed
                  // can be honest about what it is showing; without this an
                  // unresolved slug would briefly render the whole catalogue
                  // under a category heading.
                  enabled={!tab.filter.category_slug || !!categoryId}
                  onStore={(id, name) => setFilter({ partner_id: id, partner_name: name, label: name })}
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </section>
  );
}
