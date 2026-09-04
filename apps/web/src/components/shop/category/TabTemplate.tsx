import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { useHomeSignals } from "../../../hooks/useHomeEndless";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { Img } from "../../Img";
import { StaggeredGrid, type CollectionCard } from "../StaggeredGrid";
import { storePath } from "../../../lib/routes";
import { formatMoney } from "../../../lib/money";
import { productImageUrl } from "../../../lib/images";
import { circleArt, heroArt, tileArt } from "../../../lib/tabArt";
import { UNDER_TILE_MAX, type TileId } from "../../../lib/facets";
import { browseHref, type Lookup } from "../../../lib/browseParams";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * THE FASHION TAB.
 *
 * NO FILTERS LIVE ON THIS PAGE. Not a sort row, not a chip, not a Filter
 * button. Everything here is a door: a hero button, a store, a circle, a tile,
 * a "See all", a collection card — and every one of them opens the results
 * page, which is the only place a filter exists. The tab's job is to show what
 * is in the shop; narrowing it is a different screen.
 *
 * WHITE, AND NO LINES. The background is white, sections are separated by
 * space alone, and the only rules on the page are the edges of the grid's own
 * cards against its light gutter. Every `border-bottom` that used to divide a
 * section is gone.
 */
export function TabTemplate({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug ?? "";
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryName = category?.name ?? "";

  const sections = useTabSections(category?.id);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();
  const signals = useHomeSignals();

  const all = sections.all;

  const stores = useMemo(() => {
    const ids = new Set(all.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id) && s.slug)
      .map((s) => ({
        id: s.id,
        slug: s.slug as string,
        name: s.name.replace(/\[.*?\]\s*/g, ""),
        logo: s.logo_url,
        cover: s.cover_image_url,
      }))
      /*
       * Recognition first. A shopper scanning eight circles is looking for a
       * name they know, and finding one is what makes the row worth having;
       * the independents are the reason they stay. Ranked by name rather than
       * by product count, because count measures our seeding, not fame.
       */
      .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  }, [directory.data, all]);

  const lookup = useMemo<Lookup>(
    () => ({
      typeId: (s) => (subcategoriesQuery.data ?? []).find((x) => x.slug === s)?.id,
      storeId: (s) => (directory.data ?? []).find((x) => x.slug === s)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((s) => s.recentOrders > 0),
    }),
    [subcategoriesQuery.data, directory.data, signals.data]
  );

  /** "Shop for" — only values that actually have products. */
  const circles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) if (p.subcategory_id) counts.set(p.subcategory_id, (counts.get(p.subcategory_id) ?? 0) + 1);
    return (subcategoriesQuery.data ?? [])
      .filter((s) => (counts.get(s.id) ?? 0) > 0)
      .map((s) => ({ slug: s.slug, name: s.name, photo: circleArt(slug, s.slug) }));
  }, [subcategoriesQuery.data, all, slug]);

  const deals = useMemo(
    () =>
      all
        .filter((p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price))
        .sort((a, b) => off(b) - off(a)),
    [all]
  );

  const newArrivals = useMemo(
    () => [...all].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [all]
  );
  const bestPicks = useMemo(
    () => [...all].sort((a, b) => lookup.orders(b.id) - lookup.orders(a.id)),
    [all, lookup]
  );

  const collections = useMemo<CollectionCard[]>(() => {
    const under50 = all.filter((p) => Number(p.price) < 50).slice(0, 2);
    const top = bestPicks.slice(0, 2);
    const out: CollectionCard[] = [];
    if (under50.length === 2) {
      out.push({
        key: "under-50",
        title: "Under $50",
        href: browseHref(slug, { price: ["under-50"] }),
        items: under50.map((p) => ({
          photo: photoOf(p),
          price: Number(p.price),
          note: off(p) ? `-${off(p)}%` : "",
        })),
      });
    }
    if (top.length === 2) {
      out.push({
        key: "top-ranking",
        title: "Top ranking",
        href: browseHref(slug, { tile: "most-gifted" }),
        // "#1" and "#2" are positions in THIS list, which is a real ordering of
        // real order counts — not a rank invented for the card.
        items: top.map((p, i) => ({ photo: photoOf(p), price: Number(p.price), note: `#${i + 1}` })),
      });
    }
    return out;
  }, [all, bestPicks, slug]);

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[200px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <ProductGridSkeleton count={4} />
        </div>
      </>
    );
  }
  if (all.length === 0) {
    return (
      <p className="px-[var(--page-x)] py-16 text-center text-[14px] text-muted">
        No {categoryName.toLowerCase()} on CADO yet.
      </p>
    );
  }

  const maxOff = deals.length ? off(deals[0]) : 0;
  const underCount = all.filter((p) => Number(p.price) < UNDER_TILE_MAX).length;
  const newCount = all.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000
  ).length;

  const tiles: { id: TileId; label: string; show: boolean }[] = [
    { id: "new-in", label: "New in", show: newCount > 0 },
    { id: "most-gifted", label: "Most gifted", show: all.length > 0 },
    { id: "under-75", label: `Under $${UNDER_TILE_MAX}`, show: underCount > 0 },
    { id: "deals", label: "Deals", show: deals.length > 0 && maxOff > 0 },
  ];

  return (
    <div className="bg-white">
      <Hero cat={slug} />

      {/* 2 — stores: eight logo circles, four across, nothing behind a swipe. */}
      <section className="px-[var(--page-x)] pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-bold tracking-[-0.2px] text-ink">
            Stores in {categoryName}
          </h2>
          <Link to={`/stores/${slug}`} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
            See all {stores.length}
          </Link>
        </div>
        <p className="mb-3 mt-1 text-[12px] text-muted">
          Shop Lebanon&rsquo;s boutiques and brands in one order
        </p>
        <div className="grid grid-cols-4 gap-x-2.5 gap-y-3.5">
          {stores.slice(0, 8).map((s) => (
            <Link key={s.id} to={storePath({ slug: s.slug })} className="min-w-0 text-center">
              {/* The LOGO, not a shop photo: a rack of clothes does not say
                  which shop it is; a wordmark does. Falls back to the cover
                  only where no logo exists, and those stores are reported. */}
              <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-pill border border-[#ECECEC] bg-white">
                {s.logo || s.cover ? (
                  <Img
                    src={s.logo ?? s.cover}
                    className={s.logo ? "h-full w-full object-contain p-2" : "h-full w-full object-cover"}
                  />
                ) : null}
              </span>
              <span className="mt-1.5 line-clamp-2 block break-words text-[10.5px] leading-tight text-[#4a4a4a]">
                {s.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3 — Shop for */}
      {circles.length ? (
        <section className="pt-5">
          <h2 className="px-[var(--page-x)] pb-3 text-[16px] font-bold tracking-[-0.2px] text-ink">
            Shop for
          </h2>
          <div className="scroll-row" style={{ ["--row-gap" as string]: "16px" }}>
            {circles.map((c) => (
              <Link
                key={c.slug}
                to={browseHref(slug, { type: [c.slug] })}
                className="w-[66px] shrink-0 text-center transition-transform duration-press ease-out active:scale-[0.96]"
              >
                <span className="block h-[66px] w-[66px] overflow-hidden rounded-pill bg-[#EEEAE4]">
                  {c.photo ? <Img src={c.photo} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="mt-1.5 block text-[12px] font-semibold text-ink">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4 — tall portrait tiles */}
      <section className="pt-5">
        <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
          {tiles
            .filter((t) => t.show)
            .map((t) => (
              <Link
                key={t.id}
                to={browseHref(slug, { tile: t.id })}
                className="relative flex h-[196px] w-[148px] shrink-0 items-end overflow-hidden rounded-[12px] bg-[#EEEAE4] transition-transform duration-press ease-out active:scale-[0.97]"
              >
                <Img
                  src={tileArt(t.id, slug) ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span
                  className="relative z-[2] w-full py-2.5 text-center text-[14px] font-semibold text-white"
                  style={{ background: "#5B8FB0" }}
                >
                  {t.label}
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* 5 — Super deals, on its own pale band */}
      {deals.length >= 3 ? (
        <section className="mt-5 px-[var(--page-x)] pb-[18px] pt-4" style={{ background: "#DCE9F1" }}>
          <div className="flex items-baseline justify-between gap-3 pb-3">
            <h2 className="text-[17px] font-bold text-ink">Super deals</h2>
            <Link to={browseHref(slug, { tile: "deals" })} className="text-[12.5px] font-semibold text-persimmon">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-[1.35fr_1fr] gap-2.5">
            <DealBig p={deals[0]} />
            <div className="flex flex-col gap-2.5">
              <DealSmall p={deals[1]} />
              <DealSmall p={deals[2]} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 6 / 7 — two swipe rows */}
      <Strip
        title="New arrivals"
        products={newArrivals}
        seeAll={browseHref(slug, { tile: "new-in" })}
      />
      <Strip
        title="Best picks"
        products={bestPicks}
        seeAll={browseHref(slug, { tile: "most-gifted" })}
      />

      {/* 8 — the staggered grid */}
      <section className="pt-5">
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-2">
          <h2 className="text-[17px] font-bold text-ink">All {categoryName.toLowerCase()}</h2>
          <Link to={browseHref(slug)} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
            See all {all.length} →
          </Link>
        </div>
        <StaggeredGrid products={all} collections={collections} />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

const off = (p: FeedProduct) =>
  p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
    : 0;

function photoOf(p: FeedProduct) {
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  return path ? productImageUrl(path) : null;
}

/** Names a Lebanese shopper recognises before they recognise us. */
const KNOWN = ["gs", "adidas", "zahar", "dkny", "geox", "bugatti"];
const rank = (name: string) => {
  const n = name.toLowerCase();
  const i = KNOWN.findIndex((k) => n.includes(k));
  return i === -1 ? 99 : i;
};

/**
 * 200px, full-bleed, three slides, swiped by hand.
 *
 * It was ~300px, and the reason was that SHOP NOW and the AI line were stacked.
 * Side by side on one row they cost one line instead of two, which is the
 * whole hundred pixels.
 */
function Hero({ cat }: { cat: string }) {
  const slides = heroArt(cat);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement | null>(null);

  const COPY = [
    { a: "Dressed for", b: "the occasion" },
    { a: "Something he", b: "will actually wear" },
    { a: "New season,", b: "new wardrobe" },
  ];
  if (slides.length === 0) return null;

  return (
    <section>
      <div
        ref={rail}
        className="scroll-row"
        style={{ ["--row-gap" as string]: "0px", paddingInline: 0, scrollPaddingInline: 0 }}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {slides.map((src, i) => (
          <div
            key={src}
            className="relative h-[200px] w-full shrink-0 snap-start overflow-hidden bg-[#8E8474]"
          >
            <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
            {/* Scrim from the LEFT, because the type is left-aligned; a bottom
                scrim would dim the photograph where the type is not. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,.5), rgba(0,0,0,.02) 76%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-[18px]">
              <h2 className="max-w-[230px] text-[25px] font-bold leading-[1.1] tracking-[-0.4px] text-white">
                {COPY[i % COPY.length].a}
                <br />
                {COPY[i % COPY.length].b}
              </h2>
              <div className="mt-3 flex items-center gap-3.5">
                <Link
                  to={browseHref(cat)}
                  className="bg-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-ink"
                >
                  Shop now
                </Link>
                <Link
                  to="/assistant"
                  className="border-b border-white/60 pb-0.5 text-[12.5px] font-semibold text-white"
                >
                  ✨ Let AI help me choose
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 pb-0.5 pt-2">
        {slides.map((s, i) => (
          <span
            key={s}
            aria-hidden
            className="h-[5px] rounded-pill"
            style={{
              width: i === active ? 14 : 5,
              background: i === active ? "rgb(var(--persimmon))" : "#ddd",
            }}
          />
        ))}
      </div>
    </section>
  );
}

function DealBig({ p }: { p: FeedProduct }) {
  return (
    <Link
      to={`/product/${p.id}`}
      className="relative flex min-h-[206px] flex-col overflow-hidden rounded-[12px] bg-white"
    >
      <Flag pct={off(p)} />
      <span className="flex-1 bg-[#EFEBE5]">
        <Img src={photoOf(p)} className="h-full w-full object-cover" />
      </span>
      <span className="block px-2.5 pb-3 pt-2">
        <span className="line-clamp-2 block h-[30px] text-[12.5px] leading-tight text-ink">
          {p.title}
        </span>
        <span className="block text-[17px] font-extrabold text-persimmon">
          {formatMoney(p.price)}
          <s className="ml-1.5 text-[12px] font-normal text-muted">
            {formatMoney(p.compare_at_price!)}
          </s>
        </span>
      </span>
    </Link>
  );
}

function DealSmall({ p }: { p: FeedProduct }) {
  return (
    <Link to={`/product/${p.id}`} className="relative flex flex-1 flex-col overflow-hidden rounded-[12px] bg-white">
      <Flag pct={off(p)} />
      <span className="flex-1 bg-[#EFEBE5]">
        <Img src={photoOf(p)} className="h-full w-full object-cover" />
      </span>
      <span className="block px-2.5 pb-2 pt-1.5">
        <span className="block text-[14px] font-extrabold text-persimmon">
          {formatMoney(p.price)}
          <s className="ml-1 text-[10.5px] font-normal text-muted">
            {formatMoney(p.compare_at_price!)}
          </s>
        </span>
      </span>
    </Link>
  );
}

/** Square on two corners, rounded bottom-right — a corner flag, not a pill. */
function Flag({ pct }: { pct: number }) {
  if (!pct) return null;
  return (
    <span className="absolute left-0 top-0 z-[3] rounded-br-[10px] bg-persimmon px-2.5 py-1.5 text-[11.5px] font-extrabold leading-none text-white">
      -{pct}%
    </span>
  );
}

/** MIN 4: a rail shorter than the screen is a row with a gap on the right. */
const MIN_STRIP = 4;

function Strip({
  title,
  products,
  seeAll,
}: {
  title: string;
  products: FeedProduct[];
  seeAll: string;
}) {
  if (products.length < MIN_STRIP) return null;
  return (
    <section className="pt-5">
      <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-3">
        <h2 className="text-[16px] font-bold tracking-[-0.2px] text-ink">{title}</h2>
        <Link to={seeAll} className="shrink-0 text-[12.5px] font-semibold text-persimmon">
          See all
        </Link>
      </div>
      <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
        {products.slice(0, 10).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="w-[134px] shrink-0">
            <span className="relative block aspect-[1/1.2] overflow-hidden rounded-[10px] bg-[#F0ECE6]">
              <Img src={photoOf(p)} className="h-full w-full object-cover" />
              {off(p) ? (
                <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-persimmon px-1.5 py-0.5 text-[10px] font-bold text-white">
                  -{off(p)}%
                </span>
              ) : null}
            </span>
            <span className="mt-1.5 line-clamp-2 block h-[30px] text-[12.5px] leading-tight text-ink">
              {p.title}
            </span>
            <span className="block text-[14px] font-extrabold text-ink">
              {formatMoney(p.price)}
              {off(p) ? (
                <s className="ml-1.5 text-[11px] font-normal text-muted">
                  {formatMoney(p.compare_at_price!)}
                </s>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
