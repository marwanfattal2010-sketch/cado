/**
 * The official horizontal logo, inlined as a component rather than an <img>
 * pointing at the SVG file: an SVG loaded via <img> can't pull webfonts, so
 * the CADO wordmark would silently render in a fallback font. Inline, the
 * Jost 600 loaded in index.html applies. Geometry and colors are copied
 * verbatim from packages/shared/brand/logo-horizontal(.-cream).svg — do not
 * tweak them here; regenerate the masters instead.
 */
const TEXT_COLORS = { ink: "#181611", cream: "#F6F1E7" } as const;
const GOLD = "#B08D4F";

export function BrandLogo({
  variant = "ink",
  className = "",
}: {
  /** "ink" on light backgrounds, "cream" on dark. */
  variant?: "ink" | "cream";
  className?: string;
}) {
  const c = TEXT_COLORS[variant];
  return (
    <svg viewBox="0 0 320 110" role="img" aria-label="CADO" className={className}>
      <g transform="translate(48,55)">
        <rect x="-24" y="-14" width="48" height="38" rx="5" fill="none" stroke={c} strokeWidth="3.6" />
        <line x1="0" y1="-14" x2="0" y2="24" stroke={c} strokeWidth="3.6" />
        <path
          d="M0,-14 C-9,-30 -26,-26 -18,-16 M0,-14 C9,-30 26,-26 18,-16"
          fill="none"
          stroke={GOLD}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </g>
      <text
        x="95"
        y="68"
        fontFamily="Jost, sans-serif"
        fontWeight="600"
        fontSize="40"
        letterSpacing="6"
        fill={c}
      >
        CADO
      </text>
    </svg>
  );
}
