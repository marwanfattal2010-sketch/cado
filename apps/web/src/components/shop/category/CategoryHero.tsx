import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Img } from "../../Img";
import { formatMoney } from "../../../lib/money";

/**
 * The category hero — three slides, and the colour comes from the PHOTOGRAPH.
 *
 * THE TINT IS THE TAB'S ACCENT, and it is the first thing that tells you
 * which category you are standing in. Purple on Jewels, brown on Chocolate,
 * deep green on Sport.
 *
 * It is a GRADIENT, not a wash: the accent at 82% on the left where the type
 * sits, thinning to 20% by 70% across so the photograph is still a
 * photograph on the right-hand side. A flat panel of colour was the version
 * that dimmed the product to make room for the hue; this one keeps both.
 *
 * A pure black scrim would be safer for contrast and says nothing. The point
 * of the hero is to be unmistakably this tab and no other.
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

/**
 * The accent at 82% where the type sits, thinning to 20% by 70% across so
 * the right-hand side of the photograph is still a photograph.
 *
 * Takes the CHANNEL TRIPLE ("107 63 160"), not a formatted colour: the
 * space-separated form is the only one that can carry a slash alpha, and
 * building `rgba(107 63 160, .8)` by string surgery on an rgb() produces a
 * colour every browser silently drops.
 */
const scrimFor = (t: string) =>
  `linear-gradient(to right, rgb(${t} / 0.82) 0%, rgb(${t} / 0.55) 38%, rgb(${t} / 0.20) 70%)`;

export function CategoryHero({
  slides,
  shopAllHref,
  onShopAll,
  accentTriple,
}: {
  slides: HeroSlide[];
  /** The tab's hue as a channel triple. Tints the scrim and the active dot. */
  accentTriple: string;
  /** Slide 1 opens the whole category on the results page. */
  shopAllHref: string;
  /**
   * On a tab that filters its own grid, SHOP NOW scrolls to that grid instead
   * of navigating. Same button, same white box — it just stays on the page.
   */
  onShopAll?: () => void;
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
            <span aria-hidden className="absolute inset-0" style={{ background: scrimFor(accentTriple) }} />

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
                onShopAll ? (
                  /* A white box on every tab — the one treatment that reads
                     the same over any photograph. */
                  <button type="button" onClick={onShopAll} className="mt-3 inline-flex min-h-[40px] items-center border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-transform duration-press ease-out active:scale-[0.97]">
                    Shop now
                  </button>
                ) : (
                  <Link to={shopAllHref} className="mt-3 inline-flex min-h-[40px] items-center border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-transform duration-press ease-out active:scale-[0.97]">
                    Shop now
                  </Link>
                )
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
                background: i === active ? `rgb(${accentTriple})` : "#d6cfc5",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
