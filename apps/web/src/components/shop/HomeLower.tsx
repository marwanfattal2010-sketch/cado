import { NewOnCado, PopularBrands, TopStoresNearYou, AllStores } from "./TotersSections";
import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { SectionHead } from "../SectionHead";
import { ProductCard } from "../ProductCard";
import { ProductRail } from "../ProductRail";
import { ProductRowSkeleton, ProductGridSkeleton } from "../Skeleton";
import { Img } from "../Img";
import { storePath } from "../../lib/routes";
import { BUDGETS, QUIZ_RECIPIENTS } from "../../lib/filters";
import type { FeedProduct } from "../../lib/browse";
import {
  isoWeek,
  rankProducts,
  useCategoryCounts,
  useCategoryProducts,
  useDeals,
  useDiscoverMore,
  useHomeSignals,
  useNewest,
  useStoresOfWeek,
  useTrendingPool,
  type FeaturedStore,
} from "../../hooks/useHomeEndless";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";

/**
 * The lower half of the Home page: nine titled sections, then the endless
 * grid. Everything above (hero, tiles, categories, occasions, gift-card
 * banner, twin deal cards, featured stores) renders before this component.
 *
 * THE PLAYBOOK RULE THIS FILE ENFORCES: every section has a job and a title.
 * No unlabeled product blocks anywhere — the old anonymous grid this
 * replaces is exactly what the rebuild was for. And only one section shouts:
 * Deals gets the persimmon accent; everything else keeps calm ink headings.
 *
 * A section whose data comes back empty renders NOTHING. The page gets
 * shorter, never emptier. The one labelled fallback is Trending → "Popular
 * picks", because that one is a claim about the data and has to stay honest.
 */
