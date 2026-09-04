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

  /** Only occasions this tab can actually serve, in the brief's order. */
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
    const counts = new Map<string, number>();
    for (const p of all) for (const o of p.occasion_tags ?? []) counts.set(o, (counts.get(o) ?? 0) + 1);
    return ORDER.filter((v) => (counts.get(v) ?? 0) > 0).map((v) => ({
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
        art: s.cover_image_url ?? s.logo_url,
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
          <div className="scroll-row" style={{ ["--row-gap" as string]: "16px" }}>
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
          <Link
            to={`${browseHref(slug)}&facet=occasion`}
            className="mt-3 block text-center text-[13px] font-semibold"
            style={{ color: ROSE }}
          >
            See all occasions →
          </Link>
        </section>
      ) : null}

      {/* 3 — Shop by flower */}
      {flowers.length ? (
        <section className="pt-5">
          <H>Shop by flower</H>
          <div className="scroll-row" style={{ ["--row-gap" as string]: "9px" }}>
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
          <div className="scroll-row -mx-3.5 px-3.5" style={{ ["--row-gap" as string]: "16px" }}>
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
          <div className="scroll-row -mx-3.5 px-3.5" style={{ ["--row-gap" as string]: "11px" }}>
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

      {/* 9 — florists, small and last */}
      {florists.length ? (
        <section className="pb-4 pt-5">
          <div className="flex items-baseline justify-between gap-3 px-[var(--page-x)] pb-3">
            <h2 className="font-hero text-[19px] font-normal text-ink">Florists on CADO</h2>
            <Link to={`/stores/${slug}`} className="text-[13px] font-semibold" style={{ color: ROSE }}>
              See all {florists.length}
            </Link>
          </div>
          <div className="scroll-row" style={{ ["--row-gap" as string]: "16px" }}>
            {florists.map((f) => (
              <Link key={f.id} to={storePath({ slug: f.slug })} className="w-[56px] shrink-0 text-center">
                <span className="block h-[56px] w-[56px] overflow-hidden rounded-pill bg-[#E7D8DB]">
                  {f.art ? <Img src={f.art} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="mt-1.5 line-clamp-2 block min-h-[26px] break-words text-[10.5px] leading-tight text-[#5a544e]">
                  {f.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
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
