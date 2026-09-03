import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { useSubcategories } from "../../hooks/useStores";
import { useCategorySlides } from "../../hooks/useCategorySlides";
import { useTileImages, type BrowseBlockWithContent } from "../../hooks/useBrowseConfig";
import { productImageUrl } from "../../lib/images";
import {
  accentColor,
  isFeedFiltered,
  parseFilterValue,
  type BrowseTab,
  type BrowseTile,
  type FeedFilter,
} from "../../lib/browse";
import { BannerCarousel } from "./blocks/BannerCarousel";
import { HeroBanners } from "./HeroBanners";
import { GiftAssistantSheet } from "../GiftAssistantSheet";
import { EntryCards } from "./blocks/EntryCards";
import { OccasionStrip } from "./blocks/OccasionStrip";
import { CategoryCircles } from "./blocks/CategoryCircles";
import { SubTabs } from "./blocks/SubTabs";
import { DealPair } from "./blocks/DealPair";
import { TopOfCategory } from "./blocks/TopOfCategory";
import { FeaturedStores } from "./FeaturedStores";
import { HomeLower } from "./HomeLower";
import { TabStoreCircles, TabStoreBanners } from "./blocks/TabStores";
import { ProductFeed } from "./blocks/ProductFeed";
import { GiftCardSection, OccasionRail } from "./HomeSections";
import { CategoryTab } from "./category/CategoryTab";

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
  /** Where SHOP NOW lands on a category tab — see the onCta note below. */
  const feedRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<FeedFilter>({});
  const [group, setGroup] = useState<string | null>(null);
  /** The sub-category circle currently narrowing the grid, by slug. */
  const [subcategory, setSubcategory] = useState<string | null>(null);
  /** The scripted gift assistant (spec 1.10), opened from under the hero. */
  const [aiOpen, setAiOpen] = useState(false);
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
  // Hand slide 1's photo down so slide 2 can pick a different product — see
  // the note on `avoidImage`.
  const slides = useCategorySlides(categoryId, categoryName, bannerPhoto);

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

  /*
   * PART 2 REPLACES THE BLOCK PIPELINE ON CATEGORY TABS.
   *
   * The pipeline below is still what the All tab renders, and the blocks rows
   * still drive it. A category tab no longer reads them: its eleven sections
   * are derived from that category's real products, so a tab is correct the
   * moment a product moves into it, with no editor row to keep in step.
   */
  if (!primary) {
    return (
      <section className="panel" aria-hidden={!active} data-tab={tab.slug}>
        <CategoryTab tab={tab} />
      </section>
    );
  }

  /*
   * ONE LAYOUT FOR ALL NINE CATEGORY TABS.
   *
   * The per-tab designed worlds are gone: every category tab now renders
   * this same block pipeline, in this same order, and differs only in its
   * content — photos, labels, subcategories, price tier, stores, products.
   * Put any two tabs side by side and the skeleton is identical:
   *
   *   1 hero carousel · 2 entry tiles · 3 shop by category ·
   *   4 store circles · 5 super deals · 6 new arrivals ·
   *   7 top of {category} · 8 more stores · then the full grid.
   *
   * The All tab shares the same pipeline and adds the three page-level
   * sections that belong to the landing page rather than to a category.
   */
  return (
    <section className="panel" aria-hidden={!active} data-tab={tab.slug}>
      {blocks.map((block) => {
        switch (block.type) {
          case "banner_carousel":
            /*
             * THE ALL TAB GETS THE NEW HERO (spec 1.9, Option F): three swipe
             * banners, user-driven, CSS illustrations. Category tabs keep the
             * photo carousel, which is what spec 2.2 builds on.
             */
            if (primary) {
              return (
                <div key={block.id} className="pt-1">
                  <HeroBanners onAskAi={() => setAiOpen(true)} />
                </div>
              );
            }
            return (
              <BannerCarousel
                key={block.id}
                banners={block.banners}
                accentToken={tab.accent_token}
                fallbackImage={bannerPhoto}
                extraSlides={slides}
                /*
                 * SHOP NOW means two different things, and which one depends
                 * entirely on whether we already know what they came for.
                 *
                 * On All we know nothing, so the three questions earn their
                 * place. On a category tab the answer to "what kind of gift?"
                 * is the tab they are standing on — asking it again is asking
                 * a shopper to re-state what they just told us. So it drops
                 * straight to the goods instead: this panel already holds the
                 * hero, this category's stores and the full grid, so there is
                 * nowhere to navigate to. Scrolling to the feed IS arriving.
                 *
                 * An explicit `url` on the banner row still wins either way —
                 * that is an editor overriding on purpose. The seeded rows
                 * carry link_type 'filter' with an empty object, which is a
                 * no-op, so everything else falls through to the rules above
                 * rather than to a button that does nothing.
                 */
                onCta={(banner) => {
                  if (banner.link_type === "url" && banner.link_value) {
                    navigate(banner.link_value);
                    return;
                  }
                  if (primary) {
                    navigate("/find");
                    return;
                  }
                  feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            );

          case "entry_cards":
            return (
              <div key={block.id}>
                {/* "Flowers for…" — directly under the hero on every category
                    tab. The occasion is the question a gift shopper actually
                    arrives with; the tiles below are the department. */}
                {!primary ? (
                  <OccasionStrip
                    categoryId={categoryId}
                    categorySlug={tab.filter.category_slug}
                    categoryName={categoryName}
                  />
                ) : null}
                <EntryCards
                  tiles={block.tiles}
                  accentToken={tab.accent_token}
                  categoryId={categoryId}
                  onTile={applyTile}
                />
              </div>
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
                {/*
                 * OCCASION FIRST, on the landing page.
                 *
                 * Nobody opens CADO thinking "jewelry". They open it thinking
                 * "it's my mother's birthday on Thursday" — so the page asks
                 * the question they already have an answer to before it asks
                 * which department they want. Categories still follow, for
                 * the person who does know.
                 */}
                {primary ? (
                  <>
                    <OccasionRail />
                    {/* Was a small underlined link tucked beside the search
                        field, where someone who is stuck is least likely to
                        look. It is the second thing on the page now. */}
                    <div className="mx-auto max-w-6xl px-4 pt-4">
                      <Link
                        to="/find"
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card bg-ink px-4 text-body font-semibold text-inverse transition-transform duration-press ease-out active:scale-[0.99]"
                      >
                        Let AI help me choose
                      </Link>
                    </div>
                  </>
                ) : null}
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
                    <GiftCardSection />
                  </>
                ) : (
                  /* Position 4: the shops for THIS category, as round logos,
                     directly under the categories — the place both SHEIN and
                     Trendyol put brands, and the place they stopped being an
                     interruption of the product grid. */
                  <TabStoreCircles categoryId={categoryId} />
                )}
                {/* 4 — the sort + filter bar goes here, directly under the
                    circles and above the grid. Left as a slot on purpose:
                    it is its own piece of work. */}
              </div>
            );
          }

          case "deal_pair":
            return (
              <div key={block.id}>
                <DealPair
                  categoryId={categoryId}
                  accentToken={tab.accent_token}
                  onSelect={(next) => setFilter(next)}
                />
                {/* Sits with the deals rather than being its own database
                    block: the brief's order is Super Deals, then Top of, then
                    New Arrivals, and DealPair already owns the first and
                    third. Rendering it here keeps that sequence in one place
                    instead of depending on two block rows staying adjacent.
                    Not on All — "Top of CADO" is the whole shop, which the
                    grid below already is. */}
                {!primary ? (
                  <TopOfCategory
                    categoryId={categoryId}
                    categoryName={categoryName}
                    accentToken={tab.accent_token}
                  />
                ) : null}
              </div>
            );

          case "stores":
            /* Position 8 on a category tab: the bigger store cards, after
               Top of {category} and BEFORE the grid begins — browsing, not
               interrupting. The All landing page keeps its own pair. */
            if (!primary)
              return <TabStoreBanners key={block.id} categoryId={categoryId} accent={accentColor(tab.accent_token, 1)} />;
            return (
              /* Spec 1.6: ONE store section, circles only. The big rectangles
                 are gone, and with them the separate round row that used to
                 sit underneath — FeaturedStores now IS that row, two-deep and
                 covering every live shop, so keeping StoreCirclesRow here
                 would print the same stores twice in a row. */
              <div key={block.id}>
                <FeaturedStores />
              </div>
            );

          case "product_feed":
            /*
             * The All tab's default view is the endless sequence of titled
             * sections — no unlabeled grid. But when an entry tile has
             * APPLIED a filter, the person asked for a specific slice of the
             * catalogue, and the honest answer to that is the plain filtered
             * feed with its removable chip, exactly as before. The sections
             * come back the moment the filter is cleared.
             */
            if (primary && !isFeedFiltered(filter)) {
              return (
                <div key={block.id} ref={feedRef}>
                  <HomeLower />
                </div>
              );
            }
            return (
              <div key={block.id} ref={feedRef}>
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
                  /* No store strip inside the grid any more: stores are the
                     circles under Shop by category and the cards above this
                     grid. Nothing interrupts the products. */
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

      {/* Scripted, and labelled as such. Only mounted on the All tab, which is
          where the "Let AI help me choose" link lives. */}
      {primary ? <GiftAssistantSheet open={aiOpen} onClose={() => setAiOpen(false)} /> : null}
    </section>
  );
}
