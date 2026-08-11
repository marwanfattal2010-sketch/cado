import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../hooks/useCategories";
import {
  useSearchProducts,
  categoryProductsQuery,
  useProductsByTag,
  useNeedItToday,
} from "../hooks/useProducts";
import { useSearchStores, useTopStores } from "../hooks/useStores";
import { HeroCarousel } from "../components/HeroCarousel";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton, ProductRowSkeleton } from "../components/Skeleton";
import {
  SearchIcon,
  GiftIcon,
  WrapIcon,
  ShieldCheckIcon,
  WalletIcon,
  TruckIcon,
  InstagramIcon,
} from "../components/Icons";
import { RibbonDivider, ButtonLink } from "../components/ui";
import { BUDGETS, RECIPIENTS } from "../lib/filters";
import { timeUntilCutoff } from "../lib/area";
import { BENEFITS, PARTNER_EMAIL, PARTNER_WHATSAPP_NUMBER } from "./Partners";

/** Everything here is a gift — "& Gifts" in a category label says nothing. */
function tidyCategory(name: string) {
  return name.replace(/\s*&\s*Gifts$/i, "").trim();
}

const MORE_OCCASIONS = [
  { name: "Visiting Someone", img: "/occasions/visiting-someone.jpg" },
  { name: "Anniversary", img: "/occasions/anniversary.jpg" },
  { name: "Get Well Soon", img: "/occasions/get-well-soon.jpg" },
  { name: "Graduation", img: "/occasions/graduation.jpg" },
  { name: "New Baby", img: "/occasions/new-baby.jpg" },
  { name: "Wedding", img: "/occasions/wedding.jpg" },
  { name: "Engagement", img: "/occasions/engagement.jpg" },
];

const HOW_IT_WORKS = [
  { n: "1", Icon: GiftIcon, title: "Pick a gift", desc: "Browse gifts from stores across Lebanon." },
  { n: "2", Icon: WrapIcon, title: "We wrap it", desc: "Every order comes gift-wrapped, with your note inside." },
  { n: "3", Icon: TruckIcon, title: "Delivered today", desc: "Order before 4PM and it arrives the same day." },
];

const WHY_CADO = [
  { Icon: TruckIcon, label: "Same-day delivery" },
  { Icon: WrapIcon, label: "Free gift wrapping" },
  { Icon: ShieldCheckIcon, label: "Verified Lebanese stores" },
  { Icon: WalletIcon, label: "Pay on delivery" },
];

/** Built, but renders nothing until there are real ones. A fabricated
 *  testimonial on a new marketplace is easy to spot and costs more trust
 *  than it buys. */
const REVIEWS: { name: string; city: string; quote: string }[] = [];

/** Static images + a profile link, hardcoded so they're easy to swap for
 *  real posts once the account has them. No Instagram API/embed is used —
 *  every tile just opens the profile. */
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

