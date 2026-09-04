import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { ProductCard } from "../../ProductCard";
import { productImageUrl } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { storePath } from "../../../lib/routes";

import { browseHref } from "../../../lib/browseParams";
import { recipientLabel, RECIPIENTS } from "../../../lib/facets";
import { discountPercent, type TabSections } from "../../../hooks/useCategoryTab";
import { CHIP_OCCASIONS, accent, type CategoryTheme } from "../../../lib/categoryTheme";
import type { FeedProduct } from "../../../lib/browse";

/**
 * The sections of a category tab, in the order the page renders them.
 *
 * ONE skeleton for all ten categories. What differs is the theme — accent,
 * hero copy, tile names — and the products. Put two tabs side by side and the
 * structure is identical, which is what stops the shop feeling like ten small
 * sites stitched together.
 *
 * RHYTHM: sections alternate card / plain / card so the page has a beat
 * rather than being one unbroken column of white boxes. Shop-by-category and
 * Super deals are cards; the tall tiles and the stores row sit directly on
 * the cream. One spacing token between all of them, one title size.
 *
 * EVERY SECTION HIDES ITSELF when it cannot be filled honestly. The page gets
 * shorter, never faker.
 */

/** One title size for the whole page. Short titles only. */
export function TabSectionHead({
  title,
  theme,
  onSeeAll,
  to,
}: {
  title: string;
  theme: CategoryTheme;
  onSeeAll?: () => void;
  to?: string;
}) {
  const seeAll = "shrink-0 text-[12px] font-semibold underline underline-offset-4";
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <h2 className="font-hero text-[16px] font-extrabold leading-tight text-ink">{title}</h2>
      {onSeeAll ? (
        <button type="button" onClick={onSeeAll} className={seeAll} style={{ color: accent(theme) }}>
          See all
        </button>
      ) : to ? (
        <Link to={to} className={seeAll} style={{ color: accent(theme) }}>
          See all
        </Link>
      ) : null}
    </div>
  );
}

/** The white card. Plain sections deliberately do not use it. */
export function TabCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[12px] bg-surface p-3">{children}</section>;
}

export function primaryPhoto(p: FeedProduct | null | undefined) {
  if (!p) return null;
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  return path ? productImageUrl(path) : null;
}

/* -------------------------------------------------------------------------- */
/* 3 — Shop by category (white card)                                          */
/* -------------------------------------------------------------------------- */

export type CircleItem = { id: string; slug: string; name: string; photo: string | null };

