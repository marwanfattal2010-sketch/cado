/**
 * The nine tabs' signature motifs — dividers and decorations, drawn here.
 * Decoration is design, not data: nothing in this file claims anything.
 * Each motif belongs to ONE tab; sharing one across tabs would fail the
 * clone test by construction.
 */

/** Fashion: hairline + camel eyebrow live in ThemedTab; no SVG needed. */

/** Jewelry: a short gold underline stroke beneath serif titles. */
export function GoldRule() {
  return <span aria-hidden className="mt-1 block h-[2px] w-10 bg-[#C6A664]" />;
}

/** Flowers: a single leaf, centered between sections. */
export function LeafDivider() {
  return (
    <div aria-hidden className="flex justify-center py-5">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#3E7C4F" strokeWidth="1.6">
        <path d="M12 21C7 16 6 9 12 3c6 6 5 13 0 18Z" />
        <path d="M12 21V9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Chocolate: the caramel drizzle squiggle — under the headline and between bands. */
export function DrizzleDivider({ width = 120 }: { width?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 120 12" style={{ width }} className="mx-auto block py-1">
      <path
        d="M2 8 C14 2 22 12 34 6 S 56 2 68 8 90 12 102 5 114 4 118 7"
        fill="none"
        stroke="#C98F51"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Toys: a thin confetti-dot strip. */
export function ConfettiDivider() {
  return (
    <div
      aria-hidden
      className="mx-auto my-5 h-2 w-40 rounded-pill"
      style={{
        backgroundImage:
          "radial-gradient(circle, #3BA7DC 1.6px, transparent 1.8px), radial-gradient(circle, #E84C3D 1.6px, transparent 1.8px), radial-gradient(circle, #58C9A4 1.6px, transparent 1.8px)",
        backgroundSize: "18px 8px",
        backgroundPosition: "0 0, 6px 2px, 12px 0",
      }}
    />
  );
}

/** Gift Sets: a thin red ribbon with a small bow. */
export function RibbonDivider2() {
  return (
    <svg aria-hidden viewBox="0 0 160 16" className="mx-auto my-5 block w-40">
      <path d="M0 8h64M96 8h64" stroke="#A33B2E" strokeWidth="2" />
      <path
        d="M80 8c-4-7-13-6-8-1M80 8c4-7 13-6 8-1M80 8c-3 6-9 6-7 1M80 8c3 6 9 6 7 1"
        fill="none"
        stroke="#A33B2E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Electronics: a subtle graphite dot grid. */
export function DotGridDivider() {
  return (
    <div
      aria-hidden
      className="mx-auto my-5 h-3 w-44"
      style={{
        backgroundImage: "radial-gradient(circle, #2A2E33 1px, transparent 1.2px)",
        backgroundSize: "10px 6px",
        opacity: 0.35,
      }}
    />
  );
}

/** Sport: thin diagonal stripes. */
export function DiagonalDivider() {
  return (
    <div
      aria-hidden
      className="mx-auto my-5 h-2 w-44"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, #2F7D46 0 6px, transparent 6px 14px)",
      }}
    />
  );
}
