import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { ProductCard } from "../../ProductCard";
import { productImageUrl } from "../../../lib/images";
import { formatMoney } from "../../../lib/money";
import { storePath } from "../../../lib/routes";
import { OCCASIONS, RECIPIENTS } from "../../../lib/filters";
import { deliveryWord } from "../../../lib/deliveryPromise";
import { EMPTY_FILTER, type TabFilter } from "../../../lib/tabFilter";
import { MIN_SECTION, discountPercent, pickPhotoProduct, type TabSections } from "../../../hooks/useCategoryTab";
import type { FeedProduct } from "../../../lib/browse";

/**
 * The sections of a category tab (spec 2.0–2.10).
 *
 * ONE template for every tab. Tabs differ by their photos, their
 * subcategories and their products — never by colour, never by layout. The
 * persimmon is the only accent on the page; the one green is the delivery
 * promise, and it appears nowhere else.
 *
 * EVERY SECTION HERE HIDES ITSELF when it cannot be filled honestly. That is
 * not defensive coding, it is the spec: a "Super Deals" heading over two
 * items, or a "Best sellers" over products nobody has bought, is the exact
 * thing this rebuild exists to remove. The page gets shorter, never faker.
 */

/** Section heading for category tabs: Nunito, sentence case, no serif (2.1). */
export function TabSectionHead({
  title,
  subtitle,
  onSeeAll,
  to,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  to?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 pb-2">
      <div className="min-w-0">
        <h2 className="font-hero text-[16px] font-extrabold leading-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p> : null}
      </div>
      {onSeeAll ? (
        <button
          type="button"
          onClick={onSeeAll}
          className="tap-44 shrink-0 text-[12px] font-semibold text-persimmon underline underline-offset-4"
        >
          See all
        </button>
      ) : to ? (
        <Link
          to={to}
          className="tap-44 shrink-0 text-[12px] font-semibold text-persimmon underline underline-offset-4"
        >
          See all
        </Link>
      ) : null}
    </div>
  );
}

/** The white card every section sits in — 12px padding, 12px radius (2.1). */
export function TabCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[12px] bg-surface p-3">{children}</section>;
}

function primaryPhoto(p: FeedProduct | null | undefined) {
  if (!p) return null;
  const imgs = p.product_images ?? [];
  const path = (imgs.find((i) => i.is_primary) ?? imgs[0])?.storage_path;
  return path ? productImageUrl(path) : null;
}

/* -------------------------------------------------------------------------- */
/* 2.2 — Hero: an offer carousel, not a store ad                              */
/* -------------------------------------------------------------------------- */

