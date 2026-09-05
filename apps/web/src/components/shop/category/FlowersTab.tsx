import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useStores";
import { useStoreDirectory } from "../../../hooks/useCatalogue";
import { useTabSections } from "../../../hooks/useCategoryTab";
import { useHomeSignals } from "../../../hooks/useHomeEndless";
import { ProductGridSkeleton, Skeleton } from "../../Skeleton";
import { Img } from "../../Img";
import { StaggeredGrid } from "../StaggeredGrid";
import { StoreLogoCircle } from "../StoreLogoCircle";
import { storePath } from "../../../lib/routes";
import { formatMoney } from "../../../lib/money";
import { productImageUrl } from "../../../lib/images";
import { deliveryWord } from "../../../lib/deliveryPromise";
import { circleArt, flowerArt, heroArt, occasionArt, tileArt } from "../../../lib/tabArt";
import { FLOWER_TYPES, type TileId } from "../../../lib/facets";
import { OCCASIONS } from "../../../lib/filters";
import { browseHref, type Lookup } from "../../../lib/browseParams";
import type { BrowseTab, FeedProduct } from "../../../lib/browse";

/**
 * THE FLOWERS TAB — deliberately not the Fashion tab.
 *
 * Fashion is white and leads with store logos, because people recognise
 * brands. Nobody in Beirut picks a florist; they pick the bouquet. So this tab
 * keeps its cream ground, its serif headings and its rose accent, leads with
 * occasions, and puts the florists last and small.
 *
 * NO FILTERS ON THIS PAGE. Every circle, pill, tile and "See all" opens the
 * results page, which is the only place a filter lives.
 */

const ROSE = "#A64E62";

/**
 * A SHORT ROW SITS ACROSS THE CARD, NOT BUNCHED AT ITS LEFT.
 *
 * Three subcategories in a 361px row left about 150px of white to the right of
 * the last circle, which reads as a row that failed to load rather than a row
 * that is three long. At three or fewer, the items are spread — one on the
 * left edge, one centred, one on the right — and from four up the row goes
 * back to its normal left-aligned scrolling gaps.
 *
 * Written as `justify-content` on the existing `.scroll-row`, so nothing about
 * the scrolling, snapping or gutters changes: with four or more items the row
 * overflows, free space is negative and the property has nothing to do.
 * The threshold is applied per row from that row's own length, because every
 * one of them is built from real rows and any of them can come back short.
 *
 * TWO IS THE EXCEPTION. `justify-between` on a pair pins one circle to each
 * end with ~250px of nothing between them, which reads as two things that have
 * lost each other rather than as a row. `space-around` fills the same width
 * and keeps them a pair — the florist row is at two today.
 */
/** Ceiling on the florist row. Never a floor — see the row itself. */
const FLORIST_ROW_MAX = 4;

const spread = (n: number) =>
  n === 2 ? " justify-around" : n <= 3 ? " justify-between" : "";

/** Circle labels, as the brief writes them. A 70px circle has no room for "Visiting someone". */
const SHORT: Record<string, string> = {
  "visiting-someone": "Visiting",
  "get-well": "Get well",
  newborn: "New baby",
};