function SectionHead({ title, to, eyebrow }: { title: string; to?: string; eyebrow?: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-3">
      <div>
        {eyebrow ? <p className="text-eyebrow uppercase text-gold">{eyebrow}</p> : null}
        <h2 className="font-display text-h2">{title}</h2>
      </div>
      {to ? (
        <Link to={to} className="tap-44 shrink-0 pb-0.5 text-caption font-medium text-ribbon">
          See all →
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

/** One row = one filter over the product table, so a product always shows
 *  the same price wherever it appears. */
function ProductRow({
  title,
  to,
  query,
}: {
  title: string;
  to: string;
  query: { data?: Parameters<typeof ProductCard>[0][]; isLoading: boolean };
}) {
  if (!query.isLoading && !query.data?.length) return null;
  return (
    <section className="pt-7">
      <SectionHead title={title} to={to} />
      {query.isLoading ? (
        <ProductRowSkeleton />
      ) : (
        <div className="scroll-row gap-3 px-4">
          {query.data?.map((p) => (
            <div key={p.id} className="w-[44vw] shrink-0 sm:w-[190px]">
              <ProductCard {...p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Home() {
  const queryClient = useQueryClient();
  const prefetchCategory = (slug: string) => queryClient.prefetchQuery(categoryProductsQuery(slug));

  const categories = useCategories();
  const stores = useTopStores();
  const trending = useProductsByTag("trending");
  const mostGifted = useProductsByTag("most-gifted");
  const newOnCado = useProductsByTag("new");
  const needToday = useNeedItToday();

  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const searchProducts = useSearchProducts(query);
  const searchStores = useSearchStores(query);

  // Live cut-off. Honest information rather than manufactured urgency, so it
  // has to keep ticking and has to admit when it's passed.
  const [cutoff, setCutoff] = useState(() => timeUntilCutoff());
  useEffect(() => {
    const t = setInterval(() => setCutoff(timeUntilCutoff()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      {/* 1 — HERO. Not a ring: an engagement ring is the least universal gift
          there is. The product is the arrival, not the object. */}
      <section className="relative mx-4 mt-3 flex aspect-[4/5] max-h-[62vh] flex-col justify-end overflow-hidden rounded-card px-6 pb-8 sm:aspect-[16/7]">
        <HeroCarousel />
        <h1 className="relative max-w-sm font-display text-display text-inverse drop-shadow sm:max-w-lg">
          Wrapped, and at their door by tonight.
        </h1>
        <Link
          to="/gift-finder"
          className="relative mt-5 inline-flex h-[52px] w-fit items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse transition-all duration-fast active:scale-[0.97]"
        >
          Find a gift
        </Link>
      </section>

      {/* 2 — SEARCH. Searches inline; no navigation away. */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex items-center gap-3 rounded-pill border border-line bg-surface px-5 py-3.5 shadow-rest">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gifts or stores..."
            aria-label="Search gifts or stores"
            className="w-full bg-transparent text-body text-ink outline-none placeholder:text-muted"
          />
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
                      {s.cover_image_url ? (
                        <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
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
              Nothing matches “{query}” yet — try a category, or let the{" "}
              <Link to="/gift-finder" className="font-medium text-ribbon underline">
                gift finder
              </Link>{" "}
              pick for you.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* 3 — GIFT FINDER. Whoever taps "not sure what to get" is exactly
              who CADO exists for, so send them to the finder first. */}
          <section className="mx-auto max-w-6xl px-4 pt-6">
            <Link
              to="/gift-finder"
              className="flex items-center justify-between gap-4 rounded-card bg-ink px-6 py-5 text-inverse transition-transform duration-fast active:scale-[0.99]"
            >
              <div>
                <p className="font-display text-h2">Not sure what to get?</p>
                <p className="mt-1 text-body text-inverse/70">Three questions. We’ll find it.</p>
              </div>
              <span className="shrink-0 text-[28px] text-gold" aria-hidden>
                🎀
              </span>
            </Link>

            {/* 3b — GIFT CARD BANNER, restored from the old homepage: the
                whole card is the link, straight to /gift-cards. Slimmer than
                the finder card and worded differently so the dark pair
                doesn't read as duplicates. */}
            <Link
              to="/gift-cards"
              className="mt-3 flex min-h-[72px] items-center justify-between gap-4 rounded-card bg-ink px-6 py-4 text-inverse transition-transform duration-fast active:scale-[0.99]"
            >
              <div>
                <p className="text-body font-semibold">Skip the guessing</p>
                <p className="mt-0.5 text-caption text-inverse/60">Send a CADO gift card instead.</p>
              </div>
              <GiftIcon className="h-8 w-8 shrink-0 text-gold" />
            </Link>
          </section>

          {/* 4 — SHOP BY RECIPIENT. Above category on purpose: people think
              "something for my sister" before "I need shoes". */}
          <section className="pt-7">
            <SectionHead title="Shop by recipient" />
            <div className="scroll-row gap-3 px-4">
              {RECIPIENTS.map((r) => (
                <Link
                  key={r.value}
                  to={`/gift-finder?recipient=${r.value}`}
                  className="relative flex h-[180px] w-[140px] shrink-0 items-end overflow-hidden rounded-card p-3 transition-transform duration-fast active:scale-[0.97]"
                >
                  <img src={r.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <span className="relative font-display text-[15px] font-semibold text-inverse drop-shadow">
                    {r.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* 5 — SHOP BY CATEGORY. Three per row, not five. */}
          <section className="pt-7">
            <SectionHead title="Shop by category" to="/browse" />
            <div className="mx-auto grid max-w-6xl grid-cols-3 gap-3 px-4 sm:grid-cols-5">
              {categories.data?.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  onMouseEnter={() => prefetchCategory(cat.slug)}
                  onTouchStart={() => prefetchCategory(cat.slug)}
                  className="flex flex-col items-center gap-2 text-center transition-transform duration-fast active:scale-[0.96]"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-card bg-surface-sunk">
                    <img
                      src={`/categories/${cat.slug}.jpg`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[13px] font-medium leading-tight">{tidyCategory(cat.name)}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* 6 — NEED IT TODAY, with the real cut-off. */}
          {needToday.data && needToday.data.length > 0 ? (
            <section className="pt-7">
              <div className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-3">
                <div>
                  <h2 className="font-display text-h2">Need it today</h2>
                  <p className={`mt-0.5 text-caption font-medium ${cutoff.passed ? "text-muted" : "text-today"}`}>
                    {cutoff.label}
                  </p>
                </div>
              </div>
              <div className="scroll-row gap-3 px-4">
                {needToday.data.map((p) => (
                  <div key={p.id} className="w-[44vw] shrink-0 sm:w-[190px]">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* 7 — TRENDING */}
          <ProductRow title="Trending this week" to="/browse" query={trending} />

          {/* 8 — SHOP BY BUDGET */}
          <section className="pt-7">
            <SectionHead title="Shop by budget" />
            <div className="scroll-row gap-2 px-4">
              {BUDGETS.map((b) => (
                <Link
                  key={b.slug}
                  to={`/gift-finder?budget=${b.slug}`}
                  className="inline-flex h-11 shrink-0 items-center rounded-pill bg-surface-sunk px-4 text-body font-medium text-ink transition-all duration-fast active:scale-[0.96]"
                >
                  {b.label}
                </Link>
              ))}
            </div>
          </section>

          {/* 9 — MOST GIFTED FOR BIRTHDAYS */}
          <ProductRow
            title="Most gifted for birthdays"
            to="/gift-finder?occasion=birthday"
            query={mostGifted}
          />

          {/* 10 — MORE OCCASIONS. Deliberately small; birthdays are the path. */}
          <section className="pt-7">
            <SectionHead title="More occasions" />
            <div className="scroll-row gap-2.5 px-4">
              {MORE_OCCASIONS.map((o) => (
                <Link
                  key={o.name}
                  to="/gift-finder"
                  className="relative flex h-[140px] w-[100px] shrink-0 items-end overflow-hidden rounded-card p-2.5 transition-transform duration-fast active:scale-[0.96]"
                >
                  <img src={o.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <span className="relative text-caption font-semibold text-inverse drop-shadow">{o.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* 11 — NEW ON CADO */}
          <ProductRow title="New on CADO" to="/browse" query={newOnCado} />

          {/* 12 — STORE SPOTLIGHT. Logo cards, not letter avatars. */}
          {stores.data && stores.data.length > 0 ? (
            <section className="pt-7">
              <SectionHead title="Stores on CADO" to="/browse" />
              <div className="scroll-row gap-3 px-4">
                {stores.data.map((store) => (
                  <Link
                    key={store.id}
                    to={`/store/${store.id}`}
                    className="w-[120px] shrink-0 rounded-card bg-surface p-3 text-center shadow-rest transition-transform duration-fast active:scale-[0.97]"
                  >
                    <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-card bg-surface">
                      <img
                        src={store.logo_url || store.cover_image_url || "/categories/gift-card.jpg"}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-tight">{store.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* 13 — HOW CADO WORKS. A quiet, typographic break. */}
          <section className="mx-auto max-w-6xl px-4 pt-8">
            <RibbonDivider className="mb-5" />
            <h2 className="text-center font-display text-h2">How CADO works</h2>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
              {HOW_IT_WORKS.map((s) => (
                <div
                  key={s.n}
                  className="w-[220px] shrink-0 rounded-card bg-surface p-5 text-center shadow-rest sm:w-auto"
                >
                  <p className="font-display text-h1 text-line">{s.n}</p>
                  <s.Icon className="mx-auto mt-1 h-7 w-7 text-muted" />
                  <p className="mt-3 text-body font-semibold">{s.title}</p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 14 — WHY CADO. 2x2 on mobile. */}
          <section className="mx-auto max-w-6xl px-4 pt-7">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WHY_CADO.map((w) => (
                <div
                  key={w.label}
                  className="flex flex-col items-center gap-2 rounded-card bg-surface py-5 text-center shadow-rest"
                >
                  <w.Icon className="h-6 w-6 text-muted" />
                  <span className="text-caption font-medium text-muted">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 15 — SAY SOMETHING WITH IT. The emotional beat. */}
          <section className="mx-auto max-w-6xl px-4 pt-7">
            <div className="flex flex-col overflow-hidden rounded-card bg-ribbon-tint sm:flex-row sm:items-center">
              <div className="px-6 py-6 sm:flex-1">
                <p className="font-display text-h2">Say something with it</p>
                <p className="mt-2 text-body text-muted">Add a handwritten note to any gift, free.</p>
              </div>
              <div className="h-36 sm:h-40 sm:w-56 sm:shrink-0">
                <img src="/misc/handwritten-note.jpg" alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            </div>
          </section>

          {/* 15b — INSTAGRAM STRIP. Static images and a profile link only —
              no API, no fake feed. Every tile opens @cado.lb. */}
          <section className="pt-8">
            <div className="mx-auto max-w-6xl px-4 pb-3">
              <a
                href="https://instagram.com/cado.lb"
                target="_blank"
                rel="noreferrer"
                className="tap-44 text-eyebrow font-semibold uppercase tracking-widest text-muted"
              >
                @CADO.LB on Instagram
              </a>
            </div>
            <div className="scroll-row gap-2 px-4 pb-1">
              {INSTAGRAM_IMAGES.map((src, i) => (
                <a
                  key={i}
                  href="https://instagram.com/cado.lb"
                  target="_blank"
                  rel="noreferrer"
                  className="block h-28 w-28 shrink-0 overflow-hidden rounded-card"
                >
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
              <a
                href="https://instagram.com/cado.lb"
                target="_blank"
                rel="noreferrer"
                className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-card bg-surface-sunk text-center"
              >
                <InstagramIcon className="h-5 w-5" />
                <span className="text-caption font-medium">Follow us</span>
              </a>
            </div>
          </section>

          {/* 15c — PARTNER WITH CADO. The full /partners pitch, full-bleed. It
              sits down here on purpose, past the shopping, because a shopper
              buying a birthday present is not the audience — but a store owner
              who scrolls this far is. Content mirrors Partners.tsx 1:1 (shared
              constants), and /partners stays as the linkable page. No store
              count and no logos: there is nothing real to show yet. */}
          <section className="mt-8 bg-ink text-inverse">
            <div className="mx-auto max-w-6xl px-4 py-8">
              <p className="text-eyebrow uppercase text-gold">For store owners</p>
              <h2 className="mt-3 font-display text-h1 sm:text-display">Own a store? Sell on CADO.</h2>
              <p className="mt-3 max-w-lg text-body text-inverse/70">
                Reach customers across Lebanon who are looking for a gift right now. You keep doing what
                you do — we handle the storefront, the orders, and the delivery.
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
                <ButtonLink to={`mailto:${PARTNER_EMAIL}`} variant="secondary" className="!bg-canvas !text-ink !ring-0">
                  Become a partner
                </ButtonLink>
                <ButtonLink
                  to={`https://wa.me/${PARTNER_WHATSAPP_NUMBER}`}
                  variant="secondary"
                  className="!text-inverse !ring-inverse/30"
                  target="_blank"
                  rel="noreferrer"
                >
                  Talk to us on WhatsApp
                </ButtonLink>
              </div>
            </div>
          </section>

          {/* Reviews — hidden until real ones exist. */}
          {REVIEWS.length > 0 ? (
            <section className="pt-7">
              <SectionHead title="What people are saying" />
              <div className="scroll-row gap-3 px-4">
                {REVIEWS.map((r, i) => (
                  <div key={i} className="w-[240px] shrink-0 rounded-card bg-surface p-4 shadow-rest">
                    <p className="mt-2 line-clamp-2 text-body text-muted">“{r.quote}”</p>
                    <p className="mt-2 text-caption font-medium text-muted">
                      {r.name}, {r.city}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* 16 — FOOTER */}
          {/* Continuous with the dark partner block above — a hairline instead
              of a canvas stripe between two full-bleed dark sections. */}
          <footer className="border-t border-inverse/10 bg-ink px-4 py-8 text-inverse/60">
            <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-card bg-gold font-display text-[13px] font-semibold text-ink">
                    C
                  </span>
                  <span className="font-display text-h2 tracking-[0.14em] text-inverse">CADO</span>
                </div>
                <p className="mt-3 text-caption">Gifts, delivered the same day, across Lebanon.</p>
              </div>

              <div>
                <p className="text-eyebrow uppercase text-inverse/30">Shop</p>
                <div className="mt-1 flex flex-col text-body">
                  <FooterLink to="/browse">Categories</FooterLink>
                  <FooterLink to="/gift-finder">Occasions</FooterLink>
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
        </>
      )}
    </div>
  );
}
