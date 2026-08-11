import { Jost } from "next/font/google";

// The wordmark's font, loaded only for the logo. Inline SVG on purpose: an
// <img src="logo.svg"> cannot load webfonts, so "CADO" would silently render
// in a fallback font — the exact failure the brand spec warns about.
const jost = Jost({ subsets: ["latin"], weight: "600", display: "swap" });

const INK = "#181611";
const CREAM = "#F6F1E7";
const GOLD = "#B08D4F";

/**
 * Official CADO logo (packages/shared/brand/logo-horizontal.svg), inlined.
 * variant="ink" on light backgrounds, "cream" on dark. Geometry is the brand
 * SVG verbatim — do not restyle it.
 */
export function BrandLogo({
  variant = "ink",
  height = 30,
  className = "",
}: {
  variant?: "ink" | "cream";
  height?: number;
  className?: string;
}) {
  const fg = variant === "cream" ? CREAM : INK;
  return (
    <svg
      viewBox="0 0 320 110"
      role="img"
      aria-label="CADO"
      height={height}
      width={(320 / 110) * height}
      className={className}
    >
      <g transform="translate(48,55)">
        <rect x="-24" y="-14" width="48" height="38" rx="5" fill="none" stroke={fg} strokeWidth="3.6" />
        <line x1="0" y1="-14" x2="0" y2="24" stroke={fg} strokeWidth="3.6" />
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
        className={jost.className}
        fontWeight="600"
        fontSize="40"
        letterSpacing="6"
        fill={fg}
      >
        CADO
      </text>
    </svg>
  );
}
