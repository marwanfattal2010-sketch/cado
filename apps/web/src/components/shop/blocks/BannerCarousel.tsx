import { useEffect, useRef, useState } from "react";
import { Img } from "../../Img";
import { accentColor, type BrowseBanner } from "../../../lib/browse";

const ADVANCE_MS = 4500;

/**
 * The full-bleed 2:1 banner at the top of a tab.
 *
 * There is no artwork in the database yet, and that is handled rather than
 * papered over: a banner row with no `image_url` renders the **typographic
 * variant** — the tab's accent as a flat field, the headline, one line of
 * copy, the CTA. No stock photo is pulled in to fill the space. The moment
 * real artwork is uploaded to a row, the same component shows it instead.
 *
 * `minItems: 1` — with no banner rows at all the block does not render.
 */
export function BannerCarousel({
  banners,
  accentToken,
  fallbackImage,
  extraSlides = [],
  onCta,
}: {
  banners: BrowseBanner[];
  accentToken: string;
  /** A photo of something genuinely in this tab, used when the banner row has
   *  no uploaded artwork of its own. Borrowed, not invented. */
  fallbackImage?: string | null;
  /**
   * Slides built from live data rather than from a banner row — the newest
   * arrival in this category, a shop that stocks it. Every word and every
   * photo on them is a fact already in the database, which is why they can be
   * generated rather than written: there is no second banner row to keep in
   * step with the catalogue, and nothing on them can go stale into a lie.
   */
  extraSlides?: BrowseBanner[];
  onCta: (banner: BrowseBanner) => void;
}) {
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement | null>(null);
  const paused = useRef(false);
  const frame = useRef<number | null>(null);

  /* One list. The seeded rows lead, the generated ones follow. */
  const slides = [...banners, ...extraSlides];
  const count = slides.length;

  // Auto-advance. Paused while a finger is down so it can never yank the
  // banner out from under a swipe, and skipped entirely for a single banner.
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (paused.current) return;
      const rail = railRef.current;
      if (!rail) return;
      const next = (Math.round(rail.scrollLeft / rail.clientWidth) + 1) % count;
      rail.scrollTo({ left: next * rail.clientWidth, behavior: "smooth" });
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [count]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const read = () => {
      frame.current = null;
      if (rail.clientWidth === 0) return;
      setActive(Math.round(rail.scrollLeft / rail.clientWidth));
    };
    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = requestAnimationFrame(read);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="scroll-row scroll-row-flush"
        onTouchStart={() => {
          paused.current = true;
        }}
        onTouchEnd={() => {
          paused.current = false;
        }}
      >
        {slides.map((banner) => {
          const photo = banner.image_url ?? fallbackImage ?? null;
          return (
          <div key={banner.id} className="relative w-full">
            <div className="relative aspect-[2/1] w-full overflow-hidden">
              {/* Accent underneath either way, so the headline has something
                  solid behind it for the frame before the photo decodes. */}
              <div aria-hidden className="absolute inset-0" style={{ background: accentColor(accentToken) }} />
              {photo ? (
                <>
                  <Img src={photo} className="absolute inset-0 h-full w-full object-cover" eager />
                  {/* Dark enough on the left for white type over any photo,
                      clear on the right so the product is still visible. */}
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, ${accentColor(accentToken, 0.94)} 0%, ${accentColor(
                        accentToken,
                        0.7
                      )} 42%, transparent 88%)`,
                    }}
                  />
                </>
              ) : null}

              <div className="relative flex h-full w-[68%] flex-col justify-center gap-2 px-[var(--page-x)]">
                {banner.headline ? (
                  <p className="font-display text-[24px] font-semibold leading-[1.1] text-inverse">
                    {banner.headline}
                  </p>
                ) : null}
                {banner.subcopy ? (
                  <p className="text-[13px] leading-snug text-inverse/85">{banner.subcopy}</p>
                ) : null}
                {banner.cta_label ? (
                  <button
                    type="button"
                    onClick={() => onCta(banner)}
                    className="mt-1 w-fit bg-surface px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink"
                  >
                    {banner.cta_label}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5">
          {slides.map((banner, i) => (
            <span
              key={banner.id}
              className={`h-1.5 rounded-full bg-white transition-all duration-200 ${
                i === active ? "w-3.5" : "w-1.5 opacity-50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
