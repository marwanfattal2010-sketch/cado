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
import { SearchIcon, GiftIcon, TruckIcon } from "../components/Icons";
import { timeUntilCutoff } from "../lib/area";
import { BUDGETS, OCCASIONS, RECIPIENTS } from "../lib/filters";

/**
 * A carousel with two products in it looks broken, and padding it out with
 * repeats or invented items is worse. Anything below this simply doesn't
 * render.
 */
const MIN_SECTION_ITEMS = 4;

/**
 * Trending is a 2-column grid, 4 rows. Eight is what the seeded catalogue
 * actually has tagged `trending`; if that ever drops the grid gets shorter
 * rather than padded, because a repeated or invented card is a lie about
 * what's on the site. Below MIN_SECTION_ITEMS the whole section hides.
 */
const TRENDING_ROWS = 4;
const TRENDING_MAX = TRENDING_ROWS * 2;

/** Long enough to read as a deliberate swap, short enough that it never
 *  feels like waiting. Matched by the inline transition duration below. */
const SWAP_MS = 170;

/**
 * The trust strip, now directly under the hero instead of buried at the
 * bottom of the page where nobody scrolled to it.
 *
 * TWO items, not three. The middle one used to be "We wrap it free" and then
 * briefly "Free gift wrap from most stores". CADO is not offering gift
 * wrapping at all — Marwan, 2026-08: "i dont need gift wrapping" — so the
 * item is deleted rather than softened. Nothing was invented to fill the
 * gap; a two-column strip of true things beats a three-column one padded
 * with a service that doesn't exist.
 *
 * The three grey badges that used to sit under this row (Verified Lebanese
 * stores / Pay on delivery / Free wrapping) are also gone from the homepage
 * — they were a second, near-identical strip saying the same things. The
 * remaining true ones still live on Account, which is the screen someone
 * lands on when they are deciding whether to trust CADO at all.
 */
const HOW_IT_WORKS = [
  { Icon: GiftIcon, label: "Pick a gift" },
  { Icon: TruckIcon, label: "Delivered today" },
];

/**
 * The real cut-off, in words, recomputed on the minute so the page can't sit
 * open through midnight still promising today. No countdown: a ticking clock
 * on a homepage is pressure, and this is meant to be information.
 */
