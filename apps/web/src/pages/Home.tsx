import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSearchProducts, useProductsByTag } from "../hooks/useProducts";
import { useSearchStores, useTopStores } from "../hooks/useStores";
import { BrandLogo } from "../components/BrandLogo";
import { CategoryChips } from "../components/CategoryChips";
import { CategoryFilterButton, CategoryInline, useCategoryBrowse } from "../components/CategoryInline";
import { GiftCardBanner } from "../components/GiftCardBanner";
import { HeroCarousel } from "../components/HeroCarousel";
import { Img } from "../components/Img";
import { ProductCard } from "../components/ProductCard";
import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { ProductGridSkeleton, ProductRowSkeleton } from "../components/Skeleton";
import { SearchIcon, GiftIcon, WrapIcon, ShieldCheckIcon, WalletIcon, TruckIcon } from "../components/Icons";
import { ButtonLink, ChipLink } from "../components/ui";
import { BUDGETS, OCCASIONS, RECIPIENTS } from "../lib/filters";
import { BENEFITS, PARTNER_EMAIL, PARTNER_WHATSAPP_NUMBER } from "./Partners";

/**
 * A carousel with two products in it looks broken, and padding it out with
 * repeats or invented items is worse. Anything below this simply doesn't
 * render.
 */
const MIN_SECTION_ITEMS = 4;

/** Long enough to read as a deliberate swap, short enough that it never
 *  feels like waiting. Matched by the inline transition duration below. */
const SWAP_MS = 170;

const HOW_IT_WORKS = [
  { Icon: GiftIcon, label: "Pick a gift" },
  { Icon: WrapIcon, label: "We wrap it free" },
  { Icon: TruckIcon, label: "Delivered today" },
];

const TRUST = [
  { Icon: ShieldCheckIcon, label: "Verified Lebanese stores" },
  { Icon: WalletIcon, label: "Pay on delivery" },
  { Icon: WrapIcon, label: "Free wrapping" },
];

function SectionHead({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-3">
      <h2 className="font-display text-h2">{title}</h2>
      {to ? (
        <Link
          to={to}
          className="tap-44 shrink-0 pb-0.5 text-caption font-medium text-ink underline underline-offset-4"
        >
          See all
        </Link>
      ) : null}
    </div>
  );
}

/** A 44px footer row. These are genuinely taller rather than using .tap-44:
 *  the rows are stacked, so invisible overlays would overlap their
 *  neighbours and start stealing each other's taps. */
function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-[44px] items-center">
      {children}
    </Link>
  );
}

/**
 * A photo card in the occasion / recipient rails. One component so the two
 * rows are visibly the same kind of thing — that was the point of bringing
 * the occasion cards back: the text pills that replaced them read as a
 * different, lesser control.
 */
