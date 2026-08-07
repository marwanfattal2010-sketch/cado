import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useTrendingProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { HeroCarousel } from "../components/HeroCarousel";
import {
  SearchIcon,
  GiftIcon,
  FlowerIcon,
  JewelryIcon,
  PerfumeIcon,
  ChocolateIcon,
  FashionIcon,
  ShoeIcon,
  ToyIcon,
  HomeGiftIcon,
  ElectronicsIcon,
} from "../components/Icons";

const CATEGORY_ICON: Record<string, ComponentType<{ className?: string }>> = {
  fashion: FashionIcon,
  shoes: ShoeIcon,
  toys: ToyIcon,
  perfumes: PerfumeIcon,
  chocolate: ChocolateIcon,
  "jewelry-accessories": JewelryIcon,
  "home-gifts": HomeGiftIcon,
  "flowers-gifts": FlowerIcon,
  electronics: ElectronicsIcon,
};

const CATEGORY_BG: Record<string, string> = {
  fashion: "bg-[#EDE6F5]",
  shoes: "bg-[#F3E3D8]",
  toys: "bg-[#FCEFD9]",
  perfumes: "bg-[#FBE4E4]",
  chocolate: "bg-[#F0E6DC]",
  "jewelry-accessories": "bg-[#F6EBD9]",
  "home-gifts": "bg-[#E8F0E7]",
  "flowers-gifts": "bg-[#FBEAE0]",
  electronics: "bg-[#E7ECF2]",
};

const OCCASIONS = [
  { name: "Birthday", from: "#E7A98F", to: "#C15E3F" },
  { name: "Visiting Someone", from: "#B7A0C9", to: "#7C5E98" },
  { name: "Graduation", from: "#9FB8A8", to: "#5F7D6B" },
  { name: "Anniversary", from: "#D69AA8", to: "#A85D6E" },
  { name: "New Baby", from: "#A8C0D6", to: "#5C7D96" },
  { name: "Get Well Soon", from: "#E0C48A", to: "#B08F4E" },
];

export function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();

  return (
    <div>
      <section className="relative flex h-[60vh] min-h-[380px] flex-col items-center justify-center px-6 text-center">
        <HeroCarousel />
        <p className="relative text-[11px] font-medium tracking-[0.35em] text-gold">NEED A GIFT TODAY</p>
        <h1 className="relative mt-3 max-w-md font-display text-3xl leading-tight tracking-wide text-white sm:max-w-xl sm:text-5xl">
          Find the perfect gift and have it delivered the same day.
        </h1>
        <Link
          to="/gift-finder"
          className="relative mt-8 inline-block rounded-full bg-cream px-10 py-4 text-sm font-medium tracking-wide text-ink"
        >
          Find a gift
        </Link>
      </section>

      <div className="mx-auto max-w-6xl px-6 pt-4">
        <Link
          to="/search"
          className="flex items-center gap-3 rounded-full border border-ink/12 bg-white px-5 py-3.5 text-sm text-ink/40 shadow-sm"
        >
          <SearchIcon className="h-[18px] w-[18px] shrink-0" />
          Search stores or gifts...
        </Link>
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <h2 className="text-sm font-semibold tracking-widest text-ink/50">SHOP BY CATEGORY</h2>
      </section>

      <section className="mx-auto max-w-6xl">
        <div className="flex gap-4 overflow-x-auto px-6 pb-5">
          {categories.data?.map((cat) => {
            const Icon = CATEGORY_ICON[cat.slug] ?? GiftIcon;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex w-16 shrink-0 flex-col items-center gap-2 text-center"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-ink/65 ${CATEGORY_BG[cat.slug] ?? "bg-ink/5"}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">{cat.name}</span>
              </Link>
            );
          })}
          <Link to="/gift-cards" className="flex w-16 shrink-0 flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9E3DE] text-ink/65">
              <GiftIcon className="h-6 w-6" />
            </div>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink/70">Gift Cards</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-4 pb-6">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">SHOP BY OCCASION</h2>
        <div className="flex flex-col gap-3">
          {OCCASIONS.map((o) => (
            <Link
              key={o.name}
              to="/gift-finder"
              className="relative flex aspect-[21/8] items-end overflow-hidden rounded-2xl p-5"
              style={{ background: `linear-gradient(135deg, ${o.from}, ${o.to})` }}
            >
              <span className="font-display text-xl font-semibold text-white drop-shadow sm:text-2xl">
                {o.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {trending.data && trending.data.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-ink/50">TRENDING GIFTS</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {trending.data.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
