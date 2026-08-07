import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useTrendingProducts } from "../hooks/useProducts";
import { useTopStores } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";
import { HeroCarousel } from "../components/HeroCarousel";
import { SearchIcon, LightningIcon, GiftIcon } from "../components/Icons";

// --- Placeholder content -----------------------------------------------
// Everything below with a `from`/`to` gradient instead of an `img` is a
// placeholder: there's no real photography for offers, occasions, or
// recipients yet. Swap in real photos by replacing the gradient div with
// an <img>, same as the category circles and store logos already do.

const OFFERS = [
  { title: "Free delivery", sub: "On your first order", from: "#E7A98F", to: "#C15E3F" },
  { title: "Order by 4PM", sub: "Delivered today", from: "#A8C0D6", to: "#5C7D96" },
  { title: "Send a gift card", sub: "No wrapping required", from: "#C9A24B", to: "#8F6E2E" },
];

const BUDGETS = ["Under $25", "$25 – $50", "$50 – $100", "$100+"];

const RECIPIENTS = [
  { name: "For Her", from: "#D69AA8", to: "#A85D6E" },
  { name: "For Him", from: "#7C93A8", to: "#455A70" },
  { name: "For Mom", from: "#E7A98F", to: "#C15E3F" },
  { name: "For Dad", from: "#9FB0A0", to: "#5C7263" },
  { name: "For Kids", from: "#E0C48A", to: "#B08F4E" },
  { name: "For Couples", from: "#B7A0C9", to: "#7C5E98" },
  { name: "For Your Best Friend", from: "#A8C0D6", to: "#5C7D96" },
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
  { name: "Anniversary", from: "#D69AA8", to: "#A85D6E" },
  { name: "Graduation", from: "#9FB8A8", to: "#5F7D6B" },
  { name: "New Baby", from: "#A8C0D6", to: "#5C7D96" },
  { name: "Get Well Soon", from: "#E0C48A", to: "#B08F4E" },
  { name: "Visiting Someone", from: "#B7A0C9", to: "#7C5E98" },
  { name: "Wedding", from: "#E7B8A0", to: "#C08258" },
  { name: "Engagement", from: "#C9A0AC", to: "#93586A" },
];

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();
  const stores = useTopStores();

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

      {/* 2. Search bar */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <Link
          to="/search"
          className="flex items-center gap-3 rounded-full border border-ink/12 bg-white px-5 py-3.5 text-sm text-ink/40 shadow-sm"
        >
          <SearchIcon className="h-[18px] w-[18px] shrink-0" />
          Search stores or gifts...
        </Link>
      </div>

      {/* 3. Offers strip — 1.2 cards visible, bleeds to the screen edge */}
      <section className="mt-6">
        <div className="scroll-row gap-3 pl-6 pr-6">
          {OFFERS.map((o) => (
            <div
              key={o.title}
              className="relative flex h-[120px] w-[83%] shrink-0 flex-col justify-center overflow-hidden rounded-2xl p-5 sm:w-[320px]"
              style={{ background: `linear-gradient(120deg, ${o.from}, ${o.to})` }}
            >
              <p className="font-display text-lg font-semibold text-white">{o.title}</p>
              <p className="mt-1 text-sm text-white/80">{o.sub}</p>
              {/* placeholder illustration mark — swap for real art/photo */}
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/15" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Need it Today */}
      <section className="mx-auto max-w-6xl px-6 pt-5">
        <Link
          to="/browse"
          className="flex h-[100px] items-center gap-4 rounded-2xl bg-ink px-6 text-cream"
        >
          <LightningIcon className="h-7 w-7 shrink-0 text-gold" filled />
          <div>
            <p className="font-display text-base font-semibold sm:text-lg">Order before 4PM, get it today.</p>
            <p className="text-xs text-cream/60">Same-day delivery across Lebanon</p>
          </div>
        </Link>
      </section>

      {/* 5. Shop by Category — real photo circles */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
        <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY CATEGORY</h2>
      </section>
      <section>
        <div className="scroll-row gap-4 px-6 pb-2">
          {categories.data?.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="flex w-16 shrink-0 flex-col items-center gap-2 text-center"
            >
              <div className="h-14 w-14 overflow-hidden rounded-full bg-ink/5 ring-1 ring-ink/8">
                <img src={`/categories/${cat.slug}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">{cat.name}</span>
            </Link>
          ))}
          <Link to="/gift-cards" className="flex w-16 shrink-0 flex-col items-center gap-2 text-center">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-ink/5 ring-1 ring-ink/8">
              <img src="/categories/gift-card.jpg" alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">Gift Cards</span>
          </Link>
        </div>
      </section>

      {/* 6. Birthday Gifts — the flagship path, most visual weight */}
      <section className="mx-auto max-w-6xl px-6 pt-8">
        {/* placeholder banner (balloons/candles/wrapped gift) — swap the gradient below for a real photo */}
        <div
          className="relative flex h-[190px] flex-col justify-end overflow-hidden rounded-3xl p-6"
          style={{ background: "linear-gradient(135deg, #E7A98F 0%, #C15E3F 55%, #8B3D26 100%)" }}
        >
          <p className="font-display text-2xl font-semibold text-white drop-shadow sm:text-3xl">
            Birthday coming up?
          </p>
          <p className="mt-1 text-sm text-white/80">Same-day gifts, sorted by what always lands.</p>
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

      {/* 7. Trending This Week — real inventory, horizontal row */}
      {trending.data && trending.data.length > 0 ? (
        <>
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">TRENDING THIS WEEK</h2>
          </section>
          <section className="scroll-row gap-4 px-6 pb-1">
            {trending.data.map((p) => (
              <div key={p.id} className="w-36 shrink-0">
                <ProductCard {...p} />
              </div>
            ))}
          </section>
        </>
      ) : null}

      {/* 8. Shop by Budget — flat pills, no photos */}
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
            style={{ background: `linear-gradient(160deg, ${r.from}, ${r.to})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span className="relative font-display text-sm font-semibold text-white drop-shadow">{r.name}</span>
          </Link>
        ))}
      </section>

      {/* 10. Our Partner Stores — trust signal for the Lebanese market */}
      {stores.data && stores.data.length > 0 ? (
        <>
          <section className="mx-auto max-w-6xl px-6 pt-8 pb-3">
            <h2 className="text-sm font-semibold tracking-widest text-ink/50">OUR PARTNER STORES</h2>
          </section>
          <section className="scroll-row gap-4 px-6 pb-1">
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
        </>
      ) : null}

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
            style={{ background: `linear-gradient(160deg, ${o.from}, ${o.to})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <span className="relative text-xs font-semibold text-white drop-shadow">{o.name}</span>
          </Link>
        ))}
      </section>

      {/* 12. Gift Cards — closing banner */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-10">
        <Link
          to="/gift-cards/send"
          className="flex h-[110px] items-center justify-between gap-4 rounded-2xl bg-ink px-6 text-cream"
        >
          <div>
            <p className="font-display text-base font-semibold sm:text-lg">Not sure what to get?</p>
            <p className="text-xs text-cream/60">Send a CADO gift card instead.</p>
          </div>
          <GiftIcon className="h-8 w-8 shrink-0 text-gold" />
        </Link>
      </section>
    </div>
  );
}