function useCutoffLine() {
  const [line, setLine] = useState(() => timeUntilCutoff().label);
  useEffect(() => {
    const t = window.setInterval(() => setLine(timeUntilCutoff().label), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return line;
}

function TrustStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="grid grid-cols-2 divide-x divide-line rounded-card border border-line">
        {HOW_IT_WORKS.map((s) => (
          /* Two short labels fit on one line each, so the icon sits beside
             the text rather than above it — stacked, the strip was 87px of
             mostly air directly under the hero. */
          <div key={s.label} className="flex items-center justify-center gap-2 px-2 py-4 text-center">
            <s.Icon className="h-[18px] w-[18px] shrink-0 text-gold-deep" />
            <span className="text-caption font-medium leading-snug">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

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
      /* aspect-[7/9] on a 140px card is the same 140x180 box the fixed height
         gave, but expressed as a ratio: the slot exists at layout time, before
         the photo has a single byte, so the rail never reflows. The sunk tint
         is the placeholder that shows through until it does. */
      className="relative flex aspect-[7/9] w-[140px] shrink-0 items-end overflow-hidden rounded-card bg-surface-sunk p-3"
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

/**
 * A budget band as an actual gift tag: sliced top-left corner, a punched
 * hole with a string running out through the cut, the price in the serif
 * display face on cream inside a near-black hairline.
 *
 * The previous version had the hole alone, floating centred above the price,
 * on an ordinary rounded rectangle — at 375px that reads as an unselected
 * radio button, not as a tag. The corner and the string are what make the
 * hole mean something, so they arrive together or not at all.
 *
 * Built as two clipped layers rather than a border, because clip-path cuts
 * a border off with the corner and would leave the diagonal edge invisible
 * against the canvas page behind it: an outer layer in --primary, an inner
 * layer inset 1px in canvas, and the 1px that shows between them IS the
 * hairline. rounded-card still applies to the three untouched corners, so
 * this stays inside the three-radii rule and introduces no new colour.
 */
const TAG_CLIP = "polygon(18px 0, 100% 0, 100% 100%, 0 100%, 0 18px)";
const TAG_CLIP_INNER = "polygon(17px 0, 100% 0, 100% 100%, 0 100%, 0 17px)";

function BudgetTag({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      /* 88px tall clears the 44px minimum twice over, and the fixed width
         keeps all four tags the same size whether the label is "$100+" or
         "$20 – $50". */
      className="relative flex h-[88px] w-[128px] shrink-0 items-center justify-center px-3 text-center transition-all duration-press ease-out active:scale-[0.97]"
    >
      <span aria-hidden className="absolute inset-0 rounded-card bg-primary" style={{ clipPath: TAG_CLIP }} />
      <span
        aria-hidden
        className="absolute inset-[1px] rounded-card bg-canvas"
        style={{ clipPath: TAG_CLIP_INNER }}
      />
      {/* The hole and its string. Same clip as the tag, so the string is cut
          off exactly at the diagonal and reads as continuing off the card
          rather than stopping in the middle of it. */}
      <svg
        aria-hidden
        viewBox="0 0 44 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="absolute left-0 top-0 h-11 w-11 text-primary/55"
        style={{ clipPath: TAG_CLIP }}
      >
        <path d="M2 2 C 10 4, 12 8, 16.6 13" />
        <circle cx="20" cy="13" r="3.4" />
      </svg>
      <span className="relative font-display text-h2 leading-tight text-ink">{label}</span>
    </Link>
  );
}

/**
 * Trending, as a vertical 2-column grid instead of a swipe strip.
 *
 * A carousel shows three-and-a-bit cards and hides the rest behind a gesture
 * a lot of people never make; eight cards stacked in four rows are all
 * visible on the way down the page, which is the direction someone is
 * already moving. "See all" still goes to the full list.
 *
 * `.slice` never pads. Fewer than TRENDING_MAX real trending products means
 * fewer rows, and fewer than MIN_SECTION_ITEMS means no section.
 */
function TrendingGrid({
  query,
}: {
  query: { data?: Parameters<typeof ProductCard>[0][]; isLoading: boolean };
}) {
  const items = query.data?.slice(0, TRENDING_MAX) ?? [];
  if (!query.isLoading && items.length < MIN_SECTION_ITEMS) return null;

  return (
    <section className="pt-7">
      <SectionHead title="Trending this week" to="/gift-finder?skip=1" />
      <div className="mx-auto max-w-6xl px-4">
        {query.isLoading ? (
          <ProductGridSkeleton count={TRENDING_MAX} compact />
        ) : (
          /* gap-y a touch larger than gap-x: rows need to separate from each
             other vertically or the four of them read as one grey block, but
             the columns want to stay tight so the photos dominate. */
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} {...p} compact />
            ))}
          </div>
        )}
      </div>
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
  const mostGifted = useProductsByTag("most-gifted");

  const cutoffLine = useCutoffLine();

  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
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
      {/*
        `top` transitions with the SAME duration and easing as the header's
        collapse (240ms, --ease). --header-h is republished once at each end
        of that collapse rather than every frame, so this transition is what
        actually carries the rail up and back down; without it the bar would
        jump 68px the instant the header started moving and sit in open space
        until it caught up. index.css flattens both to 0.01ms under
        prefers-reduced-motion, so they still land together.
      */}
      <div className="sticky top-[var(--header-h)] z-[15] border-b border-line bg-canvas/95 backdrop-blur transition-[top] duration-base ease-ease">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 pt-2.5">
          {/*
            A real <form role="search">, not a bare input. That is what makes
            the iOS keyboard's return key say "Search" (type="search" +
            enterKeyHint="search" only get the label; without a form to submit,
            pressing it does nothing and the keyboard stays up). Submitting
            blurs the field, which is what actually dismisses the keyboard and
            hands the screen back.

            The search itself is unchanged and still live: `query` updates on
            every keystroke and the results below re-render as you type, so by
            the time return is pressed the answer is already on screen. Submit
            is a way to put the keyboard away, never a gate in front of it —
            hence preventDefault and no navigation.

            The magnifier is after the input in DOM order, so it sits at the
            right edge while the placeholder still starts from the left.
          */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              searchInput.current?.blur();
            }}
            /* The input is 42px inside a 44px pill and does not reach the
               horizontal padding or the icon, so a tap on the pill's edge
               would otherwise land on nothing. This makes the whole 44px
               control the tap target, which is what it looks like. */
            onClick={() => searchInput.current?.focus()}
            className="search-field flex h-11 flex-1 items-center gap-2.5 rounded-pill border border-line bg-surface px-4 shadow-rest transition-colors duration-fast"
          >
            <input
              ref={searchInput}
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gifts or stores"
              aria-label="Search gifts or stores"
              /* h-full, not the input's default 23px line box: the pill is
                 44px and the input has to BE the tap target, or the top and
                 bottom 10px of the bar look tappable and do nothing. */
              className="h-full w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-muted"
            />
            <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden />
          </form>
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
        /* The cross-fade wrapper. Opacity only — see selectCategory.
           min-h keeps the body at least a screen tall through the swap, so a
           thin category (two products) can't collapse the page shorter than
           the viewport, drag the scroll position with it and flash the footer
           halfway up the screen on the way through. */
        <div
          style={{ transitionDuration: `${SWAP_MS}ms` }}
          className={`min-h-[calc(100vh-var(--header-h))] transition-opacity ease-out ${
            swapping ? "opacity-0" : "opacity-100"
          }`}
        >
          {activeSlug ? (
            <CategoryInline browse={browse} />
          ) : (
            <>
              {/* 3 — HERO. A quarter shorter than it was (40vh/360 -> 30vh/
                  270) so whatever comes next always peeks above the fold on a
                  375x812 screen. Same photo carousel, same headline, same one
                  button — only the box lost height.

                  The line under the headline is the real cut-off, computed
                  from the clock: before midnight it says today is still
                  possible, in the 00:00-08:00 window it says plainly that it
                  isn't. It is not a countdown and never becomes one. */}
              <section className="relative mx-4 mt-3 flex h-[30vh] max-h-[270px] min-h-[196px] flex-col justify-end overflow-hidden rounded-card px-5 pb-4 sm:h-[30vh]">
                <HeroCarousel />
                {/* Was "Wrapped, and at their door by tonight." The brief
                    said keep that headline; the later instruction that CADO
                    is not offering gift wrapping overrides it, and this was
                    the loudest wrapping claim on the site. Same promise, same
                    rhythm, minus the service that doesn't exist. */}
                <h1 className="relative max-w-[15ch] font-display text-h1 text-inverse drop-shadow sm:max-w-lg sm:text-display">
                  Chosen today, at their door by tonight.
                </h1>
                <p className="relative mt-1.5 text-caption text-inverse/90 drop-shadow">{cutoffLine}</p>
                <Link
                  to="/gift-finder"
                  className="relative mt-3 inline-flex h-[52px] w-fit items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse shadow-lift transition-all duration-press ease-out active:scale-[0.97]"
                >
                  Find a gift
                </Link>
              </section>

              {/* 4 — TRUST STRIP, straight under the hero. */}
              <TrustStrip />

              {/* 5 — BIRTHDAYS. Banner and carousel are ONE section now: the
                  banner is the section header, the gifts are the answer to
                  the question it asks, and "See all" closes it. They used to
                  be two stacked sections with the row carrying its own
                  "Most gifted for birthdays" title, which read as two
                  unrelated birthday blocks in a row.

                  The gradient is heavier than it was (black/90 at the base,
                  /55 through the middle) because the balloon photo is bright
                  and pale at the bottom left, exactly where the subtitle sits
                  — white type on it was close to unreadable at 375px. Photo
                  and copy are otherwise untouched.

                  The data is the editorial `most-gifted` tag and nothing else
                  — no rank, no number, no "#1" anywhere, because there is no
                  order-volume data the storefront can read to justify one.
                  "Most gifted" is a curator's shelf label, and if fewer than
                  MIN_SECTION_ITEMS products carry the tag the carousel hides
                  rather than showing a padded row; the banner stays, because
                  it is navigation. */}
              <section className="pt-7">
                <div className="mx-auto max-w-6xl px-4">
                  <Link
                    to="/gift-finder?occasion=birthday"
                    className="relative flex h-[190px] flex-col justify-end overflow-hidden rounded-sheet p-6 transition-transform duration-fast active:scale-[0.99]"
                  >
                    <img
                      src="/occasions/birthday-banner.jpg"
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
                    <p className="relative font-display text-h1 text-inverse drop-shadow">
                      Birthday coming up?
                    </p>
                    <p className="relative mt-1 text-body text-inverse/85 drop-shadow">
                      Same-day gifts, sorted by what always lands.
                    </p>
                  </Link>
                </div>

                {mostGifted.isLoading ? (
                  <div className="pt-4">
                    <ProductRowSkeleton />
                  </div>
                ) : (mostGifted.data?.length ?? 0) >= MIN_SECTION_ITEMS ? (
                  <>
                    <div className="scroll-row pt-4">
                      {mostGifted.data?.map((p) => (
                        <div key={p.id} className="w-[42vw] sm:w-[190px]">
                          <ProductCard {...p} />
                        </div>
                      ))}
                    </div>
                    <div className="mx-auto flex max-w-6xl justify-end px-4 pt-1">
                      <Link
                        to="/gift-finder?occasion=birthday"
                        className="tap-44 text-caption font-medium text-ink underline underline-offset-4"
                      >
                        See all birthday gifts
                      </Link>
                    </div>
                  </>
                ) : null}
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
                <div className="scroll-row">
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
                <div className="scroll-row">
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
                <div className="scroll-row">
                  {stores.isLoading
                    ? Array.from({ length: 3 }).map((_, i) => <StoreCardSkeleton key={i} />)
                    : stores.data?.map((store) => <StoreCard key={store.id} store={store} />)}
                </div>
              </section>

              {/* 9 — SHOP BY BUDGET. The blush band is gone: a pink stripe
                  was the one place on the page a hue filled a large surface,
                  and it fought the sage shelf directly above it. Plain canvas
                  now, so the tags themselves are the only thing to look at.

                  Four bands, straight to a pre-filtered grid, no questions in
                  between. */}
              <section className="py-7">
                <SectionHead title="Shop by budget" />
                <div className="scroll-row">
                  {BUDGETS.map((b) => (
                    <BudgetTag key={b.slug} to={`/gift-finder?budget=${b.slug}`} label={b.label} />
                  ))}
                </div>
              </section>

              {/* 10 — TRENDING. A 2-column grid, not a strip: see
                  TrendingGrid. Hides itself if there aren't enough real
                  ones. "See all" goes to the unfiltered gift grid, not to
                  /browse — /browse is the category index, and landing on a
                  wall of categories after tapping "see all gifts" is a dead
                  end. */}
              <TrendingGrid query={trending} />

              {/* 11 — SELL ON CADO, as a compact card.
                  Nothing was deleted: the full pitch (no upfront cost, we
                  deliver, new customers, email and WhatsApp) already lives on
                  /partners and this now links there. It was a full-bleed
                  black section with three benefit columns and two buttons
                  sitting between the shopping and the footer, aimed at an
                  audience of roughly nobody who reaches it. */}
              <section className="mx-auto max-w-6xl px-4 pt-8">
                <Link
                  to="/partners"
                  className="block rounded-card bg-primary px-5 py-4 text-inverse transition-transform duration-press ease-out active:scale-[0.99]"
                >
                  {/* Title and call-to-action share the first row; the one
                      line of copy runs full width underneath. Side by side
                      all three squeezed the copy into a three-line column
                      and the card back up to 120px, which is not compact. */}
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-h2">Own a store?</span>
                    <span className="shrink-0 whitespace-nowrap text-caption font-medium text-gold">
                      Become a partner →
                    </span>
                  </span>
                  <span className="mt-1 block text-caption text-inverse/65">
                    Sell on CADO — no upfront cost, and we deliver.
                  </span>
                </Link>
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