export function HomeLower() {
  const signals = useHomeSignals();
  const trendingPool = useTrendingPool();
  const deals = useDeals();
  // 8, up from 3 (Marwan). "See all" stays — the row scrolls sideways, so
  // eight is a row worth swiping rather than three and a link.
  const storesOfWeek = useStoresOfWeek(8);
  const catCounts = useCategoryCounts();
  const newest = useNewest(10);
  const recent = useRecentlyViewed();

  /* ---- 2. Trending this week / Popular picks -------------------------- */

  const distinctOrdered = useMemo(
    () => [...(signals.data?.values() ?? [])].filter((s) => s.recentOrders > 0).length,
    [signals.data]
  );
  // The honest switch. Under five distinct ordered products, a "Trending"
  // heading would be three sales wearing a trend's clothes.
  const trendingIsReal = distinctOrdered >= 5;
  const trending = useMemo(
    () =>
      signals.data && trendingPool.data
        ? rankProducts(trendingPool.data, signals.data).slice(0, 10)
        : [],
    [signals.data, trendingPool.data]
  );

  /* ---- 7. Best of {category} strips, rotating weekly ------------------- */

  const stripCats = useMemo(() => {
    const eligible = (catCounts.data ?? []).filter((c) => c.count >= 6);
    if (eligible.length <= 3) return eligible;
    const start = isoWeek() % eligible.length;
    return [0, 1, 2].map((i) => eligible[(start + i) % eligible.length]);
  }, [catCounts.data]);
  const strip0 = useCategoryProducts(stripCats[0]?.id);
  const strip1 = useCategoryProducts(stripCats[1]?.id);
  const strip2 = useCategoryProducts(stripCats[2]?.id);
  const strips = [strip0, strip1, strip2];

  /* ---- 10. Discover more: exclude everything already on the page ------- */

  const contributors = [trendingPool, deals, newest, strip0, strip1, strip2];
  const excludeReady =
    contributors.every((q) => !q.isLoading) && !signals.isLoading && !recent.isLoading;
  const exclude = useMemo(() => {
    const s = new Set<string>();
    for (const p of trending) s.add(p.id);
    for (const p of deals.data ?? []) s.add(p.id);
    for (const p of newest.data ?? []) s.add(p.id);
    for (const p of recent.data ?? []) s.add(p.id);
    for (const [i] of strips.entries())
      for (const p of rankedStrip(strips[i].data, signals.data).slice(0, 8)) s.add(p.id);
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trending, deals.data, newest.data, recent.data, strip0.data, strip1.data, strip2.data, signals.data]);

  return (
    <div className="pb-6">
      {/* 2 — Trending / Popular picks */}
      {trendingPool.isLoading || signals.isLoading ? (
        <Pad>
          <SectionHead title="Popular picks" />
          <div className="px-4">
            <ProductGridSkeleton count={4} />
          </div>
        </Pad>
      ) : trending.length >= 4 ? (
        <Pad>
          <SectionHead title={trendingIsReal ? "Trending this week" : "Popular picks"} />
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} {...p} compact />
            ))}
          </div>
        </Pad>
      ) : null}

      {/* 3 — Deals. The one section allowed to shout. */}
      {deals.isLoading ? (
        <RailSkeleton title="Deals" />
      ) : (deals.data?.length ?? 0) >= 2 ? (
        <Pad>
          <div className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-3">
            <h2 className="font-display text-h2 text-persimmon">Deals</h2>
            <Link
              to="/gift-finder?skip=1&f.onSale=1"
              className="tap-44 shrink-0 pb-0.5 text-caption font-medium text-ink underline underline-offset-4"
            >
              See all
            </Link>
          </div>
          <Rail products={deals.data ?? []} />
        </Pad>
      ) : null}

      {/* Popular Brands — between Popular picks and Deals, per the brief. */}
      <PopularBrands />

      {/* New on CADO — hides itself when no shop joined in the last 60 days. */}
      <NewOnCado />

      {/* 4 — Stores of the Week */}
      <StoresOfWeekBlock stores={storesOfWeek.data ?? []} />

      {/* 1.3: renamed — "near you" reads right whichever city is selected. */}
      <TopStoresNearYou />

      {/* 5 — Shop by budget */}
      <Pad>
        <SectionHead title="Shop by budget" />
        <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
          {BUDGETS.map((b) => (
            <Link
              key={b.slug}
              to={`/gift-finder?budget=${b.slug}`}
              className="flex h-[76px] w-[132px] shrink-0 flex-col justify-center rounded-card bg-tint-sand px-4 transition-transform duration-press ease-out active:scale-[0.96]"
            >
              {/* Inter, not the display serif. Fraunces is built for words —
                  its numerals are the wonky part of it, and "$25" set in it
                  read as a novelty sticker rather than a price. Section
                  TITLES keep the serif; the money does not. */}
              <span className="font-body text-[22px] font-semibold leading-none tracking-[-0.01em] text-deep-sand">
                {b.label}
              </span>
              <span className="mt-0.5 text-[11px] text-muted">Gifts that fit</span>
            </Link>
          ))}
        </div>
      </Pad>

      {/* 6 — Shop by recipient */}
      <Pad>
        <SectionHead title="Shop by recipient" />
        <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
          {RECIPIENT_ROW.map((r) => (
            <Link
              key={r.value}
              to={`/gift-finder?recipient=${r.value}`}
              className="flex h-[76px] w-[104px] shrink-0 flex-col items-center justify-center gap-1 rounded-card bg-tint-sage transition-transform duration-press ease-out active:scale-[0.96]"
            >
              {/* Matched to the budget tiles above: these two rows sit next
                  to each other and one serif + one sans read as a mistake. */}
              <span className="font-body text-[17px] font-semibold leading-none text-deep-sage">
                {r.label}
              </span>
            </Link>
          ))}
        </div>
      </Pad>

      {/* 7 — Best of {category}, rotating weekly */}
      {stripCats.map((cat, i) =>
        strips[i].isLoading ? (
          <RailSkeleton key={cat.id} title={`Best of ${cat.name}`} />
        ) : (
          <BestOfStrip
            key={cat.id}
            name={cat.name}
            slug={cat.slug}
            products={rankedStrip(strips[i].data, signals.data).slice(0, 8)}
          />
        )
      )}

      {/* 8 — Recently viewed: exists only when there is something to show */}
      {(recent.data?.length ?? 0) > 0 ? (
        <Pad>
          <SectionHead title="Recently viewed" />
          <Rail products={recent.data ?? []} />
        </Pad>
      ) : null}

      {/* 9 — the newest PRODUCTS. Renamed from "New on CADO": 1.5 gives that
          name to the band of newly joined STORES a few sections above, and
          two different sections under one name on one page is the exact
          duplication this round is removing. */}
      {newest.isLoading ? (
        <RailSkeleton title="Just arrived" />
      ) : (newest.data?.length ?? 0) >= 4 ? (
        <Pad>
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-h2">Just arrived</h2>
            </div>
            <p className="mt-0.5 text-caption text-muted">Fresh from Lebanese stores</p>
          </div>
          <Rail products={newest.data ?? []} />
        </Pad>
      ) : null}

      {/* 1.7 — All stores, BEFORE Discover more. Discover more really is an
          infinite scroll (DiscoverMore pages forever on a sentinel), so
          anything placed after it is unreachable. */}
      <AllStores />

      {/* 10 — Discover more, the endless part */}
      <DiscoverMore exclude={exclude} excludeReady={excludeReady} />
    </div>
  );
}

/** Her and Him first (they carry the most stock), then the family row. */
const RECIPIENT_ROW = [
  { value: "her", label: "Her" },
  { value: "him", label: "Him" },
  ...QUIZ_RECIPIENTS.filter((r): r is { value: string; label: string } => r.value != null),
];

function rankedStrip(rows: FeedProduct[] | undefined, signals: Parameters<typeof rankProducts>[1] | undefined) {
  if (!rows) return [];
  return signals ? rankProducts(rows, signals) : rows;
}

/** One vertical rhythm for every section — rule 4 of the brief. */
function Pad({ children }: { children: React.ReactNode }) {
  return <section className="pt-7">{children}</section>;
}

