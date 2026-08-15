/**
 * The official logo: the CADO wordmark, nothing else.
 *
 * The previous version drew a gift box with a gold bow beside the word. That
 * mark is retired — Marwan's direction for the rebrand was explicit: "just
 * the CADO wordmark — no gift box, no bow", and the app icon, the splash and
 * the favicons already follow it. This was the last place the box appeared.
 *
 * Still inlined as a component rather than an <img> pointing at an SVG file:
 * an SVG loaded via <img> can't pull webfonts, so the wordmark would silently
 * render in a fallback font. Inline, the Jost 600 loaded in index.html
 * applies.
 *
 * letterSpacing 2.5, not the brand SVG's 6: at header size the gap after the
 * A reads as a word break — "CA DO". The master SVGs keep 6 for print.
 */
const TEXT_COLORS = { ink: "#181611", cream: "#F6F1E7" } as const;

export function BrandLogo({
  variant = "ink",
  className = "",
}: {
  /** "ink" on light backgrounds, "cream" on dark. */
  variant?: "ink" | "cream";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 110" role="img" aria-label="CADO" className={className}>
      <text
        x="100"
        y="68"
        textAnchor="middle"
        fontFamily="Jost, sans-serif"
        fontWeight="600"
        fontSize="44"
        letterSpacing="2.5"
        fill={TEXT_COLORS[variant]}
      >
        CADO
      </text>
    </svg>
  );
}
