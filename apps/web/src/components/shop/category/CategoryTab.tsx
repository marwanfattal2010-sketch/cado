import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { CategoryHero, type HeroSlide } from "./CategoryHero";
import { TallTiles, type ResolvedTile } from "./TallTiles";
import {
  GiftForRow,
  OccasionChips,
  ProductStrip,
  StoresRow,
  SubcategoryCircles,
  SuperDeals,
  TabGrid,
  TabSectionHead,
  primaryPhoto,
  type CircleItem,
  type StoreItem,
} from "./CategorySections";
import { themeFor, type CategoryTile } from "../../../lib/categoryTheme";
import { browseHref } from "../../../lib/browseParams";
import { RECIPIENTS, priceTierId, type TileId } from "../../../lib/facets";
import { recipientArt, tileArt } from "../../../lib/tabArt";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * ONE category tab.
 *
 * Section order, and nothing else on the page:
 *   1 hero · 2 gift for… · 3 entry tiles · 4 shop by category ·
 *   5 stores · 6 super deals · 7 new arrivals · 8 best sellers ·
 *   9 ready to gift · 10 occasions · 11 the grid
 *
 * A section with nothing real behind it renders NOTHING. The page gets
 * shorter, never padded.
 *
 * Everything is derived from this category's real products, so a tab is
 * correct the moment a product moves into it — there is no editor row to keep
 * in step and nothing to seed.
 *
 * EVERY FILTERED ENTRY POINT — a tile, a circle, an occasion chip, the deals
 * "See all" — sets the SAME filter object the sheet edits. That is what makes
 * them combine instead of replacing each other.
 */
