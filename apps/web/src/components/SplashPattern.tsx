/**
 * The tiled icon pattern behind the CADO wordmark on the launch screen.
 *
 * Eighteen icons drawn here rather than pulled from an icon library: the app
 * has no icon dependency and this is a one-off decorative pattern, so adding
 * one for eighteen glyphs would be a lot of package for a little art. They
 * are drawn in the same house style as components/Icons.tsx — single weight,
 * round caps, no fills — so the launch screen and the app look related.
 *
 * FLAT LINE ONLY. No 3D, no shadows, no gradients on the icons. The
 * reference this is based on works because the pattern stays quiet and the
 * wordmark is the only thing with weight; give the icons depth and they
 * start competing with it.
 *
 * The icon set is deliberately CADO's own categories plus gift objects, so
 * the launch screen is a preview of what is actually in the shop rather than
 * generic decoration.
 *
 * THIS FILE IS THE SOURCE OF TRUTH FOR THE ARTWORK.
 * `scripts/make-splash-pattern.mjs` reads the arrays and the numbered
 * constants straight out of this file and renders the PNG the Android app
 * actually ships. Keep the declarations below on one line each and in the
 * `const NAME = value;` shape, because that is what the script looks for.
 */

/** Every glyph is drawn inside the same 24x24 box so the grid stays even. */
const ICONS: string[] = [
  // gift box with ribbon
  "M3 9h18v12H3zM3 13h18M12 9v12M12 9S10.5 3 7.8 3a2.2 2.2 0 0 0 0 4.4H12M12 9s1.5-6 4.2-6a2.2 2.2 0 0 1 0 4.4H12",
  // gift bag
  "M5 8h14l-1.2 13H6.2zM9 8V6a3 3 0 0 1 6 0v2",
  // bow
  "M12 12s-3-4-6-4a3 3 0 0 0 0 6c3 0 6-2 6-2zm0 0s3-4 6-4a3 3 0 0 1 0 6c-3 0-6-2-6-2z",
  // balloon
  "M12 15a5 5 0 0 0 5-5.5C17 6 15 3 12 3S7 6 7 9.5A5 5 0 0 0 12 15zm0 0v2m0 0c-1 1 1 2 0 3",
  // birthday cake
  "M4 21h16v-6H4zM4 15c0-2 2-3 4-3h8c2 0 4 1 4 3M8 9V6M12 9V5M16 9V6",
  // teddy bear
  "M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM7 9a2.5 2.5 0 1 1 2-4M17 9a2.5 2.5 0 1 0-2-4M10 15h.01M14 15h.01M12 17.5c.8 0 1.2-.5 1.2-.5",
  // mug
  "M4 7h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM17 10h2a2.5 2.5 0 0 1 0 5h-2",
  // chocolate bar
  "M5 4h14v16H5zM5 9h14M5 14h14M12 4v16",
  // perfume bottle
  "M8 10h8v10H8zM10 10V7h4v3M11 4h2v3h-2zM17 7h2v3",
  // flower bouquet
  "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 12v9M12 21c-3 0-5-2-5-4M12 21c3 0 5-2 5-4M8 9 5 7M16 9l3-2",
  // ring
  "M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9 9l1.5-5h3L15 9M12 4v5",
  // necklace
  "M5 4c0 6 3 10 7 10s7-4 7-10M12 14v3M12 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  // sneaker
  "M3 16h11l3 2h4v3H3zM3 16v-5h3l2 2 3-1 3 3",
  // football
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7l4 3-1.5 5h-5L8 10zM12 3v4M4 9l4 1M20 9l-4 1M7 19l2.5-4M17 19l-2.5-4",
  // t-shirt
  "M8 4 4 7l2 3 2-1v10h8V9l2 1 2-3-4-3-2 2h-4z",
  // dress
  "M9 3h6l-1 4 4 14H6L10 7zM9 3l3 3 3-3",
  // headphones
  "M4 15v-3a8 8 0 0 1 16 0v3M4 15a2.5 2.5 0 0 0 2.5 2.5h1V13h-1A2.5 2.5 0 0 0 4 15zM20 15a2.5 2.5 0 0 1-2.5 2.5h-1V13h1A2.5 2.5 0 0 1 20 15z",
  // gift card envelope
  "M3 6h18v12H3zM3 6l9 7 9-7M8 18l4-3 4 3",
];

/**
 * How far apart the icons sit, in the pattern's own units, and how big.
 *
 * Measured against the Trendyol screen this is modelled on: there the icons
 * are big enough to be recognised at a glance and sit close together, so the
 * screen reads as a printed wrapping paper rather than as a few marks on a
 * plain field. The first pass had the icon at 43% of its cell, which left so
 * much air the eye read it as empty orange.
 */
