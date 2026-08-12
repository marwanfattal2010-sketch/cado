import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchProducts, useProductsByTag, useNeedItToday } from "../hooks/useProducts";
import { useSearchStores, useTopStores } from "../hooks/useStores";
import { CategoryChips } from "../components/CategoryChips";
import { CategoryFilterButton, CategoryInline, useCategoryBrowse } from "../components/CategoryInline";
import { GiftCardBanner } from "../components/GiftCardBanner";
import { Img } from "../components/Img";
import { ProductCard } from "../components/ProductCard";
import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { ProductGridSkeleton, ProductRowSkeleton } from "../components/Skeleton";
import { SearchIcon } from "../components/Icons";
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
 * A quiet pill, not a gift tag.
 *
 * The tag version — angled corner, punched hole, string, big serif number —
 * was three decorative ideas competing on a control whose only job is to say
 * a price range. Marwan's word for what he wanted instead was "friendly":
 * something small and ordinary that anyone recognises as tappable. So: the
 * same chip language the category rail already uses, at the same 44px height
 * as every other control on the page.
 */
function BudgetTag({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border border-line bg-surface px-5 text-body font-medium text-ink shadow-rest transition-all duration-press ease-out active:scale-[0.97]"
    >
      {label}
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
      {query.isLoading ? (
        <ProductRowSkeleton />
      ) : (
        /* A left-to-right rail, not the 2-column stack this briefly was.
           Same padding, gap and snapping as every other carousel on the
           page, so Trending doesn't read as a different kind of shelf. */
        <div className="scroll-row">
          {items.map((p) => (
            <div key={p.id} className="w-[42vw] sm:w-[190px]">
              <ProductCard {...p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


/** Static photos from the account, each opening the profile. Hardcoded so
 *  they're trivial to swap for real posts; no Instagram API, no embed. */
const INSTAGRAM_IMAGES = [
  "/instagram/1.jpg",
  "/instagram/2.jpg",
  "/instagram/3.jpg",
  "/instagram/4.jpg",
  "/instagram/5.jpg",
  "/instagram/6.jpg",
  "/instagram/7.jpg",
  "/instagram/8.jpg",
];

export function Home() {
  const stores = useTopStores();
  const trending = useProductsByTag("trending");
  const mostGifted = useProductsByTag("most-gifted");
  const newOnCado = useProductsByTag("new");
  const needToday = useNeedItToday();

  /* The live store with the most to sell. A real fact about the catalogue,
     not a paid slot or a hand-set "featured" flag nobody would remember to
     update. */
  const spotlight = stores.data?.find((s) => s.is_live) ?? null;

  /* Everyone else, as circles under the featured card. Coming-soon stores are
     left out: a 64px circle has no room for the "Coming soon" label the
     square card carries, and an unlabelled dead tap is worse than absence.
     They keep their place in the rail higher up the page, which does label
     them. */
  const otherStores = (stores.data ?? []).filter((s) => s.is_live && s.id !== spotlight?.id);

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
              {/* 2 — HERO. Type on cream: no card, no border, no photo, no
                  button, and deliberately no motion of any kind. The previous
                  hero was a cycling photo carousel with a fade; this one
                  renders once and never moves again.

                  clamp() rather than a fixed 54px: at 375px the three hard
                  breaks must hold, and "tonight." is the longest line, so the
                  type scales with the viewport instead of wrapping to four
                  lines on a narrow phone. */}
              <section className="mx-auto max-w-6xl px-4 pt-6">
                <h1
                  className="font-display font-normal leading-[0.94] tracking-[-0.015em] text-ink"
                  style={{ fontSize: "clamp(42px, 13.8vw, 54px)" }}
                >
                  Chosen now.
                  <br />
                  There by
                  <br />
                  <span className="text-accent-brand">tonight.</span>
                </h1>
                <hr className="mt-5 border-0 border-t border-line" />
                <p className="mt-3.5 max-w-[290px] text-[14.5px] leading-relaxed text-muted">
                  Gifts from real Beirut stores —{" "}
                  <span className="font-semibold text-ink">ordered today, delivered today.</span>
                </p>
              </section>

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
              {/* 5 — STORES ON CADO. Moved up to the top of the browse:
                  the two real signed stores are the strongest thing on the
                  page and were sitting eight sections down. Square cards,
                  name bottom-left. is_live=false stores keep the card shape
                  but are not links. */}
              <section className="mt-7 bg-tint-sage py-7">
                <SectionHead title="Stores on CADO" />
                <div className="scroll-row">
                  {stores.isLoading
                    ? Array.from({ length: 3 }).map((_, i) => <StoreCardSkeleton key={i} />)
                    : stores.data?.map((store) => <StoreCard key={store.id} store={store} />)}
                </div>
              </section>

              {/* 6 — MOST GIFTED FOR BIRTHDAYS. The balloon banner that used
                  to head this section is gone; the row stands on its own now.

                  The data is the editorial `most-gifted` tag and nothing else
                  — no rank, no number, no "#1" anywhere, because there is no
                  order-volume data the storefront can read to justify one.
                  Below MIN_SECTION_ITEMS it hides rather than padding out. */}
              <section className="pt-7">
                <SectionHead title="Most gifted for birthdays" />
                {mostGifted.isLoading ? (
                  <ProductRowSkeleton />
                ) : (mostGifted.data?.length ?? 0) >= MIN_SECTION_ITEMS ? (
                  <>
                    <div className="scroll-row">
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

              {/* 8 — NEED IT TODAY. Restored, but narrower than it was: only
                  products with no variants, so there is nothing to size or
                  choose — tap, cart, done. A product with three sizes is not
                  grab-and-go, whatever its delivery time.

                  Same-day is a real claim, so it is gated on the same rule
                  the card badge uses: the store offers it, stock is known and
                  above zero, and the midnight cut-off has not passed. In the
                  00:00-08:00 window the section hides itself rather than
                  promising a delivery nobody will make. */}
              {needToday.isLoading ? (
                <section className="pt-7">
                  <SectionHead title="Need it today" />
                  <ProductRowSkeleton />
                </section>
              ) : (needToday.data?.length ?? 0) >= MIN_SECTION_ITEMS ? (
                <section className="pt-7">
                  <SectionHead title="Need it today" to="/gift-finder" />
                  <div className="scroll-row">
                    {needToday.data?.map((p) => (
                      <div key={p.id} className="w-[42vw] sm:w-[190px]">
                        <ProductCard {...p} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* 9 — GIFT CARDS. */}
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

              {/* 10 — TRENDING. A 2-column grid, not a strip: see
                  TrendingGrid. Hides itself if there aren't enough real
                  ones. "See all" goes to the unfiltered gift grid, not to
                  /browse — /browse is the category index, and landing on a
                  wall of categories after tapping "see all gifts" is a dead
                  end. */}
              <TrendingGrid query={trending} />

              {/* 12 — SHOP BY BUDGET. The blush band is gone: a pink stripe
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


              {/* 13 — NEW ON CADO. Restored. Newest first — this is the one
                  shelf on the page that is a plain fact about the catalogue
                  rather than a curator's choice, so nothing has to be tagged
                  for it to be honest. */}
              {newOnCado.isLoading ? (
                <section className="pt-7">
                  <SectionHead title="New on CADO" />
                  <ProductRowSkeleton />
                </section>
              ) : (newOnCado.data?.length ?? 0) >= MIN_SECTION_ITEMS ? (
                <section className="pt-7">
                  <SectionHead title="New on CADO" to="/gift-finder" />
                  <div className="scroll-row">
                    {newOnCado.data?.map((p) => (
                      <div key={p.id} className="w-[42vw] sm:w-[190px]">
                        <ProductCard {...p} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* 14 — STORE SPOTLIGHT. One store, full width, lower down —
                  stores appearing a second time, in a different shape.

                  Whichever live store has the most to sell, which is a real
                  fact rather than a paid placement or an invented "featured"
                  flag. Hidden entirely if no live store has products. */}
              {spotlight ? (
                <section className="mx-auto max-w-6xl px-4 pt-8">
                  <SectionHead title="Store spotlight" />
                  <Link
                    to={`/store/${spotlight.id}`}
                    className="relative block aspect-[16/9] overflow-hidden rounded-card bg-surface-sunk transition-transform duration-press ease-out active:scale-[0.99]"
                  >
                    <Img
                      src={spotlight.cover_image_url ?? spotlight.logo_url}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="font-display text-h2 text-inverse drop-shadow">{spotlight.name}</p>
                      {spotlight.description ? (
                        <p className="mt-0.5 line-clamp-1 text-caption text-inverse/85 drop-shadow">
                          {spotlight.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  {/* The rest of the shops as small circles under the
                      featured one. The square rail higher up the page shows
                      about three at a time; circles this size fit eight, so
                      the row reads as "and here is everyone else" rather
                      than repeating the same shelf twice.

                      Coming-soon stores are excluded here — they have
                      nothing to open, and a circle is too small to carry the
                      "Coming soon" label the square card uses. They keep
                      their place in the rail above, which does. */}
                  {otherStores.length > 0 ? (
                    <div className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {otherStores.map((store) => (
                        <Link
                          key={store.id}
                          to={`/store/${store.id}`}
                          className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform duration-press ease-out active:scale-[0.96]"
                        >
                          <span className="h-16 w-16 overflow-hidden rounded-pill bg-surface-sunk shadow-rest">
                            <Img
                              src={store.logo_url ?? store.cover_image_url}
                              className="h-full w-full object-cover"
                            />
                          </span>
                          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">
                            {store.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* 15 — SELL ON CADO, as a compact card.
                  Nothing was deleted: the full pitch (no upfront cost, we
                  deliver, new customers, email and WhatsApp) already lives on
                  /partners and this now links there. It was a full-bleed
                  black section with three benefit columns and two buttons
                  sitting between the shopping and the footer, aimed at an
                  audience of roughly nobody who reaches it. */}
              <section className="mx-auto max-w-6xl px-4 py-10">
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

              {/* 16 — INSTAGRAM. Real photographs from the account, each
                  opening the profile. No embed, no follower count, no faked
                  post metadata — it is a set of pictures and a link. */}
              <section className="pt-2">
                <SectionHead title="@cado.lb on Instagram" />
                <div className="scroll-row">
                  {INSTAGRAM_IMAGES.map((src) => (
                    <a
                      key={src}
                      href="https://instagram.com/cado.lb"
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square w-[128px] shrink-0 overflow-hidden rounded-card bg-surface-sunk"
                    >
                      <Img src={src} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </section>

              {/* 17 — MINI FOOTER. One line. Everything the old black block
                  carried — help, delivery, tracking, policies, categories —
                  now lives on Account as tappable rows, which is where
                  someone actually goes looking for it. */}
              <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center">
                <p className="text-caption text-muted">
                  © {new Date().getFullYear()} CADO ·{" "}
                  <Link to="/privacy" className="underline underline-offset-4">
                    Privacy
                  </Link>{" "}
                  ·{" "}
                  <Link to="/terms" className="underline underline-offset-4">
                    Terms
                  </Link>
                </p>
              </footer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
