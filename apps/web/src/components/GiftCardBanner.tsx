import { Link } from "react-router-dom";
import { Img } from "./Img";

/**
 * The one promo banner on the homepage.
 *
 * It used to be a black box with a gold icon sitting near the bottom of the
 * page, which read as an advert and got skipped. This version sits up with
 * the shopping sections and earns its place with colour: a warm
 * blush/sand/sage wash, a real photograph bleeding in from the right, and a
 * gold hairline. No new accent hue — the tints are backgrounds and the only
 * saturated thing on it is the photo itself.
 *
 * The photo is masked rather than scrimmed, so the copy always sits on flat
 * tint and never on a busy part of the image. That keeps it legible without
 * a black overlay, which is what made the old version feel heavy.
 */
export function GiftCardBanner() {
  return (
    <Link
      to="/gift-cards"
      className="relative flex min-h-[168px] items-center overflow-hidden rounded-card bg-gradient-to-br from-tint-blush via-tint-sand to-tint-sage shadow-rest"
    >
      {/* Photograph, fading in from the right edge. aria-hidden via the
          empty alt inside Img — it is decoration, the link text carries the
          meaning. */}
      {/* Measured at 375px: the copy's right edge lands at x=189 and the
          mask only reaches full opacity at x=289, so the last words sit on
          near-flat tint rather than on the photograph. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[56%] [mask-image:linear-gradient(to_right,transparent,#000_72%)]">
        <Img src="/categories/gift-card.jpg" className="h-full w-full object-cover" />
      </div>

      {/* A single gold hairline arc — the brand's ribbon, not a border.
          `opacity-40` rather than `border-gold/40`: an opacity modifier on a
          token colour compiles to nothing in this Tailwind config (the
          palette is plain `var(--x)` strings, which Tailwind 3 cannot mix an
          alpha into), so `/40` would silently be a full-strength gold line. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-pill border border-gold opacity-40"
      />

      <div className="relative max-w-[62%] px-5 py-5 sm:max-w-[52%]">
        <p className="text-eyebrow uppercase text-muted">Gift cards</p>
        <p className="mt-2 font-display text-h2 text-ink">
          Can’t decide? Send a CADO gift card — they pick from any store.
        </p>
        <span className="mt-3.5 inline-flex h-11 items-center rounded-pill bg-primary px-5 text-caption font-medium text-inverse">
          Send a gift card
        </span>
      </div>
    </Link>
  );
}
