import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useSearchProducts } from "../hooks/useProducts";
import { useSearchStores, useTopStores, useStoreProducts } from "../hooks/useStores";
import { HeroCarousel } from "../components/HeroCarousel";
import { ProductCard } from "../components/ProductCard";
import {
  SearchIcon,
  GiftIcon,
  PlusIcon,
  StarIcon,
  WrapIcon,
  ShieldCheckIcon,
  WalletIcon,
  TruckIcon,
  InstagramIcon,
  WhatsAppIcon,
  TikTokIcon,
} from "../components/Icons";

const BUDGETS = ["Under $25", "$25 – $50", "$50 – $100", "$100+"];

const RECIPIENTS = [
  { name: "For Her", img: "/recipients/for-her.jpg" },
  { name: "For Him", img: "/recipients/for-him.jpg" },
  { name: "For Mom", img: "/recipients/for-mom.jpg" },
  { name: "For Dad", img: "/recipients/for-dad.jpg" },
  { name: "For Kids", img: "/recipients/for-kids.jpg" },
  { name: "For Couples", img: "/recipients/for-couples.jpg" },
  { name: "For Your Best Friend", img: "/recipients/for-best-friend.jpg" },
];

// Birthday quick chips -> real category slugs.
const BIRTHDAY_CHIPS = [
  { name: "Flowers", slug: "flowers-gifts" },
  { name: "Chocolate", slug: "chocolate" },
  { name: "Jewelry", slug: "jewelry-accessories" },
  { name: "Perfume", slug: "perfumes" },
  { name: "Shoes", slug: "shoes" },
  { name: "Toys", slug: "toys" },
];

const MORE_OCCASIONS = [
  { name: "Anniversary", img: "/occasions/anniversary.jpg" },
  { name: "Graduation", img: "/occasions/graduation.jpg" },
  { name: "New Baby", img: "/occasions/new-baby.jpg" },
  { name: "Get Well Soon", img: "/occasions/get-well-soon.jpg" },
  { name: "Visiting Someone", img: "/occasions/visiting-someone.jpg" },
  { name: "Wedding", img: "/occasions/wedding.jpg" },
  { name: "Engagement", img: "/occasions/engagement.jpg" },
];

// ---------------------------------------------------------------------
// PLACEHOLDER product data. None of these are real rows in the database —
// there's no "trending", "most gifted", "under $25", or "new" query built
// yet. This is realistic-looking filler so the rows aren't empty; swap
// each row for a real query (useTrendingProducts, an order-count-by-
// occasion aggregate, a price-range filter, a created_at sort) once
// there's real inventory/order history to power it.
// ---------------------------------------------------------------------
const PLACEHOLDER_CATALOG = [
  { name: "Bouquet of Red Roses", store: "Beirut Blooms", img: "/products/roses.jpg" },
  { name: "Chocolate Gift Box", store: "Cocoa & Co.", img: "/products/chocolate-box.jpg" },
  { name: "Silver Charm Bracelet", store: "Maison Zahra Jewellers", img: "/products/bracelet.jpg" },
  { name: "Scented Candle Set", store: "Beirut Beauty Bar", img: "/products/candle-set.jpg" },
  { name: "Signature Perfume", store: "Essence House", img: "/products/perfume.jpg" },
  { name: "Plush Teddy Bear", store: "Playground Co.", img: "/products/teddy-bear.jpg" },
  { name: "Coffee Mug Duo", store: "Cedar Street Fashion", img: "/products/mug-set.jpg" },
  { name: "Wireless Earbuds", store: "Anchor & Oak", img: "/products/earbuds.jpg" },
];
function placeholderRow(prices: number[]) {
  return PLACEHOLDER_CATALOG.map((item, i) => ({ ...item, price: prices[i] }));
}
const TRENDING_ROW = placeholderRow([42, 38, 65, 34, 78, 22, 19, 89]);
const BIRTHDAY_GIFTED_ROW = placeholderRow([45, 40, 68, 30, 72, 25, 21, 95]);
const UNDER_25_ROW = placeholderRow([18, 15, 22, 12, 20, 14, 10, 24]);
const NEW_ROW = placeholderRow([40, 36, 60, 32, 75, 24, 18, 85]);

const HOW_IT_WORKS = [
  { n: "1", Icon: GiftIcon, title: "Pick a gift", desc: "Browse real stock from stores across Lebanon." },
  { n: "2", Icon: WrapIcon, title: "We wrap it", desc: "Every order comes gift-wrapped, with your note inside." },
  { n: "3", Icon: TruckIcon, title: "Delivered today", desc: "Order before 4PM and it arrives the same day." },
];