export function FlowersTab({ tab }: { tab: BrowseTab }) {
  const categories = useCategories();
  const slug = tab.filter.category_slug ?? "";
  const category = categories.data?.find((c) => c.slug === slug);
  const sections = useTabSections(category?.id);
  const subcategoriesQuery = useSubcategories(slug);
  const directory = useStoreDirectory();
  const signals = useHomeSignals();
  const all = sections.all;

  const lookup = useMemo<Lookup>(
    () => ({
      typeId: (s) => (subcategoriesQuery.data ?? []).find((x) => x.slug === s)?.id,
      storeId: (s) => (directory.data ?? []).find((x) => x.slug === s)?.id,
      orders: (id) => signals.data?.get(id)?.recentOrders ?? 0,
      anyOrders: () => [...(signals.data?.values() ?? [])].some((s) => s.recentOrders > 0),
    }),
    [subcategoriesQuery.data, directory.data, signals.data]
  );

  /**
   * ALL EIGHT OCCASIONS, WHETHER OR NOT THEY HAVE STOCK.
   *
   * This used to show only the ones the catalogue could serve, which rendered
   * six and hid Engagement and Graduation. Marwan wants the full set: the row
   * is the shop's menu of what CADO does, and a gap in it reads as CADO not
   * doing weddings rather than as a florist not having tagged anything yet.
   *
   * The cost, stated plainly: those two currently open a results page with no
   * products. They fill themselves the moment any florist tags a bouquet for
   * either — nothing here needs changing again.
   */
  const occasions = useMemo(() => {
    const ORDER = [
      "birthday",
      "visiting-someone",
      "get-well",
      "newborn",
      "anniversary",
      "wedding",
      "engagement",
      "graduation",
    ];
    return ORDER.map((v) => ({
      value: v,
      // "Visiting", not "Visiting someone" — the full label truncated to
      // "Visiting some…" in a 70px circle, which reads as broken.
      label: SHORT[v] ?? OCCASIONS.find((o) => o.value === v)?.label ?? v,
      photo: occasionArt(slug, v),
    }));
  }, [all, slug]);

  /** Flower-type pills — only types the catalogue actually holds. */
  const flowers = useMemo(() => {
    const have = new Set<string>();
    for (const p of all)
      for (const t of p.tags ?? []) if (t.startsWith("flower:")) have.add(t.slice(7));
    return FLOWER_TYPES.filter((t) => have.has(t.value)).map((t) => ({
      ...t,
      photo: flowerArt(t.value),
    }));
  }, [all]);

  const circles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all)
      if (p.subcategory_id) counts.set(p.subcategory_id, (counts.get(p.subcategory_id) ?? 0) + 1);
    return (subcategoriesQuery.data ?? [])
      .filter((s) => (counts.get(s.id) ?? 0) > 0)
      .map((s) => ({
        slug: s.slug,
        // "Vase" and "Dried" in a 66px circle; the full names wrap to three
        // lines and clip.
        name: s.name.replace(/^Vase arrangements$/, "Vase").replace(/^Dried & preserved$/, "Dried"),
        photo: circleArt(slug, s.slug),
      }));
  }, [subcategoriesQuery.data, all, slug]);

  const florists = useMemo(() => {
    const ids = new Set(all.map((p) => p.partner_id));
    return (directory.data ?? [])
      .filter((s) => ids.has(s.id) && s.slug)
      .map((s) => ({
        id: s.id,
        slug: s.slug as string,
        name: s.name.replace(/\[.*?\]\s*/g, ""),
        logoUrl: s.logo_url,
        // A photograph of the shop, used only when there is no mark. This is
        // the one row where that is the right call: nobody recognises a
        // florist by its logo, and a picture of the shop beats two initials.
        photoUrl: s.cover_image_url,
      }));
  }, [directory.data, all]);

  const deals = useMemo(
    () => all.filter((p) => off(p) > 0).sort((a, b) => off(b) - off(a)),
    [all]
  );
  const popular = useMemo(
    () => [...all].sort((a, b) => lookup.orders(b.id) - lookup.orders(a.id)),
    [all, lookup]
  );

  if (sections.isLoading) {
    return (
      <>
        <Skeleton className="h-[230px] w-full" />
        <div className="space-y-6 px-[var(--page-x)] pt-6">
          <ProductGridSkeleton count={4} />
        </div>
      </>
    );
  }
  if (all.length === 0) {
    return <p className="px-[var(--page-x)] py-16 text-center text-[14px] text-muted">No flowers on CADO yet.</p>;
  }

  const tiles: { id: TileId; label: string; show: boolean }[] = [
    { id: "under-50" as TileId, label: "Under $50", show: all.some((p) => Number(p.price) < 50) },
    { id: "under-100" as TileId, label: "Under $100", show: all.some((p) => Number(p.price) < 100) },
    { id: "best-picks", label: "Best picks", show: all.length > 0 },
    {
      id: "new-in",
      label: "New in",
      show: all.some((p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400000),
    },
  ];

  return (
    <div style={{ background: "#F6F2EA" }}>
      <Hero cat={slug} />

      {/* 2 — Flowers for…, the main event */}
      {occasions.length ? (
        <section className="pt-4">
          <H>Flowers for…</H>
          <div
            className={`scroll-row${spread(occasions.length)}`}
            style={{ ["--row-gap" as string]: "16px" }}
          >
            {occasions.map((o) => (
              <Link
                key={o.value}
                to={browseHref(slug, { occasion: [o.value] })}
                className="w-[70px] shrink-0 text-center transition-transform duration-press ease-out active:scale-[0.96]"
              >
                <span className="block h-[70px] w-[70px] overflow-hidden rounded-pill bg-[#E7D8DB]">
                  {o.photo ? <Img src={o.photo} className="h-full w-full object-cover" /> : null}
                </span>
                {/* Two lines before ellipsis, and the row is tall enough for
                    both — the labels used to be cut off at the row's edge. */}
                <span className="mt-1.5 line-clamp-2 block min-h-[28px] text-[11.5px] font-semibold leading-tight text-ink">
                  {o.label}
                </span>
              </Link>
            ))}
          </div>
          {/* No "See all occasions" any more: the row IS all of them, so a
              link promising more had nothing behind it. */}
        </section>
      ) : null}

      {/* 3 — Shop by flower */}
      {flowers.length ? (
        <section className="pt-5">
          <H>Shop by flower</H>
          <div
            className={`scroll-row${spread(flowers.length)}`}
            style={{ ["--row-gap" as string]: "9px" }}
          >
            {flowers.map((f) => (
              <Link
                key={f.value}
                to={browseHref(slug, { flower: [f.value] })}
                className="flex shrink-0 items-center gap-2 rounded-pill bg-white py-1.5 pl-1.5 pr-3.5 transition-transform duration-press ease-out active:scale-[0.97]"
              >
                <span className="block h-8 w-8 overflow-hidden rounded-pill bg-[#E7D8DB]">
                  {f.photo ? <Img src={f.photo} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="text-[13px] font-semibold text-ink">{f.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4 — tall tiles */}
      <section className="pt-5">
        <div className="scroll-row" style={{ ["--row-gap" as string]: "10px" }}>
          {tiles
            .filter((t) => t.show)
            .map((t) => (
              <Link
                key={t.id}
                to={tileHref(slug, t.id)}
                className="relative flex h-[200px] w-[152px] shrink-0 items-end overflow-hidden rounded-[14px] bg-[#E7D8DB] transition-transform duration-press ease-out active:scale-[0.97]"
              >
                <Img
                  src={tileArt(t.id, slug) ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span
                  className="relative z-[2] w-full py-2.5 text-center text-[15px] font-semibold text-white"
                  style={{ background: ROSE }}
                >
                  {t.label}
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* 5 — Shop by category, in a white card */}
      {circles.length ? (
        <Card>
          <CardH>Shop by category</CardH>
          <div
            className={`scroll-row${spread(circles.length)}`}
            /*
             * The negative margin has to cancel `.scroll-row`'s OWN gutter,
             * not the card's. `-mx-3.5` assumed the row was padded by the 14px
             * `px-3.5` beside it, but `.scroll-row { padding-inline:
             * var(--page-x) }` wins that and pads 16px — so the row was left
             * 2px inside the card's text column and the first circle did not
             * line up with the heading above it. Cancelling `--page-x`
             * exactly puts the row edge-to-edge with the card's content, which
             * is what "spread across the full card width" has to measure
             * against.
             */
            style={{
              ["--row-gap" as string]: "16px",
              marginInline: "calc(var(--page-x) * -1)",
            }}
          >
            {circles.map((c) => (
              <Link
                key={c.slug}
                to={browseHref(slug, { type: [c.slug] })}
                className="w-[66px] shrink-0 text-center transition-transform duration-press ease-out active:scale-[0.96]"
              >
                <span className="block h-[66px] w-[66px] overflow-hidden rounded-pill bg-[#EFE3E5]">
                  {c.photo ? <Img src={c.photo} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="mt-1.5 line-clamp-2 block min-h-[28px] text-[11.5px] font-semibold leading-tight text-ink">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {/* 6 — Super deals, in a white card */}
      {deals.length ? (
        <Card>
          <div className="flex items-baseline justify-between gap-3 pb-3.5">
            <CardH inline>Super deals</CardH>
            <Link to={browseHref(slug, { tile: "deals" })} className="text-[13px] font-semibold" style={{ color: ROSE }}>
              See all
            </Link>
          </div>
          <div
            className="scroll-row"
            /* Same 14px-vs-16px correction as the category row above. */
            style={{
              ["--row-gap" as string]: "11px",
              marginInline: "calc(var(--page-x) * -1)",
            }}
          >
            {deals.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="w-[142px] shrink-0">
                <span className="relative block aspect-[1/1.15] overflow-hidden rounded-[12px] bg-[#EFE3E5]">
                  <Img src={photoOf(p)} className="h-full w-full object-cover" />
                  <span className="absolute left-0 top-0 rounded-br-[10px] bg-persimmon px-2 py-1 text-[11px] font-extrabold leading-none text-white">
                    -{off(p)}%
                  </span>
                </span>
                <span className="mt-1.5 line-clamp-2 block h-[30px] text-[12.5px] leading-tight text-ink">
                  {p.title}
                </span>
                <span className="block text-[15px] font-extrabold text-persimmon">
                  {formatMoney(p.price)}
                  <s className="ml-1.5 text-[11.5px] font-normal text-muted">
                    {formatMoney(p.compare_at_price!)}
                  </s>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {/* 7 — Most popular (was "Top of Flowers") */}
      <section className="pt-5">
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)]">
          <H inline>Most popular</H>
          <Link to={browseHref(slug, { tile: "best-picks" })} className="text-[13px] font-semibold" style={{ color: ROSE }}>
            See all
          </Link>
        </div>
        <div className="scroll-row pt-3.5" style={{ ["--row-gap" as string]: "11px" }}>
          {popular.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className="w-[142px] shrink-0">
              <span className="relative block aspect-[1/1.2] overflow-hidden rounded-[12px] bg-[#EFE3E5]">
                <Img src={photoOf(p)} className="h-full w-full object-cover" />
                {off(p) ? (
                  <span className="absolute left-1.5 top-1.5 rounded-[5px] bg-persimmon px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{off(p)}%
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-[11px] text-muted">
                {p.partner?.name?.replace(/\[.*?\]\s*/g, "")}
              </span>
              <span className="line-clamp-2 block h-[31px] text-[13px] leading-tight text-ink">
                {p.title}
              </span>
              <span className="block text-[14.5px] font-extrabold text-ink">
                {formatMoney(p.price)}
                {off(p) ? (
                  <s className="ml-1.5 text-[11px] font-normal text-muted">
                    {formatMoney(p.compare_at_price!)}
                  </s>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[#1C7A46]">{deliveryWord()}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 8 — the florists, directly after Most popular.

          They used to sit last and small, at the very foot of the page, on the
          reasoning that nobody picks a florist — they pick the bouquet. They
          now sit here as the same logo circle Fashion uses, and they appear
          exactly ONCE on the tab: the old bottom section is gone rather than
          duplicated. */}
      {florists.length ? (
        <section className="pt-5">
          <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-3">
            <H inline>Florists on CADO</H>
            <Link to={`/stores/${slug}`} className="text-[13px] font-semibold" style={{ color: ROSE }}>
              See all {florists.length}
            </Link>
          </div>
          {/*
            UP TO FOUR, IN ONE ROW, AND NEVER PADDED.

            The row shows every florist that actually has flowers on CADO, to a
            ceiling of four. Today that is two, and two is what it shows — the
            gap is not filled with invented shops, and "See all" states the real
            number rather than the ceiling.

            Each cell is a quarter of the row whatever the count, so two shops
            do not inflate into two enormous discs; they sit at the same size
            they would at four, spaced evenly. Holds at 375px: a quarter of the
            content box is 78px, and the disc is capped at 72.
          */}
          <div className="flex justify-evenly gap-x-2 px-[var(--page-x)]">
            {florists.slice(0, FLORIST_ROW_MAX).map((f) => (
              <Link
                key={f.id}
                to={storePath({ slug: f.slug })}
                style={{ width: "calc((100% - 3 * 8px) / 4)", maxWidth: 72 }}
                className="min-w-0 text-center"
              >
                <StoreLogoCircle name={f.name} logoUrl={f.logoUrl} photoUrl={f.photoUrl} />
                <span className="mt-1.5 line-clamp-2 block min-h-[26px] break-words text-[10.5px] leading-tight text-[#5a544e]">
                  {f.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 8 — the staggered grid */}
      <section className="pt-5">
        <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-2">
          <H inline>All flowers</H>
          <Link to={browseHref(slug)} className="text-[13px] font-semibold" style={{ color: ROSE }}>
            See all {all.length} →
          </Link>
        </div>
        <StaggeredGrid products={all} tone="cream" />
      </section>

    </div>
  );
}

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

/** Two of the four tiles are price filters and have no TileId of their own. */
function tileHref(cat: string, id: TileId) {
  if ((id as string) === "under-50") return browseHref(cat, { price: ["under-50"] });
  if ((id as string) === "under-100") return browseHref(cat, { price: ["under-100"] });
  return browseHref(cat, { tile: id });
}

/** Serif, on the cream. */
function H({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <h2
      className={`font-hero text-[24px] font-normal text-ink ${inline ? "" : "px-[var(--page-x)] pb-3.5"}`}
    >
      {children}
    </h2>
  );
}

/** Serif in rose, inside a white card. */
function CardH({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <h2
      className={`font-hero text-[22px] font-normal ${inline ? "" : "pb-3.5"}`}
      style={{ color: ROSE }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-[var(--page-x)] mt-[18px] rounded-[18px] bg-white px-3.5 pb-[18px] pt-4">
      {children}
    </section>
  );
}

function Hero({ cat }: { cat: string }) {
  const [src] = heroArt(cat);
  if (!src) return null;
  return (
    <section className="relative h-[230px] overflow-hidden bg-[#B08B95]">
      <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,.45), rgba(0,0,0,0) 72%)" }}
      />
      <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
        <h1 className="mb-1.5 max-w-[250px] font-hero text-[30px] font-normal leading-[1.08] text-white">
          Flowers that
          <br />
          arrive fresh
        </h1>
        <p className="mb-4 max-w-[230px] text-[13.5px] text-white/90">
          Bouquets and plants, delivered the same day.
        </p>
        <div className="flex items-center gap-3.5">
          <Link
            to={browseHref(cat)}
            className="bg-white px-[22px] py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-ink"
          >
            Shop now
          </Link>
          {/* No box, no fill — just the words and a hairline under them. */}
          <Link
            to="/assistant"
            className="border-b border-white/60 pb-0.5 text-[12.5px] font-semibold text-white"
          >
            ✨ Let AI help me choose
          </Link>
        </div>
      </div>
    </section>
  );
}
