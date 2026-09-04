import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { formatMoney } from "../../../lib/money";

/**
 * The category hero — three slides, and the colour comes from the PHOTOGRAPH.
 *
 * It used to be a flat panel painted in the category's own accent with the
 * product washed into it: purple on Jewels, rose on Flowers, terracotta on
 * Fashion. That is what made eleven tabs look like eleven different shops,
 * and it dimmed the one thing worth looking at to make room for a colour.
 *
 * Now the photo is full-bleed and untinted. The only overlay is a dark scrim
 * in the bottom-left corner — black at 55% fading to nothing by 60% across —
 * which is there purely so white type stays readable on a pale photo. It adds
 * no hue of its own, so a green bouquet still looks green.
 *
 * Slide 1 sells the category. Slides 2 and 3 each show a real product with
 * its real price, and both the slide and the price chip open that product.
 */

export type HeroSlide = {
  key: string;
  photo: string | null;
  headline: string;
  subline: string;
  /** Slides 2 and 3 only: a real product to open. */
  productId?: string;
  price?: number;
  currency?: string;
};

const SCRIM =
  "linear-gradient(to top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.42) 28%, rgba(0,0,0,0.12) 48%, rgba(0,0,0,0) 60%)";

export function CategoryHero({
  slides,
  shopAllHref,
}: {
  slides: HeroSlide[];
  /** Slide 1 opens the whole category on the results page. */
  shopAllHref: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (slides.length === 0) return null;

  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  return (
    <div>
      <div
        ref={rail}
        onScroll={onScroll}
        /* No touch-action: the browser picks the axis, so a vertical drag
           starting on the hero scrolls the page. */
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s) => (
          <section
            key={s.key}
            className="relative h-[220px] w-full shrink-0 snap-start overflow-hidden bg-surface-sunk"
          >
            {s.photo ? (
              <Img src={s.photo} eager className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <span aria-hidden className="absolute inset-0" style={{ background: SCRIM }} />

            <div className="absolute inset-x-0 bottom-0 p-4">
              <h2 className="max-w-[15ch] font-display text-[24px] leading-[1.08] text-white">
                {s.headline}
              </h2>
              <p className="mt-1.5 max-w-[26ch] text-[13px] leading-snug text-white/85">
                {s.subline}
              </p>

              {s.productId ? (
                /* A real price, and it opens that exact product. */
                <Link
                  to={`/product/${s.productId}`}
                  className="mt-3 inline-flex min-h-[40px] items-center gap-2 bg-white px-4 text-[13px] font-bold text-ink"
                >
                  <span>{formatMoney(s.price ?? 0)}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em]">Shop</span>
                </Link>
              ) : (
                <Link
                  to={shopAllHref}
                  /* A white box on every tab — the one treatment that reads
                     the same over any photograph. */
                  className="mt-3 inline-flex min-h-[40px] items-center border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-transform duration-press ease-out active:scale-[0.97]"
                >
                  Shop now
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {slides.map((s, i) => (
            <span
              key={s.key}
              aria-hidden
              className="h-1.5 rounded-pill transition-all"
              style={{
                width: i === active ? 18 : 6,
                background: i === active ? "rgb(var(--persimmon))" : "#d6cfc5",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
