import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Img } from "../../Img";

/**
 * THE HERO, AND EVERY CATEGORY TAB USES THIS ONE.
 *
 * There were three of them: Fashion's crossfading photo band, Flowers' cream
 * serif panel, and `CategoryHero`'s accent-tinted carousel for the other nine.
 * Three heroes meant three answers to every question — how tall, what weight,
 * is there a subtitle, is the button filled — and a shopper swiping across the
 * tab strip watched the top of the app rebuild itself each time.
 *
 * Every number below is measured off the Fashion tab as it shipped, because
 * that is the one Marwan signed off. Nothing here is a prop:
 *
 *   height     200px          scrim      black 55% -> 22% at 45% -> clear 78%
 *   title      25px / 700     max-width  240px, two lines
 *   leading    1.1            tracking   -0.4px
 *   SHOP NOW   12px / 700 uppercase, 0.1em tracking, persimmon fill
 *   AI link    12.5px / 600, underlined white
 *
 * NO SUBTITLES. Fashion had none and the others did, so they went — a hero
 * with one line of type on one tab and three on the next is the same
 * inconsistency in miniature.
 *
 * PER-TAB INPUTS ARE EXACTLY THREE: the photographs, the title, and where
 * SHOP NOW goes. A tab cannot reach anything else, which is what stops this
 * drifting apart again.
 */

export function TabHero({
  slides,
  title,
  shopHref,
  onShopAll,
}: {
  /** One or more photographs. Two or more crossfade; one sits still. */
  slides: string[];
  /** Up to two lines. Wraps inside 240px and clamps at two. */
  title: string;
  shopHref: string;
  /**
   * On a tab that filters its own grid, SHOP NOW scrolls to that grid instead
   * of navigating. Same button, same box — it just stays on the page.
   */
  onShopAll?: () => void;
}) {
  const [active, setActive] = useState(0);

  /*
   * A CROSSFADE, NOT A SWIPE RAIL.
   *
   * The hero used to be a horizontal scroller: it only moved if you dragged
   * it, so most people saw slide one and never learned the others existed. It
   * fades on its own every five seconds now — and only when there is more than
   * one slide, because a lone banner animating to itself is a repaint nobody
   * asked for.
   *
   * Stacked and opacity-crossfaded rather than translated: a transform on an
   * ancestor breaks position:fixed for every descendant, which is a trap this
   * codebase has already been caught by once.
   */
  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section>
      <div className="relative h-[200px] w-full overflow-hidden bg-[#8E8474]">
        {slides.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: i === active ? 1 : 0 }}
            aria-hidden={i !== active}
          >
            <Img src={src} eager className="absolute inset-0 h-full w-full object-cover" />
            {/* Bottom-up scrim. Deep enough at the foot to hold white type
                over any photograph, gone by two-thirds up so the picture is
                still a picture. BLACK, not the tab's accent: an accent-tinted
                scrim made a green bouquet olive and a gold necklace brown. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.22) 45%, transparent 78%)",
              }}
            />
          </div>
        ))}

        {/* OUTSIDE the slide loop, so the words do not fade with the picture
            behind them — the title is the same on every slide. */}
        <div className="absolute inset-x-0 bottom-0 px-[18px] pb-4">
          <h2 className="line-clamp-2 max-w-[240px] text-[25px] font-bold leading-[1.1] tracking-[-0.4px] text-white">
            {title}
          </h2>
          <div className="mt-3 flex items-center gap-3.5">
            {onShopAll ? (
              <button
                type="button"
                onClick={onShopAll}
                className="card-press bg-persimmon px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-white"
              >
                Shop now
              </button>
            ) : (
              <Link
                to={shopHref}
                className="card-press bg-persimmon px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-white"
              >
                Shop now
              </Link>
            )}
            <Link
              to="/assistant"
              className="border-b border-white/60 pb-0.5 text-[12.5px] font-semibold text-white"
            >
              ✨ Let AI help me choose
            </Link>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1.5">
            {slides.map((s, i) => (
              <span
                key={s}
                aria-hidden
                className="h-1.5 rounded-pill bg-white transition-all"
                style={{ width: i === active ? 18 : 6, opacity: i === active ? 1 : 0.5 }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * ONE SECTION HEADING, and every section title on every tab is this.
 *
 * Measured off Fashion's "Popular brands": 22px, bold, near-black, -0.01em.
 * The optional right-hand link matches its "See all 22 →" at 15px semibold in
 * ink — NOT in an accent. A coloured heading was Flowers' mauve and Jewels'
 * purple, and a page where the section titles are each a different colour
 * reads as a page assembled by different people.
 */
export function SectionHeader({
  title,
  link,
  className = "",
}: {
  title: string;
  /** "See all", "See all 22 →" — whatever the section counts. */
  link?: { label: string; to?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {link ? (
        link.to ? (
          <Link to={link.to} className="shrink-0 text-[15px] font-semibold text-ink">
            {link.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={link.onClick}
            className="shrink-0 text-[15px] font-semibold text-ink"
          >
            {link.label}
          </button>
        )
      ) : null}
    </div>
  );
}