/**
 * Every swipe row on this page is the shared rail — identical card width,
 * identical card height, one 12px gap, first card inset to the page margin.
 * Deals, Recently viewed, New on CADO and every Best-of strip all come
 * through here, so they cannot drift apart again.
 */
function Rail({ products }: { products: FeedProduct[] }) {
  return <ProductRail products={products} />;
}

function RailSkeleton({ title }: { title: string }) {
  return (
    <Pad>
      <SectionHead title={title} />
      <div className="px-4">
        <ProductRowSkeleton count={3} />
      </div>
    </Pad>
  );
}

function BestOfStrip({ name, slug, products }: { name: string; slug: string; products: FeedProduct[] }) {
  if (products.length < 4) return null;
  return (
    <Pad>
      <SectionHead title={`Best of ${name.replace(/ &.*$/, "")}`} to={`/?tab=${TAB_OF[slug] ?? slug}`} />
      <Rail products={products} />
    </Pad>
  );
}

/** Tab slug is not always the category slug — the standing trap. */
const TAB_OF: Record<string, string> = {
  "jewelry-accessories": "jewelry",
  "flowers-gifts": "flowers",
  "gift-sets": "home",
};

/**
 * Stores of the Week: a swipe row of two or three, every card the same size.
 * A single hero card here looked like the section had failed to load the
 * rest — and with a dozen live partners there is no reason to spotlight only
 * one. Same weekly rotation, three slots.
 */
function StoresOfWeekBlock({ stores }: { stores: FeaturedStore[] }) {
  if (stores.length === 0) return null;
  return (
    <Pad>
      <SectionHead title={stores.length > 1 ? "Stores of the Week" : "Store of the Week"} to="/stores" />
      <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
        {stores.map((store) => {
          const image = store.cover_image_url ?? store.logo_url;
          return (
            <Link
              key={store.id}
              to={storePath(store)}
              className="relative block h-[168px] w-[268px] shrink-0 overflow-hidden rounded-card bg-surface-sunk shadow-rest transition-transform duration-press ease-out active:scale-[0.98]"
            >
              {image ? <Img src={image} className="h-full w-full object-cover" /> : null}
              {/* Ink gradient for the text, same treatment as the store strip
                  cards — legibility, not decoration. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="truncate font-display text-[17px] font-semibold text-white">{store.name}</p>
                {store.tagline || store.description ? (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-white/85">
                    {store.tagline ?? store.description}
                  </p>
                ) : null}
                <span className="mt-2 inline-flex h-8 items-center rounded-[4px] bg-persimmon px-3 text-[12px] font-semibold text-white">
                  Visit store
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Pad>
  );
}

/* ------------------------------------------------------------------ 10 */

function DiscoverMore({ exclude, excludeReady }: { exclude: Set<string>; excludeReady: boolean }) {
  const { pages, total } = useDiscoverMore(exclude, excludeReady);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pages;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    /*
     * ROOT IS THE PANEL, NOT THE VIEWPORT. Each tab is its own scroll
     * container, and a viewport-rooted observer watching a zero-height div
     * inside it simply never fired — verified with a hand-held observer on
     * the rendered sentinel: sitting at y=700 in an 812px viewport, zero
     * callbacks. ProductFeed solved this same container the same way, so
     * this is its pattern verbatim: panel root, 1px-tall sentinel, fetch a
     * little before the bottom arrives.
     */
    const root = el.closest(".panel") as HTMLElement | null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) fetchNextPage();
      },
      { root, rootMargin: "600px 0px" }
    );
    io.observe(el);
    /*
     * Belt AND braces: a plain scroll listener asking "are we within 600px
     * of the bottom?". IntersectionObserver rides the compositor, and in
     * any environment where frames are not being composited (verified here:
     * an observer on the rendered sentinel delivered zero callbacks, not
     * even the mandatory initial one) it goes silent while scroll events
     * keep firing. The listener costs one subtraction per scroll and makes
     * the endless grid load everywhere, not just where the compositor runs.
     */
    const onScroll = () => {
      if (isFetchingNextPage || !root) return;
      if (root.scrollHeight - root.scrollTop - root.clientHeight < 600) fetchNextPage();
    };
    root?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      root?.removeEventListener("scroll", onScroll);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items = pages.data?.pages.flat() ?? [];
  if (excludeReady && total === 0) return null;

  return (
    <Pad>
      <SectionHead title="Discover more" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} {...p} compact />
        ))}
      </div>
      {!excludeReady || pages.isLoading || isFetchingNextPage ? (
        <div className="px-4 pt-3">
          <ProductGridSkeleton count={2} />
        </div>
      ) : null}
      <div ref={sentinel} aria-hidden className="h-px" />
      {excludeReady && !hasNextPage && !pages.isLoading && items.length > 0 ? (
        <p className="px-4 pt-6 text-center text-caption text-muted">
          That's everything — for now.
        </p>
      ) : null}
    </Pad>
  );
}
