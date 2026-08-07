import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useSearchProducts } from "../hooks/useProducts";
import { useSearchStores } from "../hooks/useStores";
import { HeroCarousel } from "../components/HeroCarousel";
import { ProductCard } from "../components/ProductCard";
import { SearchIcon, GiftIcon } from "../components/Icons";

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

export function Home() {
  const categories = useCategories();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const searchProducts = useSearchProducts(query);
  const searchStores = useSearchStores(query);

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
          {/* 4. Gift Cards banner */}
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

      {/* 5. Shop by Category — real photo squares, 5-and-5 grid, no swiping */}
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

      {/* 6. Birthday Gifts — the flagship path, most visual weight */}
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

      {/* 8. Shop by Recipient — photo cards */}
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

      {/* 9. More Occasions — deliberately small, secondary */}
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

          <div className="pb-10" />
        </>
      )}
    </div>
  );
}