function PhotoCard({ to, img, label }: { to: string; img: string; label: string }) {
  return (
    <Link
      to={to}
      className="relative flex h-[180px] w-[140px] shrink-0 items-end overflow-hidden rounded-card bg-surface-sunk p-3"
    >
      <Img src={img} className="absolute inset-0 h-full w-full object-cover" />
      {/* black/… works where a token/… would not: `black` is a real hex in
          Tailwind's default palette, so the alpha actually compiles. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="relative font-display text-[15px] font-semibold leading-tight text-inverse drop-shadow">
        {label}
      </span>
    </Link>
  );
}

/** One row = one filter over the product table, so a product always shows
 *  the same price wherever it appears. Hidden entirely below the minimum. */
function ProductRow({
  title,
  to,
  query,
}: {
  title: string;
  to: string;
  query: { data?: Parameters<typeof ProductCard>[0][]; isLoading: boolean };
}) {
  if (!query.isLoading && (query.data?.length ?? 0) < MIN_SECTION_ITEMS) return null;
  return (
    <section className="pt-7">
      <SectionHead title={title} to={to} />
      {query.isLoading ? (
        <ProductRowSkeleton />
      ) : (
        <div className="scroll-row gap-3 px-4">
          {query.data?.map((p) => (
            <div key={p.id} className="w-[42vw] shrink-0 sm:w-[190px]">
              <ProductCard {...p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Shown under the homepage AND under the in-place category view, so the
 *  page never dead-ends whichever body is on screen. */
function SiteFooter() {
  return (
    <footer className="border-t border-inverse/10 bg-primary px-4 py-8 text-inverse/60">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-4">
        <div>
          <BrandLogo variant="cream" className="h-[32px] w-auto" />
          <p className="mt-3 text-caption">Gifts, delivered the same day, across Lebanon.</p>
        </div>

        <div>
          <p className="text-eyebrow uppercase text-inverse/30">Shop</p>
          <div className="mt-1 flex flex-col text-body">
            <FooterLink to="/browse">Categories</FooterLink>
            <FooterLink to="/gift-finder?occasion=birthday">Birthday gifts</FooterLink>
            <FooterLink to="/gift-cards">Gift Cards</FooterLink>
            <FooterLink to="/gift-finder?budget=under-20">Under $20</FooterLink>
          </div>
        </div>

        <div>
          <p className="text-eyebrow uppercase text-inverse/30">Company</p>
          <div className="mt-1 flex flex-col text-body">
            <FooterLink to="/about">About CADO</FooterLink>
            <FooterLink to="/partners">Partner with CADO</FooterLink>
            <FooterLink to="/help">Contact</FooterLink>
          </div>
        </div>

        <div>
          <p className="text-eyebrow uppercase text-inverse/30">Help</p>
          <div className="mt-1 flex flex-col text-body">
            <FooterLink to="/delivery-returns">Delivery &amp; Returns</FooterLink>
            <FooterLink to="/orders">Track your order</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Service</FooterLink>
            <FooterLink to="/help">FAQ</FooterLink>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-inverse/10 pt-5 text-caption">
        © 2026 CADO. Made in Lebanon.
      </div>
    </footer>
  );
}

export function Home() {
  const stores = useTopStores();
  const trending = useProductsByTag("trending");

  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const searchProducts = useSearchProducts(query);
  const searchStores = useSearchStores(query);

  /**
   * In-place category browsing. Tapping a chip does NOT navigate: the
   * homepage keeps its URL, its header and its sticky rail, and cross-fades
   * its body to that category. /category/<slug> is untouched and is still
   * where "See all" and every shared link go.
   */
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const swapTimer = useRef<number | null>(null);
  const browse = useCategoryBrowse(activeSlug);

  useEffect(() => () => window.clearTimeout(swapTimer.current ?? undefined), []);

  const selectCategory = (slug: string | null) => {
    if (slug === activeSlug) return;
    setQuery("");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (reduced) {
      setActiveSlug(slug);
      return;
    }
    // Fade the old body out, swap underneath, let the new one fade back in.
    // Opacity ONLY — deliberately no transform. A transform makes an element
    // the containing block for its position:fixed descendants, which is how
    // a page animation once silently unpinned every sticky bar on this site.
    setSwapping(true);
    window.clearTimeout(swapTimer.current ?? undefined);
    swapTimer.current = window.setTimeout(() => {
      setActiveSlug(slug);
      setSwapping(false);
    }, SWAP_MS);
  };

  return (
    <div>
      {/*
        2 + 3 — SEARCH and the CATEGORY RAIL, pinned together directly under
        the header. One sticky block rather than two independently pinned
        ones: two sticky bars have to agree on each other's exact pixel
        height forever, and they stop agreeing the first time a font loads
        late. The offset reads --header-h rather than a literal so it can't
        drift from the header's real measured height.
      */}
      <div className="sticky top-[var(--header-h)] z-[15] border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 pt-2.5">
          <div className="flex h-11 flex-1 items-center gap-2.5 rounded-pill border border-line bg-surface px-4 shadow-rest">
            <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gifts or stores"
              aria-label="Search gifts or stores"
              className="w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-muted"
            />
          </div>
          {/* What used to be a full-width black quiz banner interrupting the
              page. It's a way out for someone who's stuck, not a gate. */}
          <Link
            to="/gift-finder"
            className="tap-44 shrink-0 whitespace-nowrap text-caption font-medium text-ink underline underline-offset-4"
          >
            Help me choose
          </Link>
        </div>

        {/* The rail, plus the filter control once a category is showing. The
            control is pinned in the top-right corner of this sticky block
            rather than sitting down beside the grid, so it stays a thumb's
            reach away however far the grid is scrolled. */}
        <div className="flex items-stretch">
          <div className="min-w-0 flex-1">
            <CategoryChips
              className="pb-2.5"
              activeSlug={activeSlug ?? undefined}
              onSelect={selectCategory}
            />
          </div>
          {activeSlug ? (
            <div className="flex shrink-0 items-center pb-2.5 pl-2 pr-4">
              <CategoryFilterButton browse={browse} />
            </div>
          ) : null}
        </div>
      </div>

      {searching ? (
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
          {searchStores.data && searchStores.data.length > 0 ? (
            <>
              <h2 className="mb-3 font-display text-h2">Stores</h2>
              <div className="flex flex-col gap-3">
                {searchStores.data.map((s) => (
                  <Link
                    key={s.id}
                    to={`/store/${s.id}`}
                    className="flex items-center gap-4 rounded-card bg-surface p-3 shadow-rest"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface-sunk">
                      <Img src={s.cover_image_url} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      {s.description ? (
                        <p className="truncate text-store text-muted">{s.description}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          <h2 className="mb-3 mt-7 font-display text-h2">Gifts</h2>
          {searchProducts.isLoading ? (
            <ProductGridSkeleton count={6} />
          ) : searchProducts.data && searchProducts.data.length > 0 ? (
            <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
              {searchProducts.data.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          ) : (
            <p className="text-body text-muted">
              Nothing matches “{query}” yet — try a category above, or{" "}
              <Link to="/gift-finder" className="font-medium text-ink underline underline-offset-4">
                let us help you choose
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        /* The cross-fade wrapper. Opacity only — see selectCategory. */
        <div
          style={{ transitionDuration: `${SWAP_MS}ms` }}
          className={`transition-opacity ease-out ${swapping ? "opacity-0" : "opacity-100"}`}
        >
          {activeSlug ? (
            <CategoryInline browse={browse} />
          ) : (
            <>
              {/* 4 — HERO. About 40% of the screen: enough to set the mood,
                  not enough to stand between anyone and the shop. One line,
                  one button. The photos are wrapped gifts, cycling. */}
              <section className="relative mx-4 mt-3 flex h-[40vh] max-h-[360px] min-h-[240px] flex-col justify-end overflow-hidden rounded-card px-5 pb-5 sm:h-[38vh]">
                <HeroCarousel />
                <h1 className="relative max-w-[15ch] font-display text-h1 text-inverse drop-shadow sm:max-w-lg sm:text-display">
                  Wrapped, and at their door by tonight.
                </h1>
                <Link
                  to="/gift-finder"
                  className="relative mt-3.5 inline-flex h-[52px] w-fit items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse shadow-lift transition-all duration-press ease-out active:scale-[0.97]"
                >
                  Find a gift
                </Link>
              </section>

              {/* 5 — OCCASIONS. Photo cards, the same treatment as the
                  recipient rail below — the small text pills that briefly
                  replaced them made the most emotional row on the page look
                  like a settings screen.

                  Order is deliberate and set in lib/filters.ts: Visiting
                  Someone leads, because turning up at someone's house with
                  something in your hand is the most common gifting occasion
                  in Lebanon. Each card goes straight to a filtered grid —
                  nothing is asked. */}
              <section className="pt-7">
                <SectionHead title="Shop by occasion" />
                <div className="scroll-row gap-3 px-4">
                  {OCCASIONS.map((o) => (
                    <PhotoCard
                      key={o.value}
                      to={`/gift-finder?occasion=${o.value}`}
                      img={o.img}
                      label={o.label}
                    />
                  ))}
                </div>
              </section>

              {/* 6 — GIFT CARDS. Moved up out of the tail of the page, where
                  it was being scrolled past, and rebuilt in colour. */}
              <section className="mx-auto max-w-6xl px-4 pt-7">
                <GiftCardBanner />
              </section>

              {/* 7 — SHOP BY RECIPIENT. People think "something for my
                  sister" before they think "I need shoes". */}
              <section className="pt-7">
                <SectionHead title="Shop by recipient" />
                <div className="scroll-row gap-3 px-4">
                  {RECIPIENTS.map((r) => (
                    <PhotoCard
                      key={r.value}
                      to={`/gift-finder?recipient=${r.value}`}
                      img={r.img}
                      label={r.label}
                    />
                  ))}
                </div>
              </section>

              {/* 8 — STORES ON CADO, on a soft sage band so the row reads as
                  its own shelf rather than more of the same cream. Big
                  swipeable storefronts, not avatars. is_live=false stores
                  are real signings with nothing listed yet; they keep the
                  card shape but are not links.

                  No "See all": the row already carries every store on CADO,
                  and a link to a fuller list that isn't fuller is a wasted
                  tap. */}
              <section className="mt-7 bg-tint-sage py-7">
                <SectionHead title="Stores on CADO" />
                <div className="scroll-row gap-3 px-4">
                  {stores.isLoading
                    ? Array.from({ length: 3 }).map((_, i) => <StoreCardSkeleton key={i} />)
                    : stores.data?.map((store) => <StoreCard key={store.id} store={store} />)}
                </div>
              </section>

              {/* 9 — SHOP BY BUDGET, on a warm blush band. Four bands,
                  straight to a pre-filtered grid, no questions in between. */}
              <section className="bg-tint-blush py-7">
                <SectionHead title="Shop by budget" />
                <div className="scroll-row gap-2 px-4">
                  {BUDGETS.map((b) => (
                    <ChipLink key={b.slug} to={`/gift-finder?budget=${b.slug}`}>
                      {b.label}
                    </ChipLink>
                  ))}
                </div>
              </section>

              {/* 10 — TRENDING. Hides itself if there aren't enough real
                  ones. "See all" goes to the unfiltered gift grid, not to
                  /browse — /browse is the category index, and landing on a
                  wall of categories after tapping "see all gifts" is a dead
                  end. */}
              <ProductRow title="Trending this week" to="/gift-finder?skip=1" query={trending} />

              {/* 11 — HOW CADO WORKS. One compact strip and one hairline of
                  trust copy. Left exactly as it was — the fuller version of
                  this section now lives on the Account page. */}
              <section className="mx-auto max-w-6xl px-4 pt-7">
                <div className="flex items-center justify-between gap-2 rounded-card border border-line px-3 py-4">
                  {HOW_IT_WORKS.map((s, i) => (
                    <div key={s.label} className="flex flex-1 items-center gap-2">
                      {i > 0 ? (
                        <span className="text-muted/50" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      <s.Icon className="h-[18px] w-[18px] shrink-0 text-gold-deep" />
                      <span className="text-caption font-medium leading-tight">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
                  {TRUST.map((t) => (
                    <span key={t.label} className="flex items-center gap-1.5 text-caption text-muted">
                      <t.Icon className="h-3.5 w-3.5 shrink-0" />
                      {t.label}
                    </span>
                  ))}
                </div>
              </section>

              {/* 12 — SELL ON CADO. Kept as it was: it sits down here on
                  purpose, past the shopping. A shopper buying a birthday
                  present is not the audience, but a store owner who scrolls
                  this far is. No store count and no logos — there is nothing
                  real to show yet. */}
              <section className="mt-8 bg-primary text-inverse">
                <div className="mx-auto max-w-6xl px-4 py-8">
                  <p className="text-eyebrow uppercase text-gold">For store owners</p>
                  <h2 className="mt-3 font-display text-h1 sm:text-display">Own a store? Sell on CADO.</h2>
                  <p className="mt-3 max-w-lg text-body text-inverse/70">
                    Reach customers across Lebanon who are looking for a gift right now. You keep doing
                    what you do — we handle the storefront, the orders, and the delivery.
                  </p>

                  <div className="mt-6 grid gap-5 sm:grid-cols-3">
                    {BENEFITS.map((b) => (
                      <div key={b.title} className="flex items-start gap-3">
                        <b.Icon className="h-6 w-6 shrink-0 text-gold" />
                        <div>
                          <p className="text-body font-semibold">{b.title}</p>
                          <p className="mt-0.5 text-caption text-inverse/60">{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <ButtonLink
                      to={`mailto:${PARTNER_EMAIL}`}
                      variant="secondary"
                      className="!bg-canvas !text-ink !ring-0"
                    >
                      Become a partner
                    </ButtonLink>
                    <ButtonLink
                      to={`https://wa.me/${PARTNER_WHATSAPP_NUMBER}`}
                      variant="secondary"
                      className="!bg-transparent !text-inverse !ring-inverse/30"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Talk to us on WhatsApp
                    </ButtonLink>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Continuous with the dark partner block above — a hairline
              instead of a canvas stripe between two full-bleed dark bands. */}
          <SiteFooter />
        </div>
      )}
    </div>
  );
}