export function CategoryTab({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug;
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryId = category?.id;
  const categoryName = category?.name ?? "";
  const theme = themeFor(slug);

  const sections = useTabSections(categoryId);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();

  const cat = slug ?? "";

  const subcategories = useMemo(
    () => (subcategoriesQuery.data ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    [subcategoriesQuery.data]
  );

  /**
   * ONE PHOTO ALLOCATOR FOR THE WHOLE PAGE.
   *
   * The hero, the five tall tiles and the shop-by-category circles all want
   * "a real product photo that matches this label", and left to themselves
   * they each pick the best-looking product in the category — which is the
   * same one. The page then shows the same necklace three times in its first
   * screen and reads as a placeholder mock-up.
   *
   * So the slots are filled IN ORDER from one shared pool, each taking the
   * first matching photo nobody above it has used. A slot that cannot find an
   * unused matching photo gets null and renders its neutral mark rather than
   * borrowing a picture of something else.
   */
  const art = useMemo(() => {
    const used = new Set<string>();

    /**
     * Unique first; a correct repeat before a blank.
     *
     * The rule is no photo twice on a page, and on most tabs that holds. It
     * cannot hold on the thin ones: Perfume has SEVEN products, every product
     * has exactly one image, and the page has nine decorative slots — one
     * hero, three circles, five tiles. Two of them are going to want a photo
     * that does not exist.
     *
     * Faced with that, showing the same correct photo in a small circle and
     * on a tile is a much smaller cost than two blank diamonds in a row of
     * five. So: take an unused photo if there is one; otherwise take a photo
     * that still MATCHES the label even though a slot above used it; only
     * return null — and get the neutral mark — when nothing matches at all.
     *
     * `row` keeps a repeat out of the row it would be most obvious in: a
     * photo is never used twice inside the tiles, or twice inside the
     * circles, only across two different sections.
     *
     * The real fix is more product photography, not more code.
     */
    const perRow = new Map<string, Set<string>>();
    const take = (pool: FeedProduct[], row = "page"): string | null => {
      const inRow = perRow.get(row) ?? new Set<string>();
      perRow.set(row, inRow);

      let fallback: string | null = null;
      for (const p of pool) {
        const photo = primaryPhoto(p);
        if (!photo || inRow.has(photo)) continue;
        if (!used.has(photo)) {
          used.add(photo);
          inRow.add(photo);
          return photo;
        }
        if (!fallback) fallback = photo;
      }
      if (fallback) inRow.add(fallback);
      return fallback;
    };

    const all = sections.all;
    /*
     * 1 — THREE HERO SLIDES, and they go first because they take the best
     * photographs. Slide 1 sells the category; slides 2 and 3 each carry a
     * real product and its real price.
     */
    const named = theme.heroProduct ? all.filter((p) => p.slug === theme.heroProduct) : [];
    const heroPool = named.length
      ? [...named, ...all.filter((p) => p.slug !== theme.heroProduct)]
      : [...all].sort((a, b) => Number(!!b.is_pick) - Number(!!a.is_pick));
    const heroSlides: HeroSlide[] = [];
    for (let i = 0; i < 3; i++) {
      const photo = take(heroPool, "hero");
      if (!photo) break;
      const product = heroPool.find((x) => primaryPhoto(x) === photo);
      heroSlides.push(
        i === 0
          ? { key: "lead", photo, headline: theme.heroTitle, subline: theme.heroSubtitle }
          : {
              key: product?.id ?? String(i),
              photo,
              headline: product?.title ?? theme.heroTitle,
              subline: product?.partner?.name ?? theme.heroSubtitle,
              productId: product?.id,
              price: product?.price,
            }
      );
    }

    /*
     * 2 — THE CIRCLES GO BEFORE THE TILES, and the order is the point.
     *
     * A "Rings" circle can only ever use a photo of a ring: its pool is
     * whatever is in that subcategory, often two or three items. A "For him"
     * tile can use any of a dozen. Filling the wide pools first starves the
     * narrow ones — Watches ended up with the neutral mark while a real watch
     * photo sat on a tile that had ten other options. Narrowest first.
     */
    const circles: CircleItem[] = [];
    for (const s of subcategories) {
      const pool = all.filter((p) => p.subcategory_id === s.id);
      // One product is enough for a circle: it is a shortcut into the grid,
      // not a claim about depth.
      if (pool.length === 0) continue;
      circles.push({ id: s.id, slug: s.slug, name: s.name, photo: take(pool, "circles") });
    }

    /*
     * 3 — THE ENTRY TILES, and the set is now the same on every tab:
     * New in · Best sellers · Under $X · Ready to gift · Deals.
     *
     * They used to be chosen per category, so no two tabs offered the same
     * shortcuts and none of them was predictable. "Under $X" is the one that
     * varies, and it is computed from that category's real price spread, so
     * it can never open an empty grid. "Best sellers" becomes "Store picks"
     * where there is no order history to justify the claim.
     */
    const tier = sections.tier;
    const entryTiles: CategoryTile[] = [
      { label: "New in", kind: { type: "new" } },
      { label: "Arrives today", kind: { type: "sameDay" } },
      ...(tier ? [{ label: tier.label, kind: { type: "price" as const, max: tier.max } }] : []),
      { label: "Gift wrapped", kind: { type: "giftWrap" } },
      { label: "Deals", kind: { type: "sale" } },
      // Last two on purpose: they are the ones with no data behind them on
      // most tabs, so when they drop the row still ends on a full tile rather
      // than a gap in the middle.
      ...(sections.bestSellersAreReal
        ? [{ label: "Best sellers", kind: { type: "picks" as const } }]
        : []),
      { label: "Ready to gift", kind: { type: "giftReady" } },
    ];
    const tiles: ResolvedTile[] = [];
    for (const t of entryTiles) {
      let pool: FeedProduct[] = [];
      let href = "";
      // The tile's own id, captured here rather than re-derived, so the
      // picture, the link and the saved view can never name different things.
      let tileId: TileId | null = null;
      // Switched on a local alias of the whole `kind`, not on `t.kind.type`.
      // TypeScript only narrows a discriminated union through a stable
      // reference; switching on the property path leaves each branch holding
      // the full union and `kind.max` stops existing.
      const kind = t.kind;
      switch (kind.type) {
        case "price":
          pool = all.filter((p) => p.price < kind.max);
          href = browseHref(cat, { price: [priceTierId(kind.max)] });
          break;
        case "new": {
          // The tile is a SAVED VIEW, so it must show what the view will show:
          // added in the last 30 days, not simply "the newest we have".
          const cutoff = Date.now() - 30 * 86400000;
          pool = all.filter((p) => new Date(p.created_at).getTime() >= cutoff);
          tileId = "new-in";
          break;
        }
        case "sameDay":
          pool = all.filter((p) => p.same_day === true);
          tileId = "arrives-today";
          break;
        case "giftWrap":
          pool = all.filter((p) => p.gift_wrap_available === true);
          tileId = "gift-wrapped";
          break;
        case "picks":
          pool = sections.bestSellers;
          tileId = sections.bestSellersAreReal ? "best-sellers" : "store-picks";
          break;
        case "giftReady":
          pool = sections.giftReady;
          tileId = "ready-to-gift";
          break;
        case "sale":
          pool = sections.deals;
          tileId = "deals";
          break;
        default:
          break;
      }
      if (tileId) href = browseHref(cat, { tile: tileId });
      // A tile with nothing behind it is dropped, not shown empty — and never
      // opens a results page with no results.
      if (pool.length === 0 || !href) continue;
      // CURATED ART, not a borrowed product photo. A tile names a view rather
      // than an object, so there is no product that "is" New in; the picture
      // has to be chosen. See lib/tabArt.ts.
      // The price tile is the one without a TileId — it is a price filter, not
      // a saved view — so it keeps a real photo of something inside the tier.
      tiles.push({
        label: t.label,
        photo: tileId ? tileArt(tileId) : take(pool, "tiles"),
        href,
      });
    }

    /*
     * The Gift for… row is curated too, and for the two reasons the brief
     * gives: "For Him" was picking a girls' t-shirt because that was the first
     * product tagged `him` in Fashion, and Perfume & Beauty had nothing tagged
     * `father` at all, so Dad rendered as an empty disc. A recipient is not a
     * thing in the catalogue, so nothing in the catalogue can stand for one.
     */
    const recipientPhoto = new Map<string, string | null>();
    for (const r of RECIPIENTS) recipientPhoto.set(r.value, recipientArt(r.value));

    return { heroSlides, tiles, circles, recipientPhoto };
  }, [sections.all, sections.bestSellers, sections.giftReady, sections.deals, subcategories, slug, theme]);

  /** The shops that actually stock this category, with their real artwork. */
  const stores = useMemo<StoreItem[]>(() => {
    const ids = new Set(sections.all.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo_url: s.logo_url,
        cover_image_url: s.cover_image_url,
      }));
  }, [directory.data, sections.all]);

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[260px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <Skeleton className="h-[172px] w-full rounded-[10px]" />
          <ProductGridSkeleton count={4} />
        </div>
      </>
    );
  }

  if (sections.all.length === 0) {
    return (
      <p className="px-[var(--page-x)] py-16 text-center text-[14px] text-muted">
        No {categoryName.toLowerCase()} on CADO yet.
      </p>
    );
  }

  return (
    <>
      {/* 1 — hero: three slides, full-bleed photography. */}
      <CategoryHero slides={art.heroSlides} shopAllHref={browseHref(cat)} />

      {/*
        ONE spacing token between every section, top to bottom. Nothing below
        sets its own vertical margin, so the rhythm cannot drift section by
        section, and every section carries the same page gutter.
      */}
      <div className="space-y-6 px-[var(--page-x)] pt-5">
        {/* 2 — Gift for… */}
        <GiftForRow
          sections={sections}
          theme={theme}
          cat={cat}
          photoFor={(v) => art.recipientPhoto.get(v) ?? null}
        />

        {/* 3 — entry tiles */}
        <TallTiles tiles={art.tiles} />

        {/* 4 — shop by category */}
        <SubcategoryCircles circles={art.circles} theme={theme} cat={cat} />

        {/* 5 — super deals */}
        <SuperDeals sections={sections} theme={theme} cat={cat} />

        {/* 7 — new arrivals */}
        <ProductStrip
          title="New arrivals"
          products={sections.newArrivals}
          theme={theme}
          seeAllHref={browseHref(cat, { tile: "new-in" })}
        />

        {/* 8 — best sellers, or store picks where there is no order history
            to justify the stronger claim. */}
        <ProductStrip
          title={sections.bestSellersAreReal ? "Best sellers" : "Store picks"}
          products={sections.bestSellers}
          theme={theme}
          seeAllHref={browseHref(cat, {
            tile: sections.bestSellersAreReal ? "best-sellers" : "store-picks",
          })}
        />

        {/* 9 — ready to gift */}
        <ProductStrip
          title="Ready to gift"
          products={sections.giftReady}
          theme={theme}
          seeAllHref={browseHref(cat, { tile: "ready-to-gift" })}
        />

        {/* 10 — occasion chips */}
        <OccasionChips sections={sections} theme={theme} cat={cat} />

        {/*
          11 — STORES, and they are the last section before the grid now.
          Mid-page they interrupted a run of product rows with a row of logos;
          at the bottom they read as "and here is who you would be buying
          from", which is the question a shopper has once they have seen the
          goods rather than before.
        */}
        <StoresRow categoryName={categoryName} stores={stores} theme={theme} />

        {/*
          11 — PURE BROWSE. No sort row, no filter button, no applied chips
          and no result count: all of that now lives on /browse, where a
          selection can be described, stacked and undone. What is left here
          is a plain look at the shelf, and one door to the filtered view.
        */}
        <div>
          <TabSectionHead title={`All ${categoryName.toLowerCase()}`} theme={theme} />
          <TabGrid products={sections.all} />
          <Link
            to={browseHref(cat)}
            className="mt-4 flex min-h-[46px] w-full items-center justify-center rounded-pill border border-ink/[0.12] bg-canvas text-body font-semibold text-ink transition-transform duration-press ease-out active:scale-[0.99]"
          >
            See all {categoryName.toLowerCase()} gifts
          </Link>
        </div>
      </div>
    </>
  );
}
