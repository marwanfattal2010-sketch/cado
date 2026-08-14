/**
 * The two pictures of a CADO gift card.
 *
 * Both are drawn here rather than photographed or fetched. A stock photo of
 * some other brand's gift card would be a lie about what arrives, and an
 * <img> would be a second request that can fail and cannot inherit the
 * brand colours. Everything below is CADO's own card.
 *
 * The wordmark is set in Jost 600, the same self-hosted face the real logo
 * uses. Never swap it for a Google Fonts link — production CSP blocks
 * fonts.googleapis.com and the wordmark would silently fall back.
 */

const PERSIMMON = "#F94E33";
const INK = "#181611";
const CREAM = "#F6F1E7";
const GOLD = "#B08D4F";

/** The bow motif from the logo, at card scale. */
function Bow({ x, y, scale = 1, stroke = GOLD }: { x: number; y: number; scale?: number; stroke?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path
        d="M0,0 C-6,-11 -18,-9 -12,-2 M0,0 C6,-11 18,-9 12,-2"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * The digital card, as it will actually look on screen: Persimmon face, the
 * CADO wordmark, the amount, and the code.
 *
 * The code is shown as the XXXX-XXXX-XXXX pattern on purpose — the real one
 * does not exist until the card is bought, and printing a made-up code here
 * would be exactly the kind of fake content that is not allowed.
 */
export function DigitalCardMock({ amount, className = "" }: { amount: string; className?: string }) {
  return (
    <svg viewBox="0 0 260 150" className={className} role="img" aria-label={`CADO digital gift card, ${amount}`}>
      <rect x="2" y="2" width="256" height="146" rx="14" fill={PERSIMMON} />
      {/* the ribbon that crosses every CADO card */}
      <path d="M2 96h256" stroke={CREAM} strokeWidth="1.5" opacity="0.45" />
      <text x="20" y="36" fontFamily="Jost, sans-serif" fontWeight="600" fontSize="20" fill={CREAM}>
        CADO
      </text>
      <Bow x={232} y={34} scale={1.1} stroke={CREAM} />
      <text x="20" y="82" fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize="38" fill={CREAM}>
        {amount}
      </text>
      <text
        x="20"
        y="124"
        fontFamily="Jost, sans-serif"
        fontWeight="600"
        fontSize="15"
        letterSpacing="2"
        fill={CREAM}
        opacity="0.85"
      >
        XXXX-XXXX-XXXX
      </text>
    </svg>
  );
}

/**
 * The physical card, tucked into its envelope, with the little note peeking
 * out beside it. Persimmon card, cream envelope, near-black wordmark — the
 * same three things that arrive at the door.
 */
export function EnvelopeCardArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 150" className={className} role="img" aria-label="A printed CADO card in an envelope">
      {/* the little paper note, behind and to the left */}
      <g transform="rotate(-7 78 60)">
        <rect x="46" y="24" width="64" height="46" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
        <path d="M56 40h44M56 50h44M56 60h28" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* the card itself, sliding out of the envelope */}
      <g transform="rotate(4 168 58)">
        <rect x="126" y="20" width="98" height="62" rx="6" fill={PERSIMMON} />
        <text x="138" y="44" fontFamily="Jost, sans-serif" fontWeight="600" fontSize="14" fill={CREAM}>
          CADO
        </text>
        <path d="M126 56h98" stroke={CREAM} strokeWidth="1.2" opacity="0.5" />
        <Bow x={208} y={42} scale={0.7} stroke={CREAM} />
      </g>

      {/* the envelope, in front of both */}
      <path
        d="M20 62h220a4 4 0 0 1 4 4v66a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V66a4 4 0 0 1 4-4Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 66l114 58 114-58" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <text x="130" y="120" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="600" fontSize="12" fill={INK}>
        CADO
      </text>
    </svg>
  );
}
