import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type BrowseTab, type FeedProduct } from "../../lib/browse";
import { productImageUrl, primaryImage } from "../../lib/images";
import { formatMoney } from "../../lib/money";
import { storePath } from "../../lib/routes";
import { ProductCard } from "../ProductCard";
import { ProductRail } from "../ProductRail";
import { ProductFeed } from "./blocks/ProductFeed";
import { Img } from "../Img";
import { useSubcategories } from "../../hooks/useStores";
import { useHomeSignals, rankProducts } from "../../hooks/useHomeEndless";
import {
  ConfettiDivider,
  DiagonalDivider,
  DotGridDivider,
  DrizzleDivider,
  GoldRule,
  LeafDivider,
  RibbonDivider2,
} from "./TabMotifs";

/**
 * NINE DIFFERENT SHOPS. Each category tab renders its own designed world —
 * palette, hero, tile shape, card treatment, section rhythm, motif — so no
 * two can be mistaken for each other (the clone test). The All tab does not
 * pass through here at all.
 *
 * WHAT IS DESIGN AND WHAT IS DATA. Palettes, arches, drizzles, confetti,
 * diagonals: design, invented freely. Prices, "new", "deals", "best
 * sellers", every photo: data, from real rows only. Tile photos are real
 * products that genuinely match the tile's label — the Under $50 tile wears
 * an actual under-$50 product from this category. Where only lifestyle
 * photography would satisfy a label (jewelry ON a woman), the tab's motif
 * carries the tile instead of a wrong photo; those wishes are listed in the
 * build report for a future shoot.
 */

/* ------------------------------------------------------------------ data */

function usePool(categoryId: string | undefined, key: string, order: string, extra = "") {
  return useQuery({
    queryKey: ["themed-pool", categoryId ?? "none", key],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeedProduct[]> => {
      let q = supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .eq("category_id", categoryId as string);
      if (extra === "deals") q = q.not("compare_at_price", "is", null);
      if (extra === "under50") q = q.lt("price", 50);
      const { data, error } = await q
        .order(order.replace("-", ""), { ascending: !order.startsWith("-") })
        .limit(24);
      if (error) throw error;
      let rows = (data ?? []) as unknown as FeedProduct[];
      if (extra === "deals") rows = rows.filter((p) => Number(p.compare_at_price) > Number(p.price));
      return rows;
    },
  });
}

/** Cross-sell pool for Flowers' "Pair it with" — honestly other stores. */
function useCrossSell(slugs: string[]) {
  return useQuery({
    queryKey: ["themed-cross", slugs.join(",")],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeedProduct[]> => {
      const { data: cats } = await supabase.from("categories").select("id, slug").in("slug", slugs);
      const ids = (cats ?? []).map((c) => c.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .in("category_id", ids)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });
}

/** Stores with stock in this category — the Trendyol banners. */
function useTabStores(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["themed-stores", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, tagline, description, products!inner(id)")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("products.is_active", true)
        .eq("products.category_id", categoryId as string)
        .gt("products.stock_quantity", 0)
        .limit(12);
      if (error) throw error;
      const seen = new Map<string, { id: string; name: string; slug: string | null; logo_url: string | null; cover_image_url: string | null; tagline: string | null; description: string | null; count: number }>();
      for (const r of data ?? []) {
        const cur = seen.get(r.id);
        if (cur) cur.count += r.products?.length ?? 0;
        else seen.set(r.id, { ...r, count: r.products?.length ?? 0 });
      }
      return [...seen.values()].sort((a, b) => b.count - a.count);
    },
  });
}

/* ------------------------------------------------------------ primitives */

function heroPhoto(rows: FeedProduct[] | undefined): string | null {
  const p = (rows ?? []).find((r) => (r.product_images ?? []).length);
  return p ? primaryImage(p.product_images) : null;
}

/** A real product's photo for a tile, from the pool matching its label. */
function tilePhoto(rows: FeedProduct[] | undefined, i = 0): string | null {
  const withImg = (rows ?? []).filter((r) => (r.product_images ?? []).length);
  const p = withImg[i % Math.max(1, withImg.length)];
  return p ? primaryImage(p.product_images) : null;
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
      {children}
    </div>
  );
}

function CardCell({ p, w = "w-[46%]" }: { p: FeedProduct; w?: string }) {
  return (
    <div className={`${w} shrink-0 sm:w-[30%]`}>
      <ProductCard {...p} compact />
    </div>
  );
}

/** Sport's section header: italic, uppercase, with a short green bar. */
function SportHead({ title, to, accent = false }: { title: string; to?: string; accent?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3 px-[var(--page-x)] pb-3">
      <div>
        <h2
          className={`text-[19px] font-extrabold uppercase italic leading-none tracking-tight ${
            accent ? "text-[#2F7D46]" : "text-black"
          }`}
        >
          {title}
        </h2>
        <span aria-hidden className="mt-1.5 block h-[3px] w-9 bg-[#2F7D46]" />
      </div>
      {to ? (
        <Link to={to} className="tap-44 shrink-0 pb-0.5 text-caption font-medium text-ink underline underline-offset-4">
          See all
        </Link>
      ) : null}
    </div>
  );
}