export function SubcategoryCircles({
  circles,
  theme,
  cat,
}: {
  circles: CircleItem[];
  theme: CategoryTheme;
  cat: string;
}) {
  // Two is the floor: a "Shop by category" row with one circle in it is not a
  // choice, it is a heading with a picture under it.
  if (circles.length < 2) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shop by category" theme={theme} />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "14px" }}>
        {circles.map((c) => (
          <Link
            key={c.id}
            to={browseHref(cat, { type: [c.slug] })}
            className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[62px] w-[62px] overflow-hidden rounded-pill bg-surface-sunk">
              {c.photo ? (
                <Img src={c.photo} className="h-full w-full object-cover" />
              ) : (
                /* A neutral mark, never a photo of something else. The rule
                   is that a tile's picture must be of what the tile says. */
                <span
                  aria-hidden
                  className="flex h-full w-full items-center justify-center text-[18px]"
                  style={{ color: accent(theme) }}
                >
                  ◇
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-ink">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 — Super deals (white card, four across)                                  */
/* -------------------------------------------------------------------------- */

export function SuperDeals({
  sections,
  theme,
  cat,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  cat: string;
}) {
  if (sections.deals.length < 4) return null;
  return (
    <TabCard>
      <TabSectionHead
        title="Super deals"
        theme={theme}
        to={browseHref(cat, { tile: "deals" })}
      />
      <div className="grid grid-cols-4 gap-2">
        {sections.deals.slice(0, 4).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="block">
            <span className="relative block aspect-square overflow-hidden rounded-[8px] bg-surface-sunk">
              <Img src={primaryPhoto(p)} className="h-full w-full object-cover" />
              {/* The discount stays persimmon on every tab. A price cut is
                  the one thing that must mean the same everywhere, so it is
                  deliberately NOT re-skinned per category. */}
              <span className="absolute left-1 top-1 rounded-[4px] bg-persimmon px-1 py-[1px] text-[10px] font-black leading-none text-white">
                -{discountPercent(p)}%
              </span>
            </span>
            <span className="mt-1 block text-[12px] font-bold leading-none text-ink">
              {formatMoney(p.price)}
            </span>
            <span className="block text-[10px] leading-tight text-muted line-through">
              {formatMoney(p.compare_at_price!)}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 — Stores in {category} (PLAIN background, compact row of five)           */
/* -------------------------------------------------------------------------- */

export type StoreItem = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

/** More than this and the row keeps "See all" rather than growing forever. */
const MAX_STORES = 10;

export function StoresRow({
  categoryName,
  stores,
  theme,
}: {
  categoryName: string;
  stores: StoreItem[];
  theme: CategoryTheme;
}) {
  // Rendered with whatever exists, even one or two — the section is never
  // hidden for being short, and it is never padded with unrelated shops.
  if (stores.length === 0) return null;
  return (
    <section>
      <TabSectionHead
        title={`Stores in ${categoryName}`}
        theme={theme}
        to={stores.length > MAX_STORES ? "/stores" : undefined}
      />
      {/*
        A WRAPPING GRID, not a carousel.
        As a horizontal rail it showed five and clipped the sixth against the
        right edge, so a category with nine shops looked like it had five and
        a half. Five per row, wrapping to as many rows as it takes.
      */}
      <div className="grid grid-cols-5 gap-x-2 gap-y-4">
        {stores.slice(0, MAX_STORES).map((s) => {
          // The shop's own photograph first, its logo only if it has no
          // photo, and no lettered fallback at all — see StoreMark.
          const art = s.cover_image_url ?? s.logo_url;
          const clean = s.name.replace(/\[.*?\]\s*/g, "");
          return (
            <Link
              key={s.id}
              to={storePath(s)}
              className="flex min-w-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
            >
              {/* 56px, and it holds the shop's own photograph. No initials
                  fallback: an unphotographed shop shows an empty tint and
                  goes on the list to be shot properly. */}
              <span
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-pill border border-line bg-white"
                style={art ? undefined : { background: accent(theme, 0.1) }}
              >
                {art ? (
                  <Img
                    src={art}
                    className={
                      s.cover_image_url
                        ? "h-full w-full object-cover"
                        : "h-full w-full object-contain p-1"
                    }
                  />
                ) : null}
              </span>
              {/* Wraps to two lines and BREAKS long words rather than
                 ellipsing. "Anchor &", "Lumiere Fine..." and "Maison
                 Zahra..." were all the fixed 62px column cutting the name
                 off; the cell is fluid now and the text wraps inside it. */}
              <span className="line-clamp-2 w-full break-words text-center text-[11px] font-medium leading-tight text-ink">
                {clean}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6 — Shopping for an occasion? (white card)                                 */
/* -------------------------------------------------------------------------- */

/*
 * NO CAP. The row wraps, so there is no reason to trim it.
 *
 * It used to be a horizontal strip capped at six, which cut the last chip in
 * half against the right edge — "Valentine'…" — and hid the rest entirely.
 * Every occasion that has stock in this category is now shown, on as many
 * rows as it takes.
 */

export function OccasionChips({
  sections,
  theme,
  cat,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  cat: string;
}) {
  /*
   * A CHIP THAT MATCHES EVERYTHING IS NOT A FILTER.
   *
   * On a gift marketplace almost anything is a plausible birthday present,
   * so "Birthday" sat on every product in most categories — and it is the
   * first chip in the row, which meant the most prominent control on the
   * section did nothing at all when you tapped it.
   *
   * Dropping a chip whose count equals the category total fixes that without
   * anyone having to maintain a list: it hides itself only where it is
   * useless, stays where it genuinely narrows, and comes back on its own as
   * soon as a product arrives that does not carry it.
   */
  const total = sections.all.length;
  const chips = CHIP_OCCASIONS.filter((o) => {
    const n = sections.occasions.get(o.value) ?? 0;
    return n > 0 && n < total;
  })
    .sort((a, b) => (sections.occasions.get(b.value) ?? 0) - (sections.occasions.get(a.value) ?? 0));

  // One real occasion is still a real shortcut; only an empty row goes.
  if (chips.length === 0) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shopping for an occasion?" theme={theme} />
      {/* WRAPS. Not a scroller — every chip is fully visible. */}
      <div className="flex flex-wrap gap-2">
        {/* Real links to the results page, not in-page filters. Tapping one
            takes you somewhere that can say what you are looking at and can
            hold a second selection alongside it. */}
        {chips.map((o) => (
          <Link
            key={o.value}
            to={browseHref(cat, { occasion: [o.value] })}
            className="flex h-9 items-center rounded-pill border border-ink/[0.12] bg-canvas px-3.5 text-[13px] font-medium text-ink transition-transform duration-press ease-out active:scale-[0.97]"
          >
            {o.label}
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 7 — the grid                                                               */
/* -------------------------------------------------------------------------- */

export function TabGrid({ products }: { products: FeedProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="px-1 py-10 text-center text-[13px] text-muted">
        Nothing matches those filters yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
      {products.map((p) => (
        <ProductCard key={p.id} {...p} compact />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 — Gift for… (recipient row)                                              */
/* -------------------------------------------------------------------------- */

/** The seven the brief names, in its order. */
export function GiftForRow({
  sections,
  theme,
  cat,
  photoFor,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  cat: string;
  /** A real product photo for that recipient, or null. */
  photoFor: (value: string) => string | null;
}) {
  // Only recipients this category can actually serve. A tile that opens an
  // empty grid is worse than one fewer tile.
  const shown = RECIPIENTS.filter((r) => (sections.recipients.get(r.value) ?? 0) > 0);
  if (shown.length === 0) return null;

  return (
    <section>
      <TabSectionHead title="Gift for…" theme={theme} />
      <div className="scroll-row -mx-[var(--page-x)]" style={{ ["--row-gap" as string]: "12px" }}>
        {shown.map((r) => (
          <Link
            key={r.value}
            to={browseHref(cat, { for: [r.value] })}
            className="flex w-[66px] shrink-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[66px] w-[66px] overflow-hidden rounded-pill bg-surface-sunk">
              {photoFor(r.value) ? (
                <Img src={photoFor(r.value)} className="h-full w-full object-cover" />
              ) : null}
            </span>
            {/* The SHORT label here and the full one on a chip, both from
                the shared constant — "Him" in the circle, "For Him" on the
                chip, and they can no longer drift apart. */}
            <span className="text-center text-[11px] font-medium leading-tight text-ink">
              {recipientLabel(r.value, "short")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 7 / 8 / 9 — New arrivals, Best sellers, Ready to gift                      */
/* -------------------------------------------------------------------------- */

/**
 * A titled row of product cards.
 *
 * `MIN` is 4 on purpose: below that the row is shorter than the screen and
 * reads as a section that failed to load rather than a short list. The
 * section hides instead, and the caller reports it as hidden.
 */
const MIN_STRIP = 4;

export function ProductStrip({
  title,
  products,
  theme,
  seeAllHref,
}: {
  title: string;
  products: FeedProduct[];
  theme: CategoryTheme;
  seeAllHref?: string;
}) {
  if (products.length < MIN_STRIP) return null;
  return (
    <section>
      <TabSectionHead title={title} theme={theme} to={seeAllHref} />
      {/* Every card the same width and the same fixed ratio, so no row is
          ever ragged. The rail carries the page gutter at both ends. */}
      <div className="scroll-row -mx-[var(--page-x)]" style={{ ["--row-gap" as string]: "10px" }}>
        {products.slice(0, 10).map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="block w-[132px] shrink-0"
          >
            <span className="block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-surface-sunk">
              <Img src={primaryPhoto(p)} className="h-full w-full object-cover" />
            </span>
            <span className="mt-1.5 line-clamp-2 block h-[32px] text-[12px] leading-tight text-ink">
              {p.title}
            </span>
            <span className="mt-0.5 block text-[13px] font-bold leading-none text-ink">
              {formatMoney(p.price)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