export function TabHero({
  categoryName,
  sections,
  onFilter,
}: {
  categoryName: string;
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const slides = useMemo(() => {
    const out: {
      key: string;
      photo: string | null;
      headline: string;
      sub?: string;
      chips?: { label: string; max: number }[];
      cta: string;
      apply: TabFilter;
    }[] = [];

    // Slide 1 — the promise. Its photo is a real product from THIS tab, and
    // each later slide takes a DIFFERENT one so no tab shows the same image
    // twice in its own hero.
    const used = new Set<string>();
    const take = (pool: FeedProduct[]) => {
      const p = pool.find((x) => !used.has(x.id) && (x.product_images?.length ?? 0) > 0);
      if (p) used.add(p.id);
      return p ?? null;
    };

    out.push({
      key: "promise",
      photo: primaryPhoto(take(sections.all)),
      headline: `${categoryName} at their door tonight`,
      sub: "Order by 9pm · same-day in Lebanon",
      chips: sections.tiers.map((t) => ({ label: t.label, max: t.max })),
      cta: "Shop now",
      apply: EMPTY_FILTER,
    });

    if (sections.giftReady.length >= MIN_SECTION) {
      out.push({
        key: "gift-ready",
        photo: primaryPhoto(take(sections.giftReady)),
        headline: "Ready to gift — boxed and wrapped",
        sub: "Nothing to do but sign the card",
        cta: "See gift-ready",
        apply: { ...EMPTY_FILTER, giftReady: true },
      });
    }

    // Slide 3 only exists when the discounts are real and there are enough of
    // them to be a section (2.2). Otherwise the carousel is two slides.
    if (sections.deals.length >= MIN_SECTION) {
      out.push({
        key: "deals",
        photo: primaryPhoto(take(sections.deals)),
        headline: `Up to ${sections.maxDiscount}% off ${categoryName.toLowerCase()}`,
        sub: "Real reductions, while stock lasts",
        cta: "See deals",
        apply: { ...EMPTY_FILTER, onSale: true },
      });
    }
    return out;
  }, [categoryName, sections]);

  if (slides.length === 0) return null;

  return (
    <div
      style={{ touchAction: "pan-x" }}
      className="scroll-row pt-2"
    >
      {slides.map((s) => (
        /* A div, not a button. The price chips inside are their own entry
           points — "Under $50" has to filter to under $50, not to whatever
           the slide does — and a button inside a button is invalid HTML that
           browsers resolve by dropping one of them. */
        <div
          key={s.key}
          role="button"
          tabIndex={0}
          onClick={() => onFilter(s.apply, true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onFilter(s.apply, true);
          }}
          className="relative block h-[190px] w-[318px] shrink-0 cursor-pointer overflow-hidden rounded-[16px] text-left transition-transform duration-press ease-out active:scale-[0.98]"
        >
          {s.photo ? (
            <Img src={s.photo} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 bg-persimmon" />
          )}
          {/* The dark gradient the spec asks for, so the type is legible on
              any photo without dimming the whole image. */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(21,18,16,.85) 0%, rgba(21,18,16,.35) 45%, rgba(21,18,16,0) 75%)" }}
          />
          <span className="absolute inset-x-0 bottom-0 block p-3.5">
            <span className="block font-hero text-[21px] font-black leading-[1.05] text-white">
              {s.headline}
            </span>
            {s.sub ? (
              <span className="mt-1 block text-[12px] font-bold text-white/85">{s.sub}</span>
            ) : null}
            {s.chips?.length ? (
              <span className="mt-2 flex gap-1.5">
                {s.chips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilter({ ...EMPTY_FILTER, priceMax: [c.max] }, true);
                    }}
                    className="rounded-pill bg-white/20 px-2 py-[3px] text-[11px] font-bold text-white backdrop-blur"
                  >
                    {c.label}
                  </button>
                ))}
              </span>
            ) : null}
            <span className="mt-2.5 inline-flex items-center rounded-pill bg-persimmon px-4 py-1.5 text-[13px] font-black text-white">
              {s.cta}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.3 — Gift for…                                                            */
/* -------------------------------------------------------------------------- */

/** Spec order, mapped onto the recipient_tags that really exist. */
const RECIPIENT_ORDER = ["her", "him", "mother", "father", "child", "partner", "friend"];
const SHORT_LABEL: Record<string, string> = {
  her: "Her",
  him: "Him",
  mother: "Mom",
  father: "Dad",
  child: "Kids",
  partner: "Partner",
  friend: "Friend",
};

export function GiftForRow({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const tiles = RECIPIENT_ORDER.map((value) => {
    const count = sections.recipients.get(value) ?? 0;
    if (count < MIN_SECTION) return null;
    // The tile photo is a real product from THIS tab tagged for this person —
    // a necklace for Her on Jewelry, a football for Him on Sport. The old
    // balloon/beach/tulip stock images are not used on category tabs.
    const product = pickPhotoProduct(
      sections.all.filter((p) => (p.recipient_tags ?? []).includes(value))
    );
    return {
      value,
      label: SHORT_LABEL[value] ?? RECIPIENTS.find((r) => r.value === value)?.label ?? value,
      photo: primaryPhoto(product),
    };
  }).filter(Boolean) as { value: string; label: string; photo: string | null }[];

  if (tiles.length === 0) return null;

  return (
    <TabCard>
      <TabSectionHead title="Gift for…" />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "12px" }}>
        {tiles.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onFilter({ ...EMPTY_FILTER, recipients: [t.value] }, true)}
            className="flex w-[58px] shrink-0 flex-col items-center gap-1 transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[58px] w-[58px] overflow-hidden rounded-[14px] bg-surface-sunk">
              {t.photo ? <Img src={t.photo} className="h-full w-full object-cover" /> : null}
            </span>
            <span className="text-[12px] font-medium leading-tight text-ink">{t.label}</span>
          </button>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.4 — Quick tiles                                                          */
/* -------------------------------------------------------------------------- */

export function QuickTiles({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  /**
   * FIVE TILES, THE SAME FIVE ON EVERY TAB (2.4). Women / Men / For Her /
   * Training / Ages 9+ / Heels & Sandals are gone from here — they are Shop
   * by category and Gift for… , and a tile that repeats a section two rows
   * below is the duplication this spec set out to delete.
   */
  const tiles = [
    { key: "new", label: "New In", pool: sections.newArrivals, apply: { ...EMPTY_FILTER } },
    {
      key: "best",
      label: sections.bestSellersAreReal ? "Best Sellers" : "Store picks",
      pool: sections.bestSellers,
      apply: { ...EMPTY_FILTER },
    },
    sections.tier
      ? {
          key: "tier",
          label: sections.tier.label,
          pool: sections.all.filter((p) => p.price < sections.tier!.max),
          apply: { ...EMPTY_FILTER, priceMax: [sections.tier.max] },
        }
      : null,
    sections.giftReady.length >= MIN_SECTION
      ? {
          key: "gift",
          label: "Ready to gift",
          pool: sections.giftReady,
          apply: { ...EMPTY_FILTER, giftReady: true },
        }
      : null,
    sections.deals.length >= MIN_SECTION
      ? {
          key: "deals",
          label: "Deals",
          pool: sections.deals,
          apply: { ...EMPTY_FILTER, onSale: true },
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    pool: FeedProduct[];
    apply: TabFilter;
  }[];

  const usable = tiles.filter((t) => t.pool.length > 0);
  if (usable.length === 0) return null;

  return (
    <div className="scroll-row" style={{ ["--row-gap" as string]: "8px" }}>
      {usable.map((t) => {
        const photo = primaryPhoto(pickPhotoProduct(t.pool));
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onFilter(t.apply, true)}
            className="relative block h-[128px] w-[112px] shrink-0 overflow-hidden rounded-[8px] transition-transform duration-press ease-out active:scale-[0.97]"
          >
            {photo ? (
              <Img src={photo} className="absolute inset-x-0 top-0 h-[96px] w-full object-cover" />
            ) : (
              <span aria-hidden className="absolute inset-x-0 top-0 h-[96px] bg-persimmon/15" />
            )}
            <span className="absolute inset-x-0 bottom-0 flex h-[32px] items-center justify-center bg-persimmon px-1.5 text-[13px] font-bold leading-none text-white">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.5 — Shop by category                                                     */
/* -------------------------------------------------------------------------- */

export function SubcategoryCircles({
  sections,
  subcategories,
  onFilter,
}: {
  sections: TabSections;
  subcategories: { id: string; name: string }[];
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const shown = subcategories
    .map((s) => ({
      ...s,
      count: sections.subcategories.get(s.id) ?? 0,
      photo: primaryPhoto(pickPhotoProduct(sections.all.filter((p) => p.subcategory_id === s.id))),
    }))
    .filter((s) => s.count >= MIN_SECTION);

  if (shown.length === 0) return null;

  return (
    <TabCard>
      <TabSectionHead title="Shop by category" />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "12px" }}>
        {shown.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onFilter({ ...EMPTY_FILTER, types: [s.id] }, true)}
            className="flex w-[58px] shrink-0 flex-col items-center gap-1 transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[58px] w-[58px] overflow-hidden rounded-pill bg-surface-sunk">
              {s.photo ? <Img src={s.photo} className="h-full w-full object-cover" /> : null}
            </span>
            <span className="line-clamp-2 text-center text-[12px] font-medium leading-tight text-ink">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.6 — Stores in {Category}                                                 */
/* -------------------------------------------------------------------------- */

export function TabStoresRow({
  categoryName,
  stores,
}: {
  categoryName: string;
  stores: { id: string; name: string; slug: string | null; logo_url: string | null }[];
}) {
  if (stores.length === 0) return null;
  return (
    <TabCard>
      <TabSectionHead title={`Stores in ${categoryName}`} to="/stores" />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "12px" }}>
        {stores.map((s) => (
          <Link
            key={s.id}
            to={storePath(s)}
            className="flex w-[58px] shrink-0 flex-col items-center gap-1 transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-pill border border-line bg-white">
              {s.logo_url ? (
                /* The real logo file, CONTAINED. A logo cropped to fill a
                   circle is the pixelated blown-up mark 2.6 deletes. */
                <Img src={s.logo_url} className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-[13px] font-black text-persimmon">
                  {s.name.replace(/\[.*?\]\s*/g, "").slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            {/* Never truncated (2.6): two lines, and the name wraps. */}
            <span className="line-clamp-2 text-center text-[12px] font-medium leading-tight text-ink">
              {s.name}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.8 — Super Deals, New Arrivals, Best Sellers                              */
/* -------------------------------------------------------------------------- */

export function SuperDeals({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  if (sections.deals.length < MIN_SECTION) return null;
  return (
    <TabCard>
      <TabSectionHead
        title="Super deals"
        onSeeAll={() => onFilter({ ...EMPTY_FILTER, onSale: true }, true)}
      />
      <div className="grid grid-cols-4 gap-2">
        {sections.deals.slice(0, 4).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="block">
            <span className="relative block aspect-square overflow-hidden rounded-[8px] bg-surface-sunk">
              <Img src={primaryPhoto(p)} className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded-[4px] bg-persimmon px-1 py-[1px] text-[10px] font-black text-white">
                -{discountPercent(p)}%
              </span>
            </span>
            <span className="mt-1 block text-[13px] font-bold leading-none text-persimmon">
              {formatMoney(p.price)}
            </span>
            <span className="block text-[11px] leading-none text-muted line-through">
              {formatMoney(p.compare_at_price!)}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

export function ArrivalsAndBest({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const best = sections.bestSellers.slice(0, 2);
  const fresh = sections.newArrivals.slice(0, 2);
  if (fresh.length < 2 && best.length < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {fresh.length >= 2 ? (
        <MiniCard
          title="New arrivals"
          products={fresh}
          onSeeAll={() => onFilter(EMPTY_FILTER, true)}
        />
      ) : null}
      {best.length >= 2 ? (
        <MiniCard
          /* "Best sellers" is a claim about orders. Below four ordered
             products it becomes "Store picks" and shows what owners actually
             ticked — real curation, never invented rankings. */
          title={sections.bestSellersAreReal ? "Best sellers" : "Store picks"}
          products={best}
          onSeeAll={() => onFilter(EMPTY_FILTER, true)}
        />
      ) : null}
    </div>
  );
}

function MiniCard({
  title,
  products,
  onSeeAll,
}: {
  title: string;
  products: FeedProduct[];
  onSeeAll: () => void;
}) {
  return (
    <TabCard>
      <button
        type="button"
        onClick={onSeeAll}
        className="mb-2 flex w-full items-center justify-between gap-1 text-left"
      >
        <span className="font-hero text-[15px] font-extrabold leading-tight text-ink">{title}</span>
        <span aria-hidden className="text-[13px] text-persimmon">›</span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        {products.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="block">
            <span className="block aspect-square overflow-hidden rounded-[8px] bg-surface-sunk">
              <Img src={primaryPhoto(p)} className="h-full w-full object-cover" />
            </span>
            <span className="mt-1 block text-[12px] font-bold leading-none text-ink">
              {formatMoney(p.price)}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.9 — Ready to gift                                                        */
/* -------------------------------------------------------------------------- */

export function ReadyToGift({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  if (sections.giftReady.length < MIN_SECTION) return null;
  return (
    <TabCard>
      <TabSectionHead
        title="Ready to gift"
        subtitle="Boxed and wrapped — nothing to do but sign the card"
        onSeeAll={() => onFilter({ ...EMPTY_FILTER, giftReady: true }, true)}
      />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "8px" }}>
        {sections.giftReady.slice(0, 10).map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="block w-[130px] shrink-0">
            <span className="block aspect-square overflow-hidden rounded-[8px] bg-surface-sunk">
              <Img src={primaryPhoto(p)} className="h-full w-full object-cover" />
            </span>
            <span className="mt-1 block truncate text-[12px] leading-tight text-ink">{p.title}</span>
            <span className="block text-[13px] font-bold leading-none text-ink">
              {formatMoney(p.price)}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[11px] font-medium leading-none text-today">
              <span aria-hidden>🚚</span>
              {deliveryWord()}
              {p.gift_wrap_available ? (
                <span className="ml-1 rounded-[4px] bg-surface-sunk px-1 py-[2px] text-[10px] text-muted">
                  Gift wrap
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.10 — Occasion chips (secondary on a category tab)                        */
/* -------------------------------------------------------------------------- */

export function OccasionChips({
  sections,
  onFilter,
}: {
  sections: TabSections;
  onFilter: (f: TabFilter, scroll?: boolean) => void;
}) {
  const chips = OCCASIONS.filter((o) => (sections.occasions.get(o.value) ?? 0) >= MIN_SECTION);
  if (chips.length === 0) return null;
  return (
    <TabCard>
      <TabSectionHead title="Shopping for an occasion?" />
      <div className="scroll-row -mx-3 px-3" style={{ ["--row-gap" as string]: "8px" }}>
        {chips.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onFilter({ ...EMPTY_FILTER, occasions: [o.value] }, true)}
            className="flex h-9 shrink-0 items-center rounded-pill border border-line px-3.5 text-[13px] font-medium text-ink"
          >
            {o.label}
          </button>
        ))}
      </div>
    </TabCard>
  );
}

/* -------------------------------------------------------------------------- */
/* 2.11 — the grid                                                            */
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