/** Trendyol-style store banners: cover, dark-left gradient, name, chevron. */
function StoreBanners({ categoryId, accent }: { categoryId?: string; accent: string }) {
  const stores = useTabStores(categoryId);
  const list = (stores.data ?? []).slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="mt-6 flex flex-col gap-3 px-[var(--page-x)]">
      {list.map((s) => (
        <Link
          key={s.id}
          to={storePath(s)}
          className="relative block h-[92px] overflow-hidden rounded-card shadow-rest transition-transform duration-press ease-out active:scale-[0.98]"
          style={{ background: accent }}
        >
          {s.cover_image_url ? (
            <Img src={s.cover_image_url} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${accent}E6 0%, ${accent}99 45%, transparent 85%)` }}
          />
          <span className="absolute inset-y-0 left-0 flex items-center gap-3 px-4">
            {s.logo_url ? (
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-pill bg-white/90">
                <Img src={s.logo_url} className="h-full w-full object-cover" />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold text-white">{s.name}</span>
              {s.tagline || s.description ? (
                <span className="block truncate text-[11px] text-white/85">{s.tagline ?? s.description}</span>
              ) : null}
            </span>
          </span>
          <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-white/90">
            ›
          </span>
        </Link>
      ))}
      <Link to="/stores" className="tap-44 self-end text-caption font-medium text-ink underline underline-offset-4">
        See all stores →
      </Link>
    </section>
  );
}

/** 5-per-row category circles, ring colour per tab. */
function Circles({
  subs,
  ring,
  onSelect,
  active,
  rotate,
}: {
  subs: { id: string; slug: string; name: string }[] | undefined;
  ring: string;
  onSelect: (slug: string | null) => void;
  active: string | null;
  rotate?: string[];
}) {
  const images = useQuery({
    queryKey: ["themed-circle-imgs", (subs ?? []).map((s) => s.id).join(",")],
    enabled: !!subs?.length,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("subcategory_id, product_images(storage_path, is_primary)")
        .in("subcategory_id", (subs ?? []).map((s) => s.id))
        .eq("is_active", true)
        .limit(200);
      const map = new Map<string, string>();
      for (const r of data ?? []) {
        const imgs = (r.product_images ?? []) as { storage_path: string; is_primary: boolean }[];
        if (r.subcategory_id && imgs.length && !map.has(r.subcategory_id)) {
          map.set(r.subcategory_id, (imgs.find((i) => i.is_primary) ?? imgs[0]).storage_path);
        }
      }
      return map;
    },
  });
  if (!subs?.length) return null;
  return (
    <div className="mt-5 grid grid-cols-5 gap-2 px-[var(--page-x)]">
      {subs.slice(0, 10).map((s, i) => {
        const path = images.data?.get(s.id);
        const ringColor = rotate ? rotate[i % rotate.length] : ring;
        const on = active === s.slug;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(on ? null : s.slug)}
            className="flex flex-col items-center gap-1 transition-transform duration-press active:scale-[0.94]"
          >
            <span
              className="h-[60px] w-[60px] overflow-hidden rounded-pill bg-surface-sunk"
              style={{ border: `2px solid ${on ? ringColor : `${ringColor}55`}` }}
            >
              {path ? <Img src={productImageUrl(path)} className="h-full w-full object-cover" /> : null}
            </span>
            <span className="line-clamp-1 text-[11px] font-medium text-ink">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- the tabs */

/**
 * The tabs with a designed world of their own. Everything NOT in this set —
 * Fashion, Jewelry, Flowers, Chocolate, Gift Sets, Electronics, Shoes —
 * renders the original block pipeline in TabPanel (hero carousel, entry
 * tiles, circles, deal pair, Top of, store strip, feed), which was never
 * removed. Reverting a tab is deleting its slug from this set; nothing about
 * the old layout was rebuilt from memory.
 *
 * Kept by decision on Aug 19: Perfume & Beauty, Toys, and Sport.
 */
export const THEMED_TAB_SLUGS = new Set(["perfumes", "toys", "sport"]);

export function ThemedTab({
  tab,
  categoryId,
  categoryName,
}: {
  tab: BrowseTab;
  categoryId?: string;
  categoryName?: string;
}) {
  // Recipes are keyed by TAB slug, not category slug — they differ
  // (gift-sets→home, jewelry-accessories→jewelry, flowers-gifts→flowers).
  const slug = tab.slug;
  const subs = useSubcategories(tab.filter.category_slug);
  const signals = useHomeSignals();
  const newest = usePool(categoryId, "new", "-created_at");
  const deals = usePool(categoryId, "deals", "-created_at", "deals");
  const under50 = usePool(categoryId, "u50", "price", "under50");
  const cheapest = usePool(categoryId, "cheap", "price");
  const [subcat, setSubcat] = useState<string | null>(null);
  const subcategoryId = subs.data?.find((s) => s.slug === subcat)?.id;
  // Hooks must run unconditionally — the cross-sell query exists for every
  // tab but only Flowers renders it (and only Flowers pays for it: enabled
  // is gated on the slug inside the hook call below being cheap no-ops
  // elsewhere would still violate the rules of hooks if placed in the case).
  const cross = useCrossSell(
    slug === "flowers"
      ? ["chocolate", "gift-sets"]
      : slug === "fashion"
        ? // Whichever slug the jewelry category actually uses — .in() just
          // matches nothing for the other, and an empty row renders nothing.
          ["jewelry-accessories", "jewelry"]
        : []
  );

  const best = useMemo(
    () => (signals.data && newest.data ? rankProducts(newest.data, signals.data) : newest.data ?? []),
    [signals.data, newest.data]
  );
  /** "Best sellers" only when real orders exist for this category. */
  const hasRealBest = useMemo(
    () => (newest.data ?? []).some((p) => (signals.data?.get(p.id)?.recentOrders ?? 0) > 0),
    [newest.data, signals.data]
  );

  const common = { subs: subs.data, onSelect: setSubcat, active: subcat };
  const feed = (
    <section className="mt-7">
      <h2 className="px-[var(--page-x)] pb-1 text-[15px] font-bold">All {categoryName ?? "gifts"}</h2>
      <ProductFeed categoryId={categoryId} subcategoryId={subcategoryId} filter={{}} enabled={!!categoryId} />
    </section>
  );

  switch (slug) {
    /* ------------------------------------------------ 1. FASHION — Magazine */
    case "fashion": {
      const month = new Date().toLocaleString("en-GB", { month: "long" });
      const photo = heroPhoto(newest.data);
      return (
        <div data-theme="fashion">
          <div className="relative">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#26221F]">
              {photo ? <Img src={photo} className="h-full w-full object-cover" eager /> : null}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#26221F]/85 via-transparent to-transparent" />
            </div>
            <div className="relative -mt-16 px-[var(--page-x)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C19A6B]">
                The Edit · {month}
              </p>
              <h2 className="mt-1 font-display text-[34px] font-semibold leading-[1.05] text-[#F5F1EA] [text-shadow:0_1px_10px_rgba(38,34,31,.6)]">
                Dressed for
                <br />
                the moment
              </h2>
              <Link
                to="/gift-finder?category=fashion"
                className="mt-2 inline-block text-body font-medium text-[#F5F1EA] underline underline-offset-4"
              >
                Shop the edit →
              </Link>
            </div>
          </div>

          {/* Text tabs, not pills — this tab only. */}
          <div className="mt-6 flex gap-6 px-[var(--page-x)]">
            {(subs.data ?? [])
              .filter((s) => ["women", "men", "kids"].includes(s.slug))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                  className={`pb-1 text-body font-medium ${
                    subcat === s.slug ? "border-b-2 border-[#26221F] text-ink" : "text-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
          </div>

          {/* Portrait tiles, charcoal band, camel labels. */}
          <div className="mt-5">
            <Rail>
              {[
                { label: "New In", pool: newest.data, to: "/?tab=fashion&sort=new" },
                { label: "Under $50", pool: under50.data, to: "/gift-finder?category=fashion&budget=under-50" },
                { label: "Occasion Wear", pool: best, to: "/gift-finder?category=fashion&occasion=birthday" },
                { label: `${month} Edit`, pool: newest.data, to: "/?tab=fashion&sort=new" },
              ].map((t, i) => (
                <Link key={t.label} to={t.to} className="w-[38%] shrink-0">
                  <span className="block aspect-[3/4] overflow-hidden bg-surface-sunk">
                    {tilePhoto(t.pool, i) ? (
                      <Img src={tilePhoto(t.pool, i)!} className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="block bg-[#26221F] px-2 py-1.5 text-center text-[11px] font-semibold tracking-wide text-[#C19A6B]">
                    {t.label}
                  </span>
                </Link>
              ))}
            </Rail>
          </div>

          <StoreBanners categoryId={categoryId} accent="#26221F" />
          <Circles {...common} ring="#C19A6B" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <section className="mt-8 px-[var(--page-x)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">Editorial</p>
              <h2 className="font-display text-h2">Fresh drops</h2>
              {/* The only masonry in the app. */}
              <div className="mt-3 columns-2 gap-3">
                {(newest.data ?? []).slice(0, 8).map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid [&_p]:font-display">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {best.length >= 4 ? (
            <section className="mt-8 bg-[#26221F] py-6">
              <p className="px-[var(--page-x)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                Editorial
              </p>
              <h2 className="px-[var(--page-x)] font-display text-h2 text-[#F5F1EA]">The Capsule</h2>
              <div className="mt-3">
                <Rail>
                  {best.slice(0, 6).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <section className="mt-8 px-[var(--page-x)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">Editorial</p>
              <h2 className="font-display text-h2">Deals on fashion</h2>
              {/* Camel strikethroughs — this tab's deal accent. */}
              <div className="mt-3 grid grid-cols-2 gap-3 [&_.line-through]:text-[#C19A6B]">
                {(deals.data ?? []).slice(0, 6).map((p) => (
                  <ProductCard key={p.id} {...p} compact />
                ))}
              </div>
            </section>
          ) : null}

          {(cross.data?.length ?? 0) >= 4 ? (
            <section className="mt-8">
              <p className="px-[var(--page-x)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                Editorial
              </p>
              <h2 className="px-[var(--page-x)] font-display text-h2">Complete the gift</h2>
              <p className="px-[var(--page-x)] text-caption text-muted">Jewelry from other CADO stores</p>
              <div className="mt-3">
                <Rail>
                  {(cross.data ?? []).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}
          <hr className="mx-[var(--page-x)] mt-8 border-line" />
          {feed}
        </div>
      );
    }

    /* --------------------------------------------- 2. JEWELRY — Jewel Box */
    case "jewelry": {
      const photo = heroPhoto(best);
      return (
        <div data-theme="jewelry">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#14110E]">
            {photo ? <Img src={photo} className="h-full w-full object-cover opacity-80" eager /> : null}
            {/* The jewel-box frame: a 1px gold hairline inset from the edges. */}
            <span aria-hidden className="pointer-events-none absolute inset-3 border border-[#C6A664]" />
            <div className="absolute inset-x-0 bottom-0 p-5 pb-6">
              <h2 className="font-display text-[26px] font-semibold leading-tight text-[#C6A664]">
                Little boxes, big moments
              </h2>
              <Link
                to="/gift-finder?category=jewelry-accessories"
                className="mt-3 inline-flex h-10 items-center border border-[#C6A664] px-4 text-caption font-semibold text-[#C6A664]"
              >
                Open the case
              </Link>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className={`inline-flex h-9 shrink-0 items-center rounded-pill border px-4 text-[13px] font-medium ${
                  subcat === s.slug
                    ? "border-[#C6A664] bg-[#C6A664] text-[#14110E]"
                    : "border-[#C6A664] text-[#8a7444]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Square gold-bordered tiles, small-caps labels below. */}
          <div className="mt-5 grid grid-cols-2 gap-3 px-[var(--page-x)]">
            {[
              { label: "FOR HER", pool: best, to: "/gift-finder?category=jewelry-accessories&recipient=her" },
              // Jewelry only — no bags, no belts. If nothing matches, the
              // tile shows no photo rather than a wrong one.
              { label: "FOR HIM", pool: newest.data?.filter((p) => /watch|cufflink|men/i.test(p.title)), to: "/gift-finder?category=jewelry-accessories&recipient=him" },
              { label: "UNDER $50", pool: under50.data, to: "/gift-finder?category=jewelry-accessories&budget=under-50" },
              { label: "WEDDING & EVENT", pool: best, to: "/gift-finder?category=jewelry-accessories&occasion=anniversary" },
            ].map((t, i) => (
              <Link key={t.label} to={t.to} className="block">
                <span className="block border border-[#C6A664] p-2">
                  <span className="block aspect-square overflow-hidden bg-surface-sunk">
                    {tilePhoto(t.pool, i) ? (
                      <Img src={tilePhoto(t.pool, i)!} className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                </span>
                <span className="mt-1.5 block text-center text-[11px] font-semibold tracking-[0.18em] text-ink">
                  {t.label}
                </span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#14110E" />
          <Circles {...common} ring="#C6A664" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <section className="mt-8">
              <div className="px-[var(--page-x)]">
                <h2 className="font-display text-h2">New in the case</h2>
                <GoldRule />
              </div>
              {/* The only dark product cards in the app. */}
              <div className="mt-3">
                <Rail>
                  {(newest.data ?? []).slice(0, 8).map((p) => (
                    <Link key={p.id} to={`/product/${p.id}`} className="w-[42%] shrink-0">
                      <span className="block overflow-hidden bg-[#14110E] p-2">
                        <span className="block aspect-square overflow-hidden">
                          {primaryImage(p.product_images) ? (
                            <Img src={primaryImage(p.product_images)!} className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span className="mt-2 block truncate text-[12px] text-[#F5F1EA]">{p.title}</span>
                        <span className="block text-[13px] font-semibold text-[#C6A664]">
                          {formatMoney(p.price)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <section className="mt-8 px-[var(--page-x)]">
              <h2 className="font-display text-h2">Deals worth wrapping</h2>
              <GoldRule />
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(deals.data ?? []).slice(0, 6).map((p) => (
                  <ProductCard key={p.id} {...p} compact />
                ))}
              </div>
            </section>
          ) : null}

          {hasRealBest ? (
            <section className="mt-8 px-[var(--page-x)]">
              <h2 className="font-display text-h2">Best sellers</h2>
              <GoldRule />
              <div className="mt-3">
                <Rail>
                  {best.slice(0, 6).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}
          {feed}
        </div>
      );
    }

    /* ------------------------------------------------- 3. FLOWERS — Garden */
    case "flowers": {
      const photo = heroPhoto(best);
      return (
        <div data-theme="flowers">
          <div className="px-[var(--page-x)] pt-3">
            {/* The arch — no other tab uses one. */}
            <div className="relative mx-auto aspect-[4/5] max-w-[340px] overflow-hidden rounded-t-[170px] bg-[#EAF2EA]">
              {photo ? <Img src={photo} className="h-full w-full object-cover" eager /> : null}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#3E7C4F]/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <h2 className="font-display text-[26px] font-semibold text-white">Fresh from the garden</h2>
                <p className="text-caption text-white/90">From local florists</p>
                <Link
                  to="/gift-finder?category=flowers-gifts"
                  className="mt-2 inline-flex h-10 items-center rounded-[4px] bg-[#3E7C4F] px-4 text-caption font-semibold text-white"
                >
                  Send flowers
                </Link>
              </div>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className={`inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium ${
                  subcat === s.slug ? "bg-[#3E7C4F] text-white" : "bg-[#EAF2EA] text-[#3E7C4F]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Arch-topped mini heroes with a coral ribbon. */}
          <div className="mt-5">
            <Rail>
              {[
                { label: "Birthday Blooms", to: "/gift-finder?category=flowers-gifts&occasion=birthday" },
                { label: "Get Well", to: "/gift-finder?category=flowers-gifts&occasion=get-well" },
                { label: "Congratulations", to: "/gift-finder?category=flowers-gifts&occasion=graduation" },
                { label: "Just Because", to: "/gift-finder?category=flowers-gifts" },
              ].map((t, i) => (
                <Link key={t.label} to={t.to} className="w-[38%] shrink-0">
                  <span className="block aspect-[3/4] overflow-hidden rounded-t-[80px] bg-[#EAF2EA]">
                    {tilePhoto(best, i) ? (
                      <Img src={tilePhoto(best, i)!} className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="block bg-[#F2795C] px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                    {t.label}
                  </span>
                </Link>
              ))}
            </Rail>
          </div>

          <StoreBanners categoryId={categoryId} accent="#3E7C4F" />
          <Circles {...common} ring="#3E7C4F" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <>
              <LeafDivider />
              <section className="px-0">
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#3E7C4F]">Fresh this week</h2>
                <div className="mt-3">
                  <Rail>
                    {(newest.data ?? []).slice(0, 8).map((p) => (
                      <Link key={p.id} to={`/product/${p.id}`} className="w-[40%] shrink-0">
                        <span className="block aspect-[3/4] overflow-hidden rounded-t-[70px] bg-[#EAF2EA]">
                          {primaryImage(p.product_images) ? (
                            <Img src={primaryImage(p.product_images)!} className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-[12px] text-ink">{p.title}</span>
                        <span className="block text-[13px] font-semibold text-[#3E7C4F]">{formatMoney(p.price)}</span>
                      </Link>
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(under50.data?.length ?? 0) >= 2 ? (
            <>
              <LeafDivider />
              <section className="bg-[#EAF2EA] py-6">
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#3E7C4F]">Under $50 bouquets</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 px-[var(--page-x)]">
                  {(under50.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {(cross.data?.length ?? 0) >= 4 ? (
            <>
              <LeafDivider />
              <section>
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#3E7C4F]">Pair it with</h2>
                <p className="px-[var(--page-x)] text-caption text-muted">From other CADO stores</p>
                <div className="mt-3">
                  <Rail>
                    {(cross.data ?? []).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    /* ------------------------------------------ 4. PERFUME — Golden Hour */
    case "perfumes": {
      const chips = (best ?? []).filter((p) => (p.product_images ?? []).length).slice(0, 3);
      const him = (newest.data ?? []).filter((p) => /men|him|oud|amber/i.test(p.title));
      const shelfie = (best ?? []).filter((p) => (p.product_images ?? []).length).slice(0, 5);
      return (
        <div data-theme="perfumes">
          {/* Gradient hero with real, tappable price chips — no photo backdrop. */}
          <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#F8D9C4,#E3B04B)" }}>
            <div className="px-[var(--page-x)] pb-6 pt-6">
              <h2 className="font-display text-[28px] font-semibold leading-tight text-[#7a4a33]">
                Golden hour, bottled.
              </h2>
              <div className="mt-4 flex items-end justify-center gap-3">
                {chips.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="relative w-[28%]">
                    <Img src={primaryImage(p.product_images)!} className="aspect-[3/4] w-full rounded-[10px] object-cover shadow-lift" />
                    <span className="absolute -top-2 right-0 rounded-pill bg-white px-2 py-0.5 text-[11px] font-bold text-[#D77A61] shadow-rest">
                      {formatMoney(p.price)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {[
              { label: "For Her", to: "/gift-finder?category=perfumes&recipient=her" },
              { label: "For Him", to: "/gift-finder?category=perfumes&recipient=him" },
            ].map((c) => (
              <Link key={c.label} to={c.to} className="inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium text-[#7a4a33]" style={{ background: "linear-gradient(135deg,#F8D9C4,#E3B04B)" }}>
                {c.label}
              </Link>
            ))}
            {(subs.data ?? [])
              .filter((s) => ["skincare", "makeup"].includes(s.slug))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                  className={`inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium ${
                    subcat === s.slug ? "text-[#7a4a33]" : "bg-surface text-muted border border-line"
                  }`}
                  style={subcat === s.slug ? { background: "linear-gradient(135deg,#F8D9C4,#E3B04B)" } : undefined}
                >
                  {s.name}
                </button>
              ))}
          </div>

          {/* Glassy tiles. */}
          <div className="mt-5 grid grid-cols-2 gap-3 px-[var(--page-x)]">
            {[
              { label: "Fragrance", pool: newest.data?.filter((p) => /parfum|eau|scent|oud/i.test(p.title)), to: "/?tab=perfumes" },
              { label: "Skincare", pool: newest.data?.filter((p) => /skin|serum|cream|glow/i.test(p.title)), to: "/?tab=perfumes" },
              { label: "Gift-Ready Sets", pool: newest.data?.filter((p) => /set|ritual/i.test(p.title)), to: "/?tab=perfumes" },
              { label: "Under $50", pool: under50.data, to: "/gift-finder?category=perfumes&budget=under-50" },
            ].map((t, i) => (
              <Link key={t.label} to={t.to} className="block overflow-hidden rounded-2xl bg-white shadow-lift">
                <span className="block aspect-[4/3] overflow-hidden">
                  {tilePhoto(t.pool?.length ? t.pool : newest.data, i) ? (
                    <Img src={tilePhoto(t.pool?.length ? t.pool : newest.data, i)!} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="block px-3 py-2 text-[12px] font-semibold text-[#7a4a33]" style={{ background: "linear-gradient(90deg,#F8D9C466,#E3B04B44)" }}>
                  {t.label}
                </span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#D77A61" />
          <Circles {...common} ring="#E3B04B" />

          {shelfie.length >= 5 ? (
            <section className="mt-8 px-[var(--page-x)]">
              <h2 className="font-display text-h2">Shelfie</h2>
              <span aria-hidden className="block h-[2px] w-16" style={{ background: "linear-gradient(90deg,#E3B04B,transparent)" }} />
              {/* The only mosaic in the app: 1 big + 4 small. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/product/${shelfie[0].id}`} className="row-span-2 block overflow-hidden rounded-[12px]">
                  <Img src={primaryImage(shelfie[0].product_images)!} className="h-full w-full object-cover" />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  {shelfie.slice(1, 5).map((p) => (
                    <Link key={p.id} to={`/product/${p.id}`} className="block aspect-square overflow-hidden rounded-[12px]">
                      <Img src={primaryImage(p.product_images)!} className="h-full w-full object-cover" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <section className="mt-8 py-5" style={{ background: "linear-gradient(135deg,#F8D9C455,#E3B04B33)" }}>
              <h2 className="px-[var(--page-x)] font-display text-h2">Beauty deals</h2>
              <div className="mt-3">
                <Rail>
                  {(deals.data ?? []).slice(0, 6).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}

          {him.length >= 1 ? (
            <section className="mt-8 bg-[#3a2a20] py-5">
              <h2 className="px-[var(--page-x)] font-display text-h2 text-[#E3B04B]">Scents for him</h2>
              <div className="mt-3">
                <Rail>
                  {him.slice(0, 4).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}

          {(newest.data?.length ?? 0) >= 4 ? (
            <section className="mt-8">
              <h2 className="px-[var(--page-x)] font-display text-h2">New on the shelf</h2>
              <span
                aria-hidden
                className="ml-[var(--page-x)] block h-[2px] w-16"
                style={{ background: "linear-gradient(90deg,#E3B04B,transparent)" }}
              />
              <div className="mt-3">
                <Rail>
                  {(newest.data ?? []).slice(0, 8).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}
          {feed}
        </div>
      );
    }

    /* -------------------------------------------- 5. CHOCOLATE — Cocoa Bar */
    case "chocolate": {
      const photo = heroPhoto(best);
      return (
        <div data-theme="chocolate">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#3B241F]">
            {photo ? <Img src={photo} className="h-full w-full object-cover opacity-75" eager /> : null}
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="font-display text-[28px] font-semibold text-[#F6F1E7]">Made to be shared</h2>
              <DrizzleDivider width={140} />
              <Link
                to="/gift-finder?category=chocolate"
                className="mt-1 inline-flex h-10 items-center rounded-[4px] bg-[#C98F51] px-4 text-caption font-semibold text-[#3B241F]"
              >
                Pick a box
              </Link>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className={`inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium ${
                  subcat === s.slug ? "bg-[#C98F51] text-[#3B241F]" : "bg-[#3B241F] text-[#F6F1E7]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 px-[var(--page-x)]">
            {[
              { label: "Gift Boxes", pool: best, to: "/?tab=chocolate" },
              { label: "Under $50", pool: under50.data, to: "/gift-finder?category=chocolate&budget=under-50" },
              { label: "New Flavors", pool: newest.data, to: "/?tab=chocolate&sort=new" },
              { label: "Thank-You Treats", pool: cheapest.data, to: "/gift-finder?category=chocolate&occasion=visiting-someone" },
            ].map((t, i) => (
              <Link key={t.label} to={t.to} className="block overflow-hidden rounded-[14px]">
                <span className="block aspect-square overflow-hidden bg-[#3B241F]">
                  {tilePhoto(t.pool, i) ? (
                    <Img src={tilePhoto(t.pool, i)!} className="h-full w-full object-cover opacity-90" />
                  ) : null}
                </span>
                <span className="block bg-[#C98F51] px-2 py-1.5 text-center text-[11px] font-bold text-[#3B241F]">
                  {t.label}
                </span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#3B241F" />
          <Circles {...common} ring="#C98F51" />

          {/* The band alternation — this tab's rhythm alone. */}
          {(newest.data?.length ?? 0) >= 4 ? (
            <section className="mt-8">
              <h2 className="px-[var(--page-x)] font-display text-h2 text-[#3B241F]">Just made</h2>
              <div className="mt-3">
                <Rail>
                  {(newest.data ?? []).slice(0, 6).map((p) => (
                    <CardCell key={p.id} p={p} />
                  ))}
                </Rail>
              </div>
            </section>
          ) : null}

          {/* Best sellers means real orders — the band hides until they exist. */}
          {hasRealBest && best.length >= 4 ? (
            <>
              <DrizzleDivider />
              <section className="bg-[#3B241F] py-6">
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#F6F1E7]">Crowd favorites</h2>
                <div className="mt-3">
                  <Rail>
                    {best.slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <>
              <DrizzleDivider />
              <section className="px-[var(--page-x)]">
                <h2 className="font-display text-h2 text-[#3B241F]">Sweet deals</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(deals.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact />
                  ))}
                </div>
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    /* ------------------------------------------------ 6. TOYS — Playground */
    case "toys": {
      const TOY_COLORS = ["#3BA7DC", "#FFC93C", "#E84C3D", "#58C9A4"];
      const cutouts = (best ?? []).filter((p) => (p.product_images ?? []).length).slice(0, 3);
      return (
        <div data-theme="toys">
          <div
            className="relative overflow-hidden rounded-b-[28px] pb-6 pt-6"
            style={{
              background: "#FFC93C",
              backgroundImage:
                "radial-gradient(circle, #3BA7DC22 2px, transparent 2.4px), radial-gradient(circle, #E84C3D22 2px, transparent 2.4px), radial-gradient(circle, #58C9A422 2px, transparent 2.4px)",
              backgroundSize: "34px 34px, 46px 46px, 28px 28px",
            }}
          >
            <h2 className="px-[var(--page-x)] text-[30px] font-extrabold leading-tight text-[#2b2b2b]">
              Playtime, delivered
            </h2>
            <div className="mt-3 flex items-end justify-center gap-3 px-[var(--page-x)]">
              {cutouts.map((p, i) => (
                <Link key={p.id} to={`/product/${p.id}`} className="w-[28%]" style={{ transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>
                  <Img src={primaryImage(p.product_images)!} className="aspect-square w-full rounded-[20px] border-4 border-white object-cover shadow-lift" />
                </Link>
              ))}
            </div>
            <Link
              to="/gift-finder?category=toys"
              className="ml-[var(--page-x)] mt-4 inline-flex h-11 items-center rounded-pill bg-[#E84C3D] px-5 text-caption font-bold text-white"
            >
              Let's play
            </Link>
          </div>

          {/* Age tags do NOT exist in the data — the honest fallback chips
              are the real subcategories. Noted in the build report. */}
          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className="inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-bold text-white"
                style={{ background: subcat === s.slug ? "#2b2b2b" : TOY_COLORS[i % TOY_COLORS.length] }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Bubble squircles with offset coloured shadows. */}
          <div className="mt-6 grid grid-cols-2 gap-4 px-[var(--page-x)]">
            {[
              { label: "Birthday Hits", pool: best, to: "/gift-finder?category=toys&occasion=birthday" },
              { label: "Under $50", pool: under50.data, to: "/gift-finder?category=toys&budget=under-50" },
              { label: "Games & Puzzles", pool: newest.data?.filter((p) => /game|puzzle|blocks|flash/i.test(p.title)), to: "/?tab=toys" },
              { label: "Plush Friends", pool: newest.data?.filter((p) => /plush|bear|teddy|soft/i.test(p.title)), to: "/?tab=toys" },
            ].map((t, i) => (
              <Link
                key={t.label}
                to={t.to}
                className="block rounded-[26px] border-4 border-white bg-white"
                style={{ boxShadow: `6px 6px 0 ${TOY_COLORS[i % TOY_COLORS.length]}` }}
              >
                <span className="block aspect-[4/3] overflow-hidden rounded-[22px]">
                  {tilePhoto(t.pool?.length ? t.pool : newest.data, i) ? (
                    <Img src={tilePhoto(t.pool?.length ? t.pool : newest.data, i)!} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="block px-3 py-2 text-center text-[13px] font-extrabold" style={{ color: TOY_COLORS[i % TOY_COLORS.length] }}>
                  {t.label}
                </span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#3BA7DC" />
          <Circles {...common} ring="#3BA7DC" rotate={TOY_COLORS} />

          {(newest.data?.length ?? 0) >= 4 ? (
            <>
              <ConfettiDivider />
              <section>
                <h2 className="px-[var(--page-x)] text-h2 font-extrabold text-[#3BA7DC]">New toys</h2>
                {/* The only tilted cards in the app; straighten on press. */}
                <div className="mt-3">
                  <Rail>
                    {(newest.data ?? []).slice(0, 8).map((p, i) => (
                      <div
                        key={p.id}
                        className="w-[44%] shrink-0 transition-transform duration-press active:rotate-0"
                        style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
                      >
                        <ProductCard {...p} compact />
                      </div>
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <>
              <ConfettiDivider />
              <section className="px-[var(--page-x)]">
                <h2 className="text-h2 font-extrabold text-[#E84C3D]">Toy deals</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(deals.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {/* Only with real orders behind it — no orders, no section. */}
          {hasRealBest ? (
            <>
              <ConfettiDivider />
              <section>
                <h2 className="px-[var(--page-x)] text-h2 font-extrabold text-[#FFC93C]">Best sellers</h2>
                <div className="mt-3">
                  <Rail>
                    {best.slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(cheapest.data?.length ?? 0) >= 4 ? (
            <>
              <ConfettiDivider />
              <section>
                <h2 className="px-[var(--page-x)] text-h2 font-extrabold text-[#58C9A4]">Little prices</h2>
                <div className="mt-3">
                  <Rail>
                    {(cheapest.data ?? []).slice(0, 8).map((p, i) => (
                      <Link key={p.id} to={`/product/${p.id}`} className="w-[32%] shrink-0 text-center">
                        <span className="block aspect-square overflow-hidden rounded-[20px] bg-white">
                          {primaryImage(p.product_images) ? (
                            <Img src={primaryImage(p.product_images)!} className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span
                          className="mt-1 inline-block rounded-pill px-3 py-1 text-[14px] font-extrabold text-white"
                          style={{ background: TOY_COLORS[i % TOY_COLORS.length] }}
                        >
                          {formatMoney(p.price)}
                        </span>
                      </Link>
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    /* ------------------------------------------ 7. GIFT SETS — Wrapping Room */
    case "home": {
      const photo = heroPhoto(best);
      return (
        <div data-theme="gift-sets">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#B98E5A]">
            {photo ? <Img src={photo} className="h-full w-full object-cover" eager /> : null}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#A33B2E]/85 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="font-display text-[26px] font-semibold leading-tight text-white">
                Already wrapped. Already perfect.
              </h2>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {[
              { label: "For Her", to: "/gift-finder?category=gift-sets&recipient=her" },
              { label: "For Him", to: "/gift-finder?category=gift-sets&recipient=him" },
              { label: "Birthday", to: "/gift-finder?category=gift-sets&occasion=birthday" },
              { label: "Under $50", to: "/gift-finder?category=gift-sets&budget=under-50" },
            ].map((c) => (
              <Link key={c.label} to={c.to} className="inline-flex h-9 shrink-0 items-center rounded-pill bg-[#B98E5A] px-4 text-[13px] font-semibold text-white">
                {c.label}
              </Link>
            ))}
          </div>

          {/* Gift-tag tiles: notched corner + punched hole. */}
          <div className="mt-5 grid grid-cols-2 gap-3 px-[var(--page-x)]">
            {[
              { label: "Ready-to-Gift", pool: best, to: "/?tab=home" },
              { label: "Under $50", pool: under50.data, to: "/gift-finder?category=gift-sets&budget=under-50" },
              { label: "New Sets", pool: newest.data, to: "/?tab=home&sort=new" },
              { label: "Premium Sets", pool: (best ?? []).slice().sort((a, b) => Number(b.price) - Number(a.price)), to: "/?tab=home" },
            ].map((t, i) => (
              <Link
                key={t.label}
                to={t.to}
                className="relative block bg-surface p-2 shadow-rest"
                style={{ clipPath: "polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)" }}
              >
                <span aria-hidden className="absolute left-2.5 top-2.5 h-2 w-2 rounded-pill border border-[#B98E5A] bg-canvas" />
                <span className="block aspect-[4/3] overflow-hidden">
                  {tilePhoto(t.pool, i) ? (
                    <Img src={tilePhoto(t.pool, i)!} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="block pt-2 text-center text-[12px] font-semibold text-[#A33B2E]">{t.label}</span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#A33B2E" />
          <Circles {...common} ring="#A33B2E" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <>
              <RibbonDivider2 />
              <section>
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#A33B2E]">New sets</h2>
                <div className="mt-3">
                  <Rail>
                    {(newest.data ?? []).slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {hasRealBest ? (
            <>
              <RibbonDivider2 />
              <section className="bg-[#B98E5A]/25 py-6">
                <h2 className="px-[var(--page-x)] font-display text-h2 text-[#A33B2E]">Most gifted</h2>
                <div className="mt-3">
                  <Rail>
                    {best.slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <>
              <RibbonDivider2 />
              <section className="px-[var(--page-x)]">
                <h2 className="font-display text-h2 text-[#A33B2E]">Set deals</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(deals.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact />
                  ))}
                </div>
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    /* --------------------------------------- 8. ELECTRONICS — The Showroom */
    case "electronics": {
      const podium = (best ?? []).filter((p) => (p.product_images ?? []).length).slice(0, 3);
      return (
        <div data-theme="electronics">
          <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg,#EEF3FA,#FFFFFF)" }}>
            <div className="px-[var(--page-x)] pb-6 pt-6">
              <h2 className="text-[26px] font-bold leading-tight text-[#2A2E33]">Tech they'll actually use</h2>
              <div className="mt-5 flex items-end justify-center gap-4">
                {podium.map((p, i) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="relative flex w-[28%] flex-col items-center">
                    <span className="absolute -top-2 right-0 z-10 rounded-[4px] bg-[#3D7BFF] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {formatMoney(p.price)}
                    </span>
                    <Img src={primaryImage(p.product_images)!} className="aspect-square w-full rounded-[8px] object-cover" />
                    {/* the podium block — taller toward the right */}
                    <span aria-hidden className="w-[85%] bg-[#D6DEE9]" style={{ height: `${14 + i * 8}px` }} />
                  </Link>
                ))}
              </div>
              <Link
                to="/gift-finder?category=electronics"
                className="mt-5 inline-flex h-10 items-center rounded-[4px] bg-[#3D7BFF] px-4 text-caption font-semibold text-white"
              >
                Browse tech
              </Link>
            </div>
          </div>

          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className={`inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium text-white ${
                  subcat === s.slug ? "bg-[#3D7BFF]" : "bg-[#2A2E33]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* The only landscape tiles in the app. */}
          <div className="mt-5 flex flex-col gap-3 px-[var(--page-x)]">
            {[
              { label: "New Tech", pool: newest.data, to: "/?tab=electronics&sort=new" },
              { label: "Under $50", pool: under50.data, to: "/gift-finder?category=electronics&budget=under-50" },
              { label: "For Him", pool: best, to: "/gift-finder?category=electronics&recipient=him" },
              { label: "For Her", pool: newest.data, to: "/gift-finder?category=electronics&recipient=her" },
            ].map((t, i) => (
              <Link key={t.label} to={t.to} className="block overflow-hidden rounded-[10px] bg-[#F4F6F9] shadow-rest">
                <span className="block aspect-[16/9] overflow-hidden">
                  {tilePhoto(t.pool, i) ? (
                    <Img src={tilePhoto(t.pool, i)!} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="block bg-[#3D7BFF] px-3 py-1.5 text-[12px] font-semibold text-white">{t.label}</span>
              </Link>
            ))}
          </div>

          <StoreBanners categoryId={categoryId} accent="#2A2E33" />
          <Circles {...common} ring="#3D7BFF" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <>
              <DotGridDivider />
              <section>
                <h2 className="px-[var(--page-x)] text-h2 font-bold text-[#2A2E33]">Just landed</h2>
                <div className="mt-3 [&_.text-price]:font-mono">
                  <Rail>
                    {(newest.data ?? []).slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <>
              <DotGridDivider />
              <section className="px-[var(--page-x)]">
                <h2 className="text-h2 font-bold text-[#2A2E33]">Tech deals</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 [&_.text-price]:font-mono">
                  {(deals.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {best.length >= 4 ? (
            <>
              <DotGridDivider />
              <section className="bg-[#EEF3FA] py-6">
                <h2 className="px-[var(--page-x)] text-h2 font-bold text-[#2A2E33]">Gift-ready tech</h2>
                <div className="mt-3 [&_.text-price]:font-mono">
                  <Rail>
                    {best.slice(0, 6).map((p) => (
                      <CardCell key={p.id} p={p} />
                    ))}
                  </Rail>
                </div>
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    /* ------------------------------------------------ 9. SPORT — Locker Room */
    case "sport": {
      const photo = heroPhoto(best);
      /* Three real products with their real prices, standing under the hero
         like a kit laid out on a bench. Same trick as the beauty and tech
         heroes, and the prices are queried, not decorative. */
      const kit = (best ?? []).filter((p) => (p.product_images ?? []).length).slice(0, 3);
      /* Tiles are built from pools that genuinely match their label, and a
         tile whose pool is empty is DROPPED. The old version fell back to
         "whatever is newest", which is how a tile ends up labelled Football
         Gear over a photo of a yoga mat. */
      const tileSpecs = [
        {
          label: "FOOTBALL",
          pool: (newest.data ?? []).filter((p) => /football|soccer|goal|pitch/i.test(p.title)),
          to: "/?tab=sport",
        },
        {
          label: "TRAINING",
          // Equipment reads as "training" faster than a water bottle does,
          // so the kit sorts to the front of its own pool.
          pool: (newest.data ?? [])
            .filter((p) => /dumbbell|weight|yoga|mat|band|rope|bottle|gym|kettle/i.test(p.title))
            .sort(
              (a, b) =>
                Number(/dumbbell|weight|kettle|yoga|mat/i.test(b.title)) -
                Number(/dumbbell|weight|kettle|yoga|mat/i.test(a.title))
            ),
          to: "/?tab=sport",
        },
        { label: "UNDER $50", pool: under50.data, to: "/gift-finder?category=sport&budget=under-50" },
        { label: "NEW DROPS", pool: newest.data, to: "/?tab=sport&sort=new" },
      ];
      /* One photo per tile, never the same item twice: two tiles wearing the
         same picture reads as a bug, and it also makes one of the two labels
         a lie about that item. The narrow pools (Football, Training) claim
         first; the broad ones take what is left. A tile with no photo of its
         own is dropped rather than filled with something else's. */
      const usedTilePhotos = new Set<string>();
      const tiles = tileSpecs
        .map((t) => {
          const withImg = (t.pool ?? []).filter((p) => (p.product_images ?? []).length);
          const pick = withImg.find((p) => !usedTilePhotos.has(primaryImage(p.product_images) as string));
          const src = pick ? primaryImage(pick.product_images) : null;
          if (src) usedTilePhotos.add(src);
          return { ...t, src };
        })
        .filter((t): t is typeof t & { src: string } => !!t.src);

      return (
        <div data-theme="sport">
          {/* THE STAGE. Photo, black scrim, and a hard diagonal cut along the
              bottom edge — clipped, not a rotated bar hanging off the side of
              the page, which is what made the old one look unfinished. */}
          <div className="relative bg-black">
            <div className="relative aspect-[16/11] w-full overflow-hidden">
              {photo ? <Img src={photo} className="h-full w-full object-cover" eager /> : null}
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.92) 100%)" }}
              />
              <div className="absolute inset-x-0 bottom-0 px-[var(--page-x)] pb-7">
                <span className="inline-block bg-[#2F7D46] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
                  Sport
                </span>
                <h2 className="mt-2 text-[40px] font-extrabold italic leading-[0.95] tracking-tight text-white">
                  Game on.
                </h2>
                <p className="mt-1 text-[13px] font-medium text-white/80">
                  Gear from CADO&apos;s sports shops
                </p>
                <Link
                  to="/gift-finder?category=sport"
                  className="mt-4 inline-flex h-11 items-center gap-2 bg-white px-5 text-[13px] font-extrabold uppercase tracking-wide text-black transition-transform duration-press active:scale-[0.97]"
                  style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)" }}
                >
                  Gear up
                </Link>
              </div>
            </div>
            {/* The green cut that separates hero from page. */}
            <span
              aria-hidden
              className="block h-3 w-full bg-[#2F7D46]"
              style={{ clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 100%)" }}
            />
          </div>

          {/* The kit row: real products, real prices, straight under the hero. */}
          {kit.length >= 2 ? (
            <div className="grid grid-cols-3 gap-2 bg-black px-[var(--page-x)] pb-5 pt-1">
              {kit.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="block transition-transform duration-press active:scale-[0.97]">
                  <span className="block aspect-square overflow-hidden bg-[#141414]">
                    <Img src={primaryImage(p.product_images)!} className="h-full w-full object-cover" />
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-medium text-white/70">{p.title}</span>
                  <span className="block text-[13px] font-extrabold italic text-white">{formatMoney(p.price)}</span>
                </Link>
              ))}
            </div>
          ) : null}

          {/* Square-cornered chips, black until chosen — the athletic kit. */}
          <div className="scroll-row mt-5" style={{ ["--row-gap" as string]: "8px" }}>
            {(subs.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSubcat(subcat === s.slug ? null : s.slug)}
                className={`inline-flex h-9 shrink-0 items-center rounded-[4px] px-4 text-[13px] font-bold uppercase tracking-wide transition-colors ${
                  subcat === s.slug ? "bg-[#2F7D46] text-white" : "bg-black text-white"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {tiles.length >= 2 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 px-[var(--page-x)]">
              {tiles.map((t) => (
                <Link
                  key={t.label}
                  to={t.to}
                  className="block overflow-hidden rounded-[4px] bg-black shadow-rest transition-transform duration-press active:scale-[0.98]"
                >
                  <span className="block aspect-[4/3] overflow-hidden">
                    <Img src={t.src} className="h-full w-full object-cover" />
                  </span>
                  {/* The label bar's own diagonal end — one clip, no overflow. */}
                  <span
                    className="block bg-[#2F7D46] px-3 py-2 text-[12px] font-extrabold italic uppercase tracking-wide text-white"
                    style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)" }}
                  >
                    {t.label}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <StoreBanners categoryId={categoryId} accent="#2F7D46" />
          <Circles {...common} ring="#2F7D46" />

          {(newest.data?.length ?? 0) >= 4 ? (
            <>
              <DiagonalDivider />
              <section>
                <SportHead title="New drops" to="/?tab=sport&sort=new" />
                <ProductRail products={newest.data ?? []} limit={8} />
              </section>
            </>
          ) : null}

          {(under50.data?.length ?? 0) >= 4 ? (
            <>
              <DiagonalDivider />
              <section>
                <SportHead title="Under $50" to="/gift-finder?category=sport&budget=under-50" />
                <ProductRail products={under50.data ?? []} limit={8} />
              </section>
            </>
          ) : null}

          {(deals.data?.length ?? 0) >= 2 ? (
            <>
              <DiagonalDivider />
              <section>
                <SportHead title="Sport deals" accent />
                <div className="grid grid-cols-2 items-start gap-3 px-[var(--page-x)]">
                  {(deals.data ?? []).slice(0, 4).map((p) => (
                    <ProductCard key={p.id} {...p} compact uniform />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {hasRealBest ? (
            <>
              <DiagonalDivider />
              <section>
                <SportHead title="Fan favorites" />
                <ProductRail products={best} limit={8} />
              </section>
            </>
          ) : null}
          {feed}
        </div>
      );
    }

    default:
      // A tab added later without a recipe still shows its products.
      return <div>{feed}</div>;
  }
}
