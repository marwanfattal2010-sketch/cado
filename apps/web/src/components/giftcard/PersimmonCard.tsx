/**
 * THE CADO card. One component, every screen.
 *
 * There used to be four of these: a green one, a big red "specimen", a
 * wallet card with an eye toggle, and a live preview — each with its own
 * proportions, so the same object looked like a different product depending
 * on where you met it. This is the only one now: gift-cards landing, send
 * preview, group preview, redeem screen, cart line, order confirmation.
 *
 * Persimmon, the brand colour. Wordmark top-left, ribbon mark top-right, and
 * nothing else on the face — no wreath, no expiry line, no XXXX code. The
 * expiry rule is true and still stated, but as a footnote on the page, not as
 * decoration on a card someone is about to give away.
 *
 * Compact on purpose: ~120px, which is roughly 40% shorter than the card it
 * replaces. A gift card is an item on a page, not the page.
 */
export function PersimmonCard({
  label = "CADO GIFT CARD",
  amount,
  note,
  thumb = false,
  className = "",
}: {
  /** Small caps line above the figure. */
  label?: string;
  /** The figure. Always a real number — a balance, a chosen amount, or $0. */
  amount: string;
  /** One line under the figure. Nothing about expiry. */
  note?: string;
  /**
   * The same card at list size — a cart line, a row of four. It fills its
   * container instead of setting its own height, and drops the small print,
   * because at 68px wide nothing but the figure can be read anyway.
   */
  thumb?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-card bg-persimmon shadow-rest ${
        thumb ? "h-full w-full px-2 py-1.5" : "h-[120px] px-5 py-4"
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        {/* Set, not imported: the same Jost 600 as the app icon and splash. */}
        <span
          className={`font-display font-semibold tracking-[0.14em] text-white ${
            thumb ? "text-[9px]" : "text-[18px]"
          }`}
        >
          CADO
        </span>
        {thumb ? null : <RibbonMark />}
      </div>

      <div>
        {thumb ? null : (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">{label}</p>
        )}
        <p
          className={`font-display font-semibold leading-none text-white ${
            thumb ? "text-[13px]" : "mt-0.5 text-[26px]"
          }`}
        >
          {amount}
        </p>
        {note && !thumb ? <p className="mt-1 text-[12px] leading-snug text-white/85">{note}</p> : null}
      </div>
    </div>
  );
}

/** The ribbon mark — the only decoration the card carries. */
function RibbonMark() {
  return (
    <svg aria-hidden viewBox="0 0 28 20" className="h-5 w-7 shrink-0" fill="none">
      <path d="M14 7v12" stroke="rgba(255,255,255,.9)" strokeWidth="1.6" />
      <path d="M2 7h24" stroke="rgba(255,255,255,.9)" strokeWidth="1.6" />
      <path
        d="M14 7C10 7 8 5 8 3.4 8 2 9 1 10.4 1 12.4 1 14 4 14 7Zm0 0c4 0 6-2 6-3.6C20 2 19 1 17.6 1 15.6 1 14 4 14 7Z"
        stroke="rgba(255,255,255,.9)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