const WHY_CADO = [
  { Icon: TruckIcon, label: "Same-day delivery" },
  { Icon: WrapIcon, label: "Free gift wrapping" },
  { Icon: ShieldCheckIcon, label: "Verified Lebanese stores" },
  { Icon: WalletIcon, label: "Pay on delivery" },
];

// No real reviews exist yet on a brand-new marketplace — inventing
// testimonials is easy to spot and would cost trust before it's earned.
// This section is fully built but renders nothing until REVIEWS has real
// entries in it.
const REVIEWS: { name: string; city: string; quote: string }[] = [];

// The @cado.lb account doesn't exist yet. These are placeholder images,
// hardcoded here so they're easy to find and swap for a real Instagram
// feed (or remove) once the account is live. No Instagram API/embed is
// used — just static images and a profile link.
const SHOW_INSTAGRAM = true;
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

// Placeholders — replace with the real WhatsApp Business number and a
// confirmed inbox before this goes live for real store owners.
const PARTNER_WHATSAPP_NUMBER = "96170000000"; // TODO: real number
const PARTNER_EMAIL = "partners@cadolebanon.com"; // TODO: confirm real inbox
// Stays hidden until there's a real count worth showing.
const PARTNER_STORE_COUNT = 0;

function currentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.floor(days / 7);
}

function MiniProductCard({
  name,
  store,
  img,
  price,
}: {
  name: string;
  store: string;
  img: string;
  price: number;
}) {
  return (
    <div className="w-[150px] shrink-0">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink/5">
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
        {/* Placeholder items have no real product id yet, so this button is
            inert — wire it to the real add-to-cart mutation once these rows
            read from the database. */}
        <button
          type="button"
          aria-label="Add to cart"
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-md"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-ink/40">{store}</p>
      <p className="mt-0.5 text-sm font-bold">USD {price}</p>
    </div>
  );
}

function RowHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-3">
      <h2 className="text-sm font-semibold tracking-widest text-ink/50">{title}</h2>
      <Link to={to} className="text-xs font-medium text-ink/50">
        See all →
      </Link>
    </div>
  );
}

