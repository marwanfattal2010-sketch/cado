/**
 * ONE ACCENT PER CATEGORY, AND THE FOUR SHADES DERIVED FROM IT.
 *
 * This deliberately reverses an earlier decision. Per-category hues were
 * deleted once because eleven tabs in eleven colours read as eleven shops
 * rather than one. What made that true was that the hue was EVERYWHERE — the
 * hero field, the buttons, the badges, the prices. Here it is confined to
 * section grounds, the tab underline and a ring: the furniture of the page
 * changes colour, while everything you press stays terracotta on every tab.
 * That is what keeps it one shop with different rooms.
 *
 * TERRACOTTA IS NOT IN THIS FILE BY ACCIDENT. Primary buttons, discount
 * badges, sale prices, the bottom-nav active icon, "Earn points" and "See
 * all" all keep `--persimmon`. If an accent ever appears on one of those, the
 * shopper has to relearn what "the orange thing" means on every tab.
 */

export type Accent = {
  /** The category's colour. Section grounds, tab underline, rings. */
  base: string;
  /** Its deep shade. Type on tint, hero scrim, tile label gradients. */
  dark: string;
};

/**
 * Slugs here are the TAB slugs, which are not always the category slugs —
 * `flowers` the tab is `flowers-gifts` the category, and the same is true of
 * jewelry, home and gift sets. Both spellings are listed rather than mapped,
 * because a lookup that silently misses just renders the default and nobody
 * notices for a week.
 */
const ACCENTS: Record<string, Accent> = {
  all: { base: "#D9512C", dark: "#A63A1C" },

  fashion: { base: "#6B2D5C", dark: "#3A1633" },

  flowers: { base: "#E0567B", dark: "#9E2E51" },
  "flowers-gifts": { base: "#E0567B", dark: "#9E2E51" },

  chocolate: { base: "#7A4A2A", dark: "#4A2A15" },

  perfumes: { base: "#5B4BC4", dark: "#352A85" },
  perfume: { base: "#5B4BC4", dark: "#352A85" },

  /*
   * The rest, chosen from the same warm/jewel family and kept clear of each
   * other so no two adjacent tabs read as the same colour. Every one is dark
   * enough that white type on `base` clears AA, which is what the hero scrim
   * and the Super deals block both depend on.
   */
  jewelry: { base: "#9C5A2E", dark: "#603216" }, // amber-bronze
  "jewelry-accessories": { base: "#9C5A2E", dark: "#603216" },
  toys: { base: "#2F7DA8", dark: "#17506F" }, // teal-blue, the one cool tab
  shoes: { base: "#8A3B2F", dark: "#55201A" }, // brick
  electronics: { base: "#3F4C8C", dark: "#232C57" }, // indigo
  sport: { base: "#2E6B4F", dark: "#17402D" }, // pitch green
  home: { base: "#8A6A33", dark: "#54401A" }, // ochre
  "home-appliances": { base: "#8A6A33", dark: "#54401A" },
  "gift-sets": { base: "#8A6A33", dark: "#54401A" },
};

/** Terracotta — the brand, and the All tab's own accent. */
export const DEFAULT_ACCENT: Accent = ACCENTS.all!;

export function accentFor(slug: string | undefined): Accent {
  return (slug && ACCENTS[slug]) || DEFAULT_ACCENT;
}

/**
 * The four custom properties a tab's subtree reads.
 *
 * Set on the PANEL rather than on the page root. Every tab is mounted at once
 * inside the pager, so a single root variable would have to be rewritten on
 * every swipe — and rewriting it is exactly what produces the flash of the
 * previous colour the brief rules out. Each panel carrying its own value means
 * the next tab is already the right colour before it is swiped to.
 *
 * The tints are the accent over white at 8% and 5%, composited here rather
 * than left as `rgb(... / .08)` so a section can be painted opaquely: a
 * translucent band over another band would compound where they meet.
 */
export function accentVars(slug: string | undefined): Record<string, string> {
  const a = accentFor(slug);
  return {
    "--accent": a.base,
    "--accent-dark": a.dark,
    "--accent-tint": mixOnWhite(a.base, 0.08),
    "--accent-tint-soft": mixOnWhite(a.base, 0.05),
  };
}

/** `#rrggbb` at `alpha` composited over white, as an opaque hex. */
function mixOnWhite(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = (c: number) => Math.round(255 + (c - 255) * alpha);
  const r = to((n >> 16) & 255);
  const g = to((n >> 8) & 255);
  const b = to(n & 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
