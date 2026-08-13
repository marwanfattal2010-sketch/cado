import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { useSubcategories } from "../../hooks/useStores";
import { useCategorySlides } from "../../hooks/useCategorySlides";
import { useTileImages, type BrowseBlockWithContent } from "../../hooks/useBrowseConfig";
import { productImageUrl } from "../../lib/images";
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
import { GiftCardSection, OccasionRail, StoreCirclesRow } from "./HomeSections";

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
  primary = false,
  hrefForCategory,
}: {
  tab: BrowseTab;
  blocks: BrowseBlockWithContent[];
  active: boolean;
  mounted: boolean;
  /** Turns a category slug into the tab that shows it. */
  hrefForCategory?: (slug: string) => string;
  /** The All tab — the landing page. Carries the three sections that came
   *  over from the old Home and belong to the page, not to a category. */
  primary?: boolean;
}) {
  const navigate = useNavigate();
  const categories = useCategories();
  const images = useTileImages();
  const [filter, setFilter] = useState<FeedFilter>({});
  const [group, setGroup] = useState<string | null>(null);
  /** The sub-category circle currently narrowing the grid, by slug. */
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const subcategories = useSubcategories(tab.filter.category_slug);
  const subcategoryId = subcategories.data?.find((s) => s.slug === subcategory)?.id;

  const categoryId = useMemo(() => {
    const slug = tab.filter.category_slug;
    if (!slug) return undefined;
    return categories.data?.find((c) => c.slug === slug)?.id;
  }, [categories.data, tab.filter.category_slug]);

  /**
   * The banner has no uploaded artwork yet, so it borrows a photo of
   * something genuinely on sale in this tab. On All, that is whichever
   * category answers first — every option is a real CADO product either way,
   * which is the whole point of not reaching for a stock image.
   */
  const bannerPhoto = useMemo(() => {
    const slug = tab.filter.category_slug;
    const path = slug ? images.byCategory.get(slug) : images.byCategory.values().next().value;
    return path ? productImageUrl(path) : null;
  }, [images, tab.filter.category_slug]);

  const categoryName = categories.data?.find((c) => c.slug === tab.filter.category_slug)?.name;
  const slides = useCategorySlides(categoryId, categoryName);

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
                fallbackImage={bannerPhoto}
                extraSlides={slides}
                // SHOP NOW opens the gift finder. The seeded banner rows
                // carry link_type 'filter' with an empty object, which is a
                // no-op — so an explicit `url` link wins if one is ever set,
                // and everything else falls through to the quiz rather than
                // to a button that does nothing.
                onCta={(banner) =>
                  navigate(banner.link_type === "url" && banner.link_value ? banner.link_value : "/find")
                }
              />
            );

          case "entry_cards":
            return (
              <EntryCards
                key={block.id}
                tiles={block.tiles}
                accentToken={tab.accent_token}
                categoryId={categoryId}
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
            // Shop by occasion and the gift-card banner sit directly under
            // the circles, and only here. They are a page-level pitch — nine
            // copies of them, one per category tab, is the same argument made
            // nine times.
            // When a sub_tabs block is present the circles belong to the
            // selected group; the crossfade is keyed on the group so React
            // remounts the grid rather than diffing tiles into each other.
            const tiles = subTabsBlock
              ? block.tiles.filter((t) => !t.group_key || t.group_key === activeGroup)
              : block.tiles;
            return (
              <div key={block.id + activeGroup}>
                <div className="animate-fade-in">
                  <CategoryCircles
                    tiles={tiles}
                    title={block.title}
                    accentToken={tab.accent_token}
                    activeValue={subcategory}
                    onSelect={setSubcategory}
                    hrefForCategory={hrefForCategory}
                  />
                </div>
                {primary ? (
                  <>
                    <OccasionRail />
                    <GiftCardSection />
                  </>
                ) : null}
                {/* 4 — the sort + filter bar goes here, directly under the
                    circles and above the grid. Left as a slot on purpose:
                    it is its own piece of work. */}
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
            // On a category page the strip is rendered INSIDE the feed, after
            // the first eight products — see the product_feed case. Here it
            // would sit above the grid, which is the ordering the brief
            // explicitly rules out: products before stores, never the
            // reverse. The All landing page keeps it in place.
            if (!primary) return null;
            return (
              <div key={block.id}>
                <StoreStrip categoryId={categoryId} title={block.title} />
                {/* The round row goes directly under the big cards, as the
                    second half of one "here are the shops" block. */}
                <StoreCirclesRow />
              </div>
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
                  subcategoryId={subcategoryId}
                  filter={filter}
                  // One store strip per category page, and it comes after the
                  // products rather than before them.
                  renderAfter={
                    primary ? undefined : (
                      <div className="pt-4">
                        <StoreStrip categoryId={categoryId} title="Stores" />
                      </div>
                    )
                  }
                  // The tab's own category has to be resolved before the feed
                  // can be honest about what it is showing; without this an
                  // unresolved slug would briefly render the whole catalogue
                  // under a category heading.
                  enabled={!tab.filter.category_slug || !!categoryId}
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