export function Home() {
  const categories = useCategories();
  const stores = useTopStores();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const searchProducts = useSearchProducts(query);
  const searchStores = useSearchStores(query);

  const spotlightStore =
    stores.data && stores.data.length > 0 ? stores.data[currentWeekNumber() % stores.data.length] : null;
  const spotlightProducts = useStoreProducts(spotlightStore?.id);

  return (
    <div>
      {/* 1. Hero — ~40vh, in normal flow below the sticky header so the
          headline is never covered by it. */}
      <section className="relative flex h-[40vh] min-h-[280px] flex-col items-center justify-center px-6 text-center">
        <HeroCarousel />
        <p className="relative text-[11px] font-medium tracking-[0.35em] text-gold">NEED A GIFT TODAY</p>
        <h1 className="relative mt-2 max-w-md font-display text-2xl leading-tight tracking-wide text-white sm:max-w-xl sm:text-4xl">
          Find the perfect gift and have it delivered the same day.
        </h1>
        <Link
          to="/gift-finder"
          className="relative mt-6 inline-block rounded-full bg-cream px-8 py-3 text-sm font-medium tracking-wide text-ink"
        >
          Find a gift
        </Link>
      </section>

      {/* 2. Search bar — searches inline, no navigation */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <div className="flex items-center gap-3 rounded-full border border-ink/12 bg-white px-5 py-3.5 text-sm shadow-sm">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores or gifts..."
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      {searching ? (
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-10">
          {searchStores.data && searchStores.data.length > 0 ? (
            <>
              <h2 className="mb-3 text-sm font-semibold tracking-widest text-ink/50">STORES</h2>
              <div className="flex flex-col gap-3">
                {searchStores.data.map((s) => (
                  <Link
                    key={s.id}
                    to={`/store/${s.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-ink/5"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink/5">
                      {s.cover_image_url ? (
                        <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      {s.description ? <p className="truncate text-sm text-ink/50">{s.description}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          <h2 className="mb-3 mt-8 text-sm font-semibold tracking-widest text-ink/50">GIFTS</h2>
          {searchProducts.data && searchProducts.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {searchProducts.data.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/40">No gifts match "{query}".</p>
          )}
        </div>
      ) : (
        <>
          {/* 3. Gift Cards banner */}
          <section className="mx-auto max-w-6xl px-6 pt-6">
            <Link
              to="/gift-cards/send"
              className="flex h-[100px] items-center justify-between gap-4 rounded-2xl bg-ink px-6 text-cream"
            >
              <div>
                <p className="font-display text-base font-semibold sm:text-lg">Not sure what to get?</p>
                <p className="text-xs text-cream/60">Send a CADO gift card instead.</p>
              </div>
              <GiftIcon className="h-8 w-8 shrink-0 text-gold" />
            </Link>
          </section>

          {/* 4. Shop by Category — real photo squares, 5-and-5 grid, no swiping */}
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY CATEGORY</h2>
          </section>
          <section className="mx-auto max-w-6xl px-6 pb-2">
            <div className="grid grid-cols-5 gap-x-2 gap-y-4">
              {categories.data?.map((cat) => (
                <Link key={cat.id} to={`/category/${cat.slug}`} className="flex flex-col items-center gap-2 text-center">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/8">
                    <img src={`/categories/${cat.slug}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">{cat.name}</span>
                </Link>
              ))}
              <Link to="/gift-cards" className="flex flex-col items-center gap-2 text-center">
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/8">
                  <img src="/categories/gift-card.jpg" alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">Gift Cards</span>
              </Link>
            </div>
          </section>

          {/* 5. Birthday Gifts — the flagship path, most visual weight */}
          <section className="mx-auto max-w-6xl px-6 pt-8">
            <div className="relative flex h-[190px] flex-col justify-end overflow-hidden rounded-3xl p-6">
              <img
                src="/occasions/birthday-banner.jpg"
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
              <p className="relative font-display text-2xl font-semibold text-white drop-shadow sm:text-3xl">
                Birthday coming up?
              </p>
              <p className="relative mt-1 text-sm text-white/85 drop-shadow">Same-day gifts, sorted by what always lands.</p>
            </div>
            <div className="scroll-row -mx-6 mt-3 gap-2 px-6">
              {BIRTHDAY_CHIPS.map((c) => (
                <Link
                  key={c.slug}
                  to={`/category/${c.slug}`}
                  className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-ink/10"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>

          {/* 6. Trending this week (placeholder product row) */}
          <div className="pt-8">
            <RowHeader title="TRENDING THIS WEEK" to="/browse" />
          </div>
          <section className="scroll-row gap-3 px-6 pb-1">
            {TRENDING_ROW.map((p, i) => (
              <MiniProductCard key={i} {...p} />
            ))}
          </section>

          {/* 7. Shop by Budget — flat pills, no photos */}
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY BUDGET</h2>
          </section>
          <section className="scroll-row gap-2 px-6 pb-1">
            {BUDGETS.map((b) => (
              <Link
                key={b}
                to="/gift-finder"
                className="shrink-0 rounded-full bg-ink/5 px-5 py-2.5 text-sm font-semibold text-ink"
              >
                {b}
              </Link>
            ))}
          </section>

          {/* 8. Under $25 (placeholder product row) — right under the budget pills */}
          <div className="pt-6">
            <RowHeader title="UNDER $25" to="/gift-finder" />
          </div>
          <section className="scroll-row gap-3 px-6 pb-1">
            {UNDER_25_ROW.map((p, i) => (
              <MiniProductCard key={i} {...p} />
            ))}
          </section>

          {/* 9. Shop by Recipient — photo cards */}
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY RECIPIENT</h2>
          </section>
          <section className="scroll-row gap-3 px-6 pb-1">
            {RECIPIENTS.map((r) => (
              <Link
                key={r.name}
                to="/gift-finder"
                className="relative flex h-[150px] w-[120px] shrink-0 items-end overflow-hidden rounded-2xl p-3"
              >
                <img src={r.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative font-display text-sm font-semibold text-white drop-shadow">{r.name}</span>
              </Link>
            ))}
          </section>

          {/* 10. Most gifted for birthdays (placeholder product row) */}
          <div className="pt-8">
            <RowHeader title="MOST GIFTED FOR BIRTHDAYS" to="/gift-finder" />
          </div>
          <section className="scroll-row gap-3 px-6 pb-1">
            {BIRTHDAY_GIFTED_ROW.map((p, i) => (
              <MiniProductCard key={i} {...p} />
            ))}
          </section>

          {/* 11. More Occasions — deliberately small, secondary */}
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">MORE OCCASIONS</h2>
          </section>
          <section className="scroll-row gap-2.5 px-6 pb-1">
            {MORE_OCCASIONS.map((o) => (
              <Link
                key={o.name}
                to="/gift-finder"
                className="relative flex h-[140px] w-[100px] shrink-0 items-end overflow-hidden rounded-xl p-2.5"
              >
                <img src={o.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative text-xs font-semibold text-white drop-shadow">{o.name}</span>
              </Link>
            ))}
          </section>

          {/* 12. New on CADO (placeholder product row) */}
          <div className="pt-8">
            <RowHeader title="NEW ON CADO" to="/browse" />
          </div>
          <section className="scroll-row gap-3 px-6 pb-1">
            {NEW_ROW.map((p, i) => (
              <MiniProductCard key={i} {...p} />
            ))}
          </section>

          {/* 13. Store spotlight — rotates weekly (currentWeekNumber() indexes into
              the top-stores list, so a new store surfaces each week automatically) */}
          {stores.data && stores.data.length > 0 ? (
            <>
              <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
                <h2 className="text-sm font-semibold tracking-widest text-ink/50">STORE SPOTLIGHT</h2>
              </section>
              <section className="scroll-row gap-4 px-6 pb-4">
                {stores.data.map((store) => (
                  <Link
                    key={store.id}
                    to={`/store/${store.id}`}
                    className="flex w-16 shrink-0 flex-col items-center gap-2 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-ink/10">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base font-semibold text-ink/40">{store.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">{store.name}</span>
                  </Link>
                ))}
              </section>
              {spotlightStore ? (
                <section className="mx-auto max-w-6xl px-6">
                  <Link
                    to={`/store/${spotlightStore.id}`}
                    className="block overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5"
                  >
                    <div className="relative h-[140px]">
                      {spotlightStore.cover_image_url ? (
                        <img
                          src={spotlightStore.cover_image_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <p className="absolute bottom-3 left-4 font-display text-lg font-semibold text-white drop-shadow">
                        {spotlightStore.name}
                      </p>
                    </div>
                    {spotlightStore.description ? (
                      <p className="px-4 pt-3 text-sm text-ink/60">{spotlightStore.description}</p>
                    ) : null}
                  </Link>
                  {spotlightProducts.data && spotlightProducts.data.length > 0 ? (
                    <div className="scroll-row -mx-6 mt-3 gap-3 px-6 pb-2">
                      {spotlightProducts.data.slice(0, 4).map((p) => (
                        <div key={p.id} className="w-32 shrink-0">
                          <ProductCard {...p} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}

          {/* 14. How CADO works — calm, typographic break between busy sections */}
          <section className="mx-auto max-w-6xl px-6 pt-10 pb-3">
            <h2 className="text-center text-sm font-semibold tracking-widest text-ink/50">HOW CADO WORKS</h2>
          </section>
          <section className="mx-auto max-w-6xl px-6 pb-2">
            <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible">
              {HOW_IT_WORKS.map((s) => (
                <div
                  key={s.n}
                  className="w-[220px] shrink-0 rounded-2xl bg-white p-6 text-center ring-1 ring-ink/5 sm:w-auto"
                >
                  <p className="font-display text-3xl font-semibold text-ink/15">{s.n}</p>
                  <s.Icon className="mx-auto mt-1 h-7 w-7 text-ink/70" />
                  <p className="mt-3 text-sm font-bold">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/50">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 15. Why CADO — icon strip, 2x2 on mobile */}
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-center text-sm font-semibold tracking-widest text-ink/50">WHY CADO</h2>
          </section>
          <section className="mx-auto max-w-6xl px-6 pb-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WHY_CADO.map((w) => (
                <div
                  key={w.label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white py-5 text-center ring-1 ring-ink/5"
                >
                  <w.Icon className="h-6 w-6 text-ink/70" />
                  <span className="text-xs font-medium text-ink/70">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 16. Add a note — the emotional beat, warmer and softer than the other banners */}
          <section className="mx-auto max-w-6xl px-6 pt-8">
            <div className="flex flex-col overflow-hidden rounded-3xl bg-[#FBF3EC] sm:flex-row sm:items-center">
              <div className="px-6 py-7 sm:flex-1">
                <p className="font-display text-xl font-semibold text-ink sm:text-2xl">Say something with it</p>
                <p className="mt-2 text-sm text-ink/60">Add a handwritten note to any gift, free.</p>
              </div>
              <div className="h-40 sm:h-44 sm:w-56 sm:shrink-0">
                <img
                  src="/misc/handwritten-note.jpg"
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>

          {/* 17. Reviews — hidden until REVIEWS has real entries (see comment above) */}
          {REVIEWS.length > 0 ? (
            <>
              <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
                <h2 className="text-sm font-semibold tracking-widest text-ink/50">WHAT PEOPLE ARE SAYING</h2>
              </section>
              <section className="scroll-row gap-3 px-6 pb-1">
                {REVIEWS.map((r, i) => (
                  <div key={i} className="w-[240px] shrink-0 rounded-2xl bg-white p-4 ring-1 ring-ink/5">
                    <div className="flex gap-0.5 text-gold">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <StarIcon key={s} className="h-4 w-4" filled />
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-ink/70">"{r.quote}"</p>
                    <p className="mt-2 text-xs font-medium text-ink/50">
                      {r.name}, {r.city}
                    </p>
                  </div>
                ))}
              </section>
            </>
          ) : null}

          {/* 18. Instagram strip — placeholder images, static link only, see comment above */}
          {SHOW_INSTAGRAM ? (
            <>
              <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
                <a
                  href="https://instagram.com/cado.lb"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold tracking-widest text-ink/50"
                >
                  @CADO.LB ON INSTAGRAM
                </a>
              </section>
              <section className="scroll-row gap-2 px-6 pb-1">
                {INSTAGRAM_IMAGES.map((src, i) => (
                  <a
                    key={i}
                    href="https://instagram.com/cado.lb"
                    target="_blank"
                    rel="noreferrer"
                    className="block h-28 w-28 shrink-0 overflow-hidden rounded-xl"
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </a>
                ))}
                <a
                  href="https://instagram.com/cado.lb"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-ink/5 text-center"
                >
                  <InstagramIcon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Follow us</span>
                </a>
              </section>
            </>
          ) : null}

          {/* 19. Partner With CADO — full-width dark section, second most valuable
              thing on the page after the product rows */}
          <section id="partner" className="mt-10 bg-ink px-6 py-12 text-cream">
            <div className="mx-auto max-w-6xl">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">FOR STORE OWNERS</p>
              <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Own a store? Sell on CADO.</h2>
              <p className="mt-3 max-w-lg text-sm text-cream/70">
                Reach customers across Lebanon who are looking for a gift right now. You keep doing what you
                do — we handle the storefront, the orders, and the delivery.
              </p>

              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <WalletIcon className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-semibold">No upfront cost</p>
                    <p className="mt-0.5 text-xs text-cream/60">You only pay when you sell.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TruckIcon className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-semibold">We deliver</p>
                    <p className="mt-0.5 text-xs text-cream/60">Same-day delivery across Lebanon, handled by us.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-semibold">New customers</p>
                    <p className="mt-0.5 text-xs text-cream/60">
                      Get discovered by people who weren't looking for your store, just the right gift.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`mailto:${PARTNER_EMAIL}`}
                  className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-ink"
                >
                  Become a partner
                </a>
                <a
                  href={`https://wa.me/${PARTNER_WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-cream/30 px-6 py-3 text-sm font-medium text-cream"
                >
                  Talk to us on WhatsApp
                </a>
              </div>

              {PARTNER_STORE_COUNT > 0 ? (
                <p className="mt-5 text-xs text-cream/50">Already trusted by {PARTNER_STORE_COUNT}+ stores in Lebanon.</p>
              ) : null}
            </div>
          </section>

          {/* 20. Footer */}
          <footer className="bg-[#0F0D0A] px-6 py-10 text-cream/60">
            <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <img src="/brand/icon.png" alt="" className="h-7 w-7 rounded-[7px]" />
                  <span className="font-display text-lg font-semibold tracking-[0.14em] text-cream">CADO</span>
                </div>
                <p className="mt-3 text-xs">Gifts, delivered the same day, across Lebanon.</p>
                <div className="mt-4 flex gap-3 text-cream/70">
                  <a href="https://instagram.com/cado.lb" target="_blank" rel="noreferrer" aria-label="Instagram">
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                  <a href={`https://wa.me/${PARTNER_WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                    <WhatsAppIcon className="h-5 w-5" />
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-widest text-cream/30">SHOP</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link to="/browse">Categories</Link>
                  <Link to="/gift-finder">Occasions</Link>
                  <Link to="/gift-cards">Gift Cards</Link>
                  <Link to="/gift-finder">Under $25</Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-widest text-cream/30">COMPANY</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link to="/about">About CADO</Link>
                  <a href="#partner">Partner with CADO</a>
                  <a href={`mailto:${PARTNER_EMAIL}`}>Contact</a>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-widest text-cream/30">HELP</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link to="/delivery-returns">Delivery &amp; Returns</Link>
                  <Link to="/orders">Track your order</Link>
                  <Link to="/privacy">Privacy Policy</Link>
                  <Link to="/terms">Terms of Service</Link>
                  <Link to="/help">FAQ</Link>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-6xl border-t border-cream/10 pt-6 text-xs">
              © 2026 CADO. Made in Lebanon.
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