const CELL = 72;
const ICON = 46;

/**
 * One line weight for every glyph, and how visible the pattern is.
 *
 * The brief said "~10-15% white", and at 13% on a Persimmon field the icons
 * were effectively invisible on a phone — the pattern was there and could not
 * be seen. The reference screen is nearer a fifth. This is the number to turn
 * DOWN if the pattern ever competes with the wordmark, and it is deliberately
 * the only place that decision lives.
 */
const STROKE = 1.5;
const OPACITY = 0.22;

/**
 * The tile is six icons wide and eighteen tall.
 *
 * Eighteen rows is not decoration: at the size this renders on a phone the
 * whole screen is roughly one tile tall, so the tile never visibly repeats
 * down the screen. Six columns keeps the icons about 30dp with sensible air
 * around them.
 */
const COLS = 6;
const ROWS = 18;

/**
 * Which glyph lands in which cell: `(row * STRIDE_ROW + col * STRIDE_COL) %
 * 18`. Both strides are coprime with eighteen, so every icon appears — the
 * previous 4x4 tile only ever showed the first sixteen and silently dropped
 * the headphones and the gift card envelope. Stepping by 5 down and 7 across
 * also means no glyph is ever next to or directly above a copy of itself.
 *
 * `scripts/make-splash-pattern.mjs` repeats this one line. If you change it,
 * change it in both places.
 */
const STRIDE_ROW = 5;
const STRIDE_COL = 7;

/**
 * Rows are offset by half a cell so the eye reads a scatter rather than
 * vertical columns — the single thing that makes a tiled grid stop looking
 * like a spreadsheet. ROWS is even, so that alternation survives the tile
 * repeating and there is no seam where one tile meets the next.
 */
function cells() {
  const out: { x: number; y: number; icon: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      out.push({
        x: c * CELL + (r % 2 ? CELL / 2 : 0),
        y: r * CELL,
        icon: ICONS[(r * STRIDE_ROW + c * STRIDE_COL) % ICONS.length],
      });
    }
  }
  return out;
}

/**
 * The pattern on its own, as an SVG that tiles seamlessly.
 *
 * Every icon is drawn at the same x pitch on every row — the half-cell offset
 * on odd rows lines up exactly with the next tile along, because the tile is
 * a whole number of cells wide. That is what keeps the seam invisible.
 */
export function SplashPattern({ className = "" }: { className?: string }) {
  const w = COLS * CELL;
  const h = ROWS * CELL;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern id="cado-splash-tile" width={w} height={h} patternUnits="userSpaceOnUse">
          <g
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={OPACITY}
          >
            {cells().map((cell, i) => (
              <g key={i} transform={`translate(${cell.x} ${cell.y}) scale(${ICON / 24})`}>
                <path d={cell.icon} />
              </g>
            ))}
          </g>
        </pattern>

        {/* The wordmark has to stay the first thing read, so the pattern is
            faded out through the middle rather than sitting at one opacity
            across the whole screen.

            The stops are WHITE, not black. A mask is read by luminance, so
            black stops evaluate to zero everywhere and the pattern renders as
            nothing at all — which is what this did before, and nobody caught
            it because the component was never mounted anywhere. */}
        {/* A CLEARING, NOT A HOLE.

            The first version faded to fully transparent at the centre and was
            still only 15% of the way back at 38% of the radius, which erased
            the whole middle third of the screen. On a phone that is a large
            empty field with a pattern around the edges — the opposite of the
            reference, where the icons carry right across and the wordmark
            simply sits on top of them.

            So the centre now dips rather than disappears: the icons stay
            faintly present behind the wordmark, and the wordmark wins on
            weight and contrast instead of on emptiness. */}
        {/* The clearing is now shallow.

            Two rounds of this were still invisible on a real phone, and the
            reason is where the eye lands: it goes to the middle of the screen,
            which is exactly the area this gradient was dimming most. A pattern
            that is strongest in the corners and faintest where you are looking
            reads as no pattern at all.

            The wordmark does not need the help. It is cream on Persimmon at
            200dp — it wins on contrast and weight regardless of what is behind
            it, which is precisely how the reference screen works. */}
        <radialGradient id="cado-splash-clear" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0.62" />
          <stop offset="30%" stopColor="#FFF" stopOpacity="0.78" />
          <stop offset="62%" stopColor="#FFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="1" />
        </radialGradient>
        <mask id="cado-splash-mask">
          <rect width={w} height={h} fill="url(#cado-splash-clear)" />
        </mask>
      </defs>

      <rect width={w} height={h} fill="url(#cado-splash-tile)" mask="url(#cado-splash-mask)" />
    </svg>
  );
}
