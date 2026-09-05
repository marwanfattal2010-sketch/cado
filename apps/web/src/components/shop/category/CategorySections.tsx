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
  /*
   * FASHION'S HEADING, EXACTLY — 22px / 700 / near-black, with a 15px
   * semibold ink link. It was 16px / 800 with a 12px UNDERLINED "See all" in
   * the tab's accent, which meant nine tabs carried headings a third smaller
   * than Fashion's and each in a different colour. Swiping across the tab
   * strip, the section titles changed size and hue every time.
   *
   * `theme` is still taken and still ignored, for the same reason `accent()`
   * kept its parameter through the last migration: a signature change here
   * touches every call site at once, and a half-finished migration is exactly
   * how one tab keeps its old look.
   */
  void theme;
  const seeAll = "shrink-0 text-[15px] font-semibold text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {onSeeAll ? (
        <button type="button" onClick={onSeeAll} className={seeAll}>
          See all
        </button>
      ) : to ? (
        <Link to={to} className={seeAll}>
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


/**
 * A filter entry point renders as a LINK or as a BUTTON, depending on the tab.
 *
 * On a tab whose own grid is filterable, tapping a circle or a chip must
 * narrow that grid and scroll to it — never navigate. On every other tab the
 * same control still links to /browse. One component, one set of styles, and
 * the only difference is what the tap does.
 */
export type ApplyFilter = ((patch: Record<string, unknown>) => void) | undefined;

function FilterEntry({
  apply,
  patch,
  to,
  className,
  children,
}: {
  apply: ApplyFilter;
  patch: Record<string, unknown>;
  to: string;
  className: string;
  children: React.ReactNode;
}) {
  if (apply) {
    return (
      <button type="button" onClick={() => apply(patch)} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export type CircleItem = { id: string; slug: string; name: string; photo: string | null };

export function SubcategoryCircles({
  circles,
  theme,
  cat,
  apply,
}: {
  circles: CircleItem[];
  theme: CategoryTheme;
  cat: string;
  apply?: ApplyFilter;
}) {
  // Two is the floor: a "Shop by category" row with one circle in it is not a
  // choice, it is a heading with a picture under it.
  if (circles.length < 2) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shop by category" theme={theme} />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "14px" }}>
        {circles.map((c) => (
          <FilterEntry
            key={c.id}
            apply={apply}
            patch={{ type: [c.slug] }}
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
          </FilterEntry>
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

/**
 * Two rows of five. Ten shops is a real choice; more than that belongs on the
 * stores page, which the heading links to.
 */
const MAX_STORES = 10;

export function StoresRow({
  categoryName,
  stores,
  theme,
  cat,
  swipe = false,
}: {
  categoryName: string;
  stores: StoreItem[];
  theme: CategoryTheme;
  cat?: string;
  /**
   * A swipeable rail instead of a wrapping grid.
   *
   * The grid caps at ten and simply stops; a rail reaches every shop in the
   * category by swiping, which is what a category with more shops than fit
   * needs. `See all` still goes to the full page for the ones who would
   * rather scan than swipe.
   */
  swipe?: boolean;
}) {
  // Rendered with whatever exists, even one or two — the section is never
  // hidden for being short, and it is never padded with unrelated shops.
  if (stores.length === 0) return null;
  return (
    <section>
      <TabSectionHead
        title={`Stores in ${categoryName}`}
        theme={theme}
        to={swipe && cat ? `/stores/${cat}` : stores.length > MAX_STORES ? "/stores" : undefined}
      />
      {/*
        A WRAPPING GRID by default, a rail where the tab asks for one.
        As a rail it once showed five and clipped the sixth against the right
        edge — that was a missing trailing gutter, which `.scroll-row` now
        provides along with the leading one, so a rail reaches every shop
        without cutting the last in half.
      */}
      <div
        className={
          swipe
            ? "scroll-row -mx-[var(--page-x)]"
            : "grid grid-cols-5 gap-x-2 gap-y-4"
        }
        style={swipe ? ({ ["--row-gap" as string]: "12px" } as React.CSSProperties) : undefined}
      >
        {(swipe ? stores : stores.slice(0, MAX_STORES)).map((s) => {
          // The shop's own photograph first, its logo only if it has no
          // photo, and no lettered fallback at all — see StoreMark.
          const art = s.cover_image_url ?? s.logo_url;
          const clean = s.name.replace(/\[.*?\]\s*/g, "");
          return (
            <Link
              key={s.id}
              to={storePath(s)}
              className={`flex min-w-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96] ${
                swipe ? "w-[62px] shrink-0" : ""
              }`}
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
 * SIX, IN TWO ROWS OF THREE. Nobody reads eleven.
 *
 * Chocolate was showing eleven chips and Jewelry five, for no reason a shopper
 * could see — the row simply printed whatever had stock. Six is a block you
 * can take in at a glance, and the rest are one tap away behind "See all
 * occasions", which opens the Occasion facet on the results page.
 *
 * The six are chosen by real product count, not by hand, so no tab needs its
 * own list and the block cannot drift out of step with the catalogue.
 */
const MAX_OCCASION_CHIPS = 6;

/**
 * Occasions that lead their category regardless of count.
 *
 * Birthday leads everywhere it has stock because it is what most people are
 * actually shopping for. "Visiting someone" is second on Chocolate and Flowers
 * because that is what those two categories are bought for in Lebanon — you
 * arrive at a house with chocolate or flowers — and a pure count sort buried it
 * under Anniversary.
 */
const PINNED: Record<string, string[]> = {
  chocolate: ["birthday", "visiting-someone"],
  "flowers-gifts": ["birthday", "visiting-someone"],
};
const DEFAULT_PINNED = ["birthday"];

export function OccasionChips({
  sections,
  theme,
  cat,
  apply,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  cat: string;
  apply?: ApplyFilter;
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
  const pinned = PINNED[cat] ?? DEFAULT_PINNED;
  /*
   * A chip whose count equals the whole category narrows nothing, so it is
   * normally dropped — that is why Birthday disappeared from most tabs, being
   * a plausible occasion for almost any gift.
   *
   * The pinned ones are exempt, on instruction: Birthday leads the block
   * wherever it has stock. It is a real, correct destination even when it
   * matches everything, and a shopper looking for the birthday chip and not
   * finding it is worse than a chip that happens to be broad.
   */
  const withStock = CHIP_OCCASIONS.filter((o) => {
    const n = sections.occasions.get(o.value) ?? 0;
    return n > 0 && (n < total || pinned.includes(o.value));
  }).sort((a, b) => (sections.occasions.get(b.value) ?? 0) - (sections.occasions.get(a.value) ?? 0));

  const lead = pinned
    .map((v) => withStock.find((o) => o.value === v))
    .filter(Boolean) as typeof withStock;
  const chips = [...lead, ...withStock.filter((o) => !pinned.includes(o.value))].slice(
    0,
    MAX_OCCASION_CHIPS
  );

  // One real occasion is still a real shortcut; only an empty row goes.
  if (chips.length === 0) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shopping for an occasion?" theme={theme} />
      {/* Two rows of three. A fixed grid, so every tab's block is the same
          shape and the chips cannot reflow into a ragged four-and-two. */}
      <div className="grid grid-cols-3 gap-2">
        {/* Real links to the results page, not in-page filters. Tapping one
            takes you somewhere that can say what you are looking at and can
            hold a second selection alongside it. */}
        {chips.map((o) => (
          <FilterEntry
            key={o.value}
            apply={apply}
            patch={{ occasion: [o.value] }}
            to={browseHref(cat, { occasion: [o.value] })}
            className="flex h-9 items-center justify-center rounded-pill border border-ink/[0.12] bg-canvas px-2 text-[12px] font-medium leading-tight text-ink transition-transform duration-press ease-out active:scale-[0.97]"
          >
            <span className="truncate">{o.label}</span>
          </FilterEntry>
        ))}
      </div>
      {withStock.length > chips.length ? (
        <Link
          to={`${browseHref(cat)}&facet=occasion`}
          className="mt-3 inline-block text-caption font-semibold text-persimmon"
        >
          See all occasions →
        </Link>
      ) : null}
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
  apply,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  cat: string;
  /** A real product photo for that recipient, or null. */
  photoFor: (value: string) => string | null;
  apply?: ApplyFilter;
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
          <FilterEntry
            key={r.value}
            apply={apply}
            patch={{ for: [r.value] }}
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
          </FilterEntry>
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
  fullCards = false,
}: {
  title: string;
  products: FeedProduct[];
  theme: CategoryTheme;
  seeAllHref?: string;
  /**
   * The REAL card, at rail size, instead of the strip's own cut-down markup.
   *
   * The bespoke version showed a photo, a title and a price and dropped the
   * store name and the delivery line — the two things that actually separate
   * two similar bouquets. Passing the shared card keeps every row on the page
   * saying the same things in the same order, and gets the card's own fixed
   * text box, so nothing in it clips.
   */
  fullCards?: boolean;
}) {
  if (products.length < MIN_STRIP) return null;
  return (
    <section>
      <TabSectionHead title={title} theme={theme} to={seeAllHref} />
      {/* Every card the same width and the same fixed ratio, so no row is
          ever ragged. The rail carries the page gutter at both ends. */}
      <div className="scroll-row -mx-[var(--page-x)]" style={{ ["--row-gap" as string]: "10px" }}>
        {products.slice(0, 10).map((p) =>
          fullCards ? (
            <div key={p.id} className="w-[124px] shrink-0">
              <ProductCard {...p} uniform compact />
            </div>
          ) : (
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
          )
        )}
      </div>
    </section>
  );
}
