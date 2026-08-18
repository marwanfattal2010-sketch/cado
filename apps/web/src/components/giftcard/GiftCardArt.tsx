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

/**
 * The decorative hero card on the Gift Cards page. Brand, not data: it shows
 * NO balance and NO code — a new visitor's first sight of the page must not
 * be "$0, you have nothing", and a made-up code would be fake content.
 *
 * The wordmark stays in Jost 600, deliberately, although the brief sketched
 * "wordmark in serif": Jost 600 IS the CADO wordmark — the app icon, the
 * splash and the header all set it in that face, and a serif CADO existing
 * only on this card would be a second logo. Serif is the amount's job on the
 * cards that carry one, which matches the design system's "serif for display"
 * rule without forking the mark.
 */
export function GiftCardHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 190" className={className} role="img" aria-label="A CADO gift card">
      <defs>
        <linearGradient id="cado-card-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={PERSIMMON} />
          <stop offset="100%" stopColor="#D8422A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="316" height="186" rx="18" fill="url(#cado-card-face)" />
      {/* the ribbon that crosses every CADO card, tied with the brand bow */}
      <path d="M2 122h316" stroke={CREAM} strokeWidth="1.8" opacity="0.45" />
      <path d="M226 2v186" stroke={CREAM} strokeWidth="1.8" opacity="0.28" />
      <Bow x={226} y={122} scale={1.7} stroke={CREAM} />
      <text x="24" y="46" fontFamily="Jost, sans-serif" fontWeight="600" fontSize="26" letterSpacing="3" fill={CREAM}>
        CADO
      </text>
      <text x="24" y="168" fontFamily="Jost, sans-serif" fontWeight="600" fontSize="12" letterSpacing="1" fill={CREAM} opacity="0.8">
        GIFT CARD
      </text>
    </svg>
  );
}

/**
 * The live preview in the send flows: the card with the chosen amount, and
 * beneath it the note exactly as typed. Nothing invented — empty fields
 * render nothing, so an unwritten note is an unwritten note.
 *
 * The note area keeps a fixed minimum height whether or not anything is
 * typed, so the page never jumps as someone writes (the no-layout-shift
 * rule).
 */
export function LiveCardPreview({
  amount,
  to = "",
  from = "",
  message = "",
  className = "",
}: {
  amount: string;
  to?: string;
  from?: string;
  message?: string;
  className?: string;
}) {
  const hasNote = !!(to.trim() || from.trim() || message.trim());
  return (
    <div className={className}>
      <DigitalCardMock amount={amount} className="w-full" />
      <div className="mt-2 min-h-[84px]">
        {hasNote ? (
          <div className="rounded-[10px] border border-line bg-surface px-4 py-3 shadow-rest">
            {to.trim() ? <p className="font-display text-caption">To {to.trim()}</p> : null}
            {message.trim() ? (
              <p className="py-1 font-display text-body leading-snug">{message.trim()}</p>
            ) : null}
            {from.trim() ? (
              <p className="text-right font-display text-caption text-muted">— {from.trim()}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * THE SLOT FOR THE REAL PHOTOGRAPH.
 *
 * Today this renders the hand-drawn envelope, which is honest: it is CADO's
 * own drawing of CADO's own card. The day a real photograph of the printed
 * envelope exists, it replaces the drawing HERE and nowhere else — every
 * screen that shows the physical option renders this component, so the swap
 * is one file. No stock photo and no generated image may ever fill this
 * slot: both would be a picture of something that does not arrive.
 */
export function PhysicalCardPhotoSlot({ className = "" }: { className?: string }) {
  return <EnvelopeCardArt className={className} />;
}
