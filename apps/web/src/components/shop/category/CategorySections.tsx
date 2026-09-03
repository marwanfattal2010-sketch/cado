import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { ProductCard } from "../../ProductCard";
import { productImageUrl } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { storePath } from "../../../lib/routes";
import { OCCASIONS } from "../../../lib/filters";
import { EMPTY_FILTER, type TabFilter } from "../../../lib/tabFilter";
import { discountPercent, type TabSections } from "../../../hooks/useCategoryTab";
import { accent, type CategoryTheme } from "../../../lib/categoryTheme";
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

export type CircleItem = { id: string; name: string; photo: string | null };

export function SubcategoryCircles({
  circles,
  theme,
  onFilter,
}: {
  circles: CircleItem[];
  theme: CategoryTheme;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  // Two is the floor: a "Shop by category" row with one circle in it is not a
  // choice, it is a heading with a picture under it.
  if (circles.length < 2) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shop by category" theme={theme} />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "14px" }}>
        {circles.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onFilter({ ...EMPTY_FILTER, types: [c.id] }, true)}
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
          </button>
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
  onFilter,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  if (sections.deals.length < 4) return null;
  return (
    <TabCard>
      <TabSectionHead
        title="Super deals"
        theme={theme}
        onSeeAll={() => onFilter({ ...EMPTY_FILTER, onSale: true }, true)}
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

export function StoresRow({
  categoryName,
  stores,
  theme,
}: {
  categoryName: string;
  stores: StoreItem[];
  theme: CategoryTheme;
}) {
  if (stores.length === 0) return null;
  return (
    <section>
      <TabSectionHead title={`Stores in ${categoryName}`} theme={theme} to="/stores" />
      <div className="scroll-row -mx-[var(--page-x)] px-[var(--page-x)]" style={{ ["--row-gap" as string]: "16px" }}>
        {stores.slice(0, 5).map((s) => {
          const art = s.logo_url ?? s.cover_image_url;
          const clean = s.name.replace(/\[.*?\]\s*/g, "");
          return (
            <Link
              key={s.id}
              to={storePath(s)}
              className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
            >
              {/*
                48px whether it holds a picture or two letters. The old row
                used a 58px circle and dropped initials into it when a shop
                had no logo, which is 25 of the 27 shops — a screen of large
                empty rings. Smaller, and the same size for both, reads as a
                deliberate mark rather than a missing image.
              */}
              <span
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-pill border border-line bg-white"
                style={art ? undefined : { background: accent(theme, 0.1) }}
              >
                {art ? (
                  <Img
                    src={art}
                    className={s.logo_url ? "h-full w-full object-contain p-1" : "h-full w-full object-cover"}
                  />
                ) : (
                  <span className="text-[13px] font-black" style={{ color: accent(theme) }}>
                    {clean.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-ink">
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

/** Four to six. More than six and it stops being a shortlist. */
const MAX_CHIPS = 6;
const MIN_CHIPS = 3;

export function OccasionChips({
  sections,
  theme,
  active,
  onFilter,
}: {
  sections: TabSections;
  theme: CategoryTheme;
  active: string[];
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const chips = OCCASIONS.filter((o) => (sections.occasions.get(o.value) ?? 0) > 0)
    .sort((a, b) => (sections.occasions.get(b.value) ?? 0) - (sections.occasions.get(a.value) ?? 0))
    .slice(0, MAX_CHIPS);

  // Under three the row is not a choice worth making, so the section goes.
  if (chips.length < MIN_CHIPS) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shopping for an occasion?" theme={theme} />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "8px" }}>
        {chips.map((o) => {
          const on = active.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() =>
                onFilter(on ? EMPTY_FILTER : { ...EMPTY_FILTER, occasions: [o.value] }, true)
              }
              className="flex h-9 shrink-0 items-center rounded-pill border px-3.5 text-[13px] font-medium transition-colors"
              style={
                on
                  ? { borderColor: accent(theme), background: accent(theme, 0.1), color: accent(theme) }
                  : { borderColor: accent(theme, 0.35), color: "rgb(var(--ink))" }
              }
            >
              {o.label}
            </button>
          );
        })}
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
