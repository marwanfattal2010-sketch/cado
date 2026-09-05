import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * The Home hero — Option F from cado-hero-options-v2.html (spec 1.9).
 *
 * Three swipe banners, user-driven only: no auto-rotate and no animation loop.
 * A carousel that moves on its own steals the thing a shopper was reading, and
 * on a gift site the headline IS the pitch.
 *
 * The illustrations are drawn in CSS, exactly as in the mockup — no stock
 * photos, no placeholder images.
 *
 * SCROLL CONTAINMENT: the rail sets NO touch-action at all. It used to be
 * pan-x, which meant a finger landing on a slide could ONLY move it sideways
 * — dragging up or down over the hero scrolled nothing, which is the bug this
 * fixed. The browser locks the axis itself, and usePager ignores any gesture
 * that starts inside a horizontal scroller, so nothing is lost.
 */

type Slide = {
  key: string;
  bg: string;
  fg: string;
  headline: string;
  subline: string;
  cta: string;
  ctaClass: string;
  to: string;
  art: "peachBox" | "card" | "persimmonBox";
};

const SLIDES: Slide[] = [
  {
    key: "gift",
    bg: "rgb(var(--persimmon))",
    fg: "#fff",
    headline: "Choose the gift. We do the rest.",
    subline: "Wrapped and at their door tonight.",
    cta: "Shop now",
    ctaClass: "bg-white text-[rgb(var(--navy))]",
    to: "/assistant",
    art: "peachBox",
  },
  {
    key: "card",
    bg: "rgb(var(--ink))",
    fg: "#fff",
    headline: "One card. Any store.",
    subline: "The CADO gift card works at every partner store.",
    cta: "Send a gift card",
    ctaClass: "bg-persimmon text-white",
    to: "/gift-cards/send",
    art: "card",
  },
  {
    key: "group",
    bg: "#FFD9CC",
    fg: "rgb(var(--ink))",
    headline: "Big gift? Split it.",
    subline: "Friends chip in together for one gift.",
    cta: "Start a group gift",
    ctaClass: "bg-[rgb(var(--ink))] text-white",
    to: "/gift-cards/group/new",
    art: "persimmonBox",
  },
];

/** The CSS gift box from the mockup: lid, body, ribbon, bow. */
function GiftBox({
  size,
  lid,
  body,
  ribbon,
  rotate,
  className = "",
}: {
  size: number;
  lid: string;
  body: string;
  ribbon: string;
  rotate: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <span className="absolute rounded-[10px]" style={{ left: "-6%", right: "-6%", top: "12%", height: "26%", background: lid }} />
      <span className="absolute rounded-b-[12px]" style={{ left: 0, right: 0, top: "36%", bottom: 0, background: body }} />
      <span className="absolute" style={{ left: "44%", width: "12%", top: "12%", bottom: 0, background: ribbon }} />
      <span
        className="absolute rounded-[50%]"
        style={{
          left: "24%", top: "-14%", width: "52%", height: "28%",
          border: `7px solid ${ribbon}`, borderBottomColor: "transparent",
        }}
      />
    </span>
  );
}

function Art({ kind }: { kind: Slide["art"] }) {
  if (kind === "peachBox") {
    return <GiftBox size={120} lid="#FFE9DF" body="#FFD2C2" ribbon="rgb(var(--navy))" rotate={-8} className="-bottom-3.5 -right-4" />;
  }
  if (kind === "persimmonBox") {
    return <GiftBox size={110} lid="rgb(var(--persimmon))" body="rgb(var(--navy))" ribbon="#fff" rotate={9} className="-bottom-4 -right-2.5" />;
  }
  // The gift card: a tilted card with a masked number, per the mockup.
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-5 bottom-[18px] rounded-[14px] p-3.5 font-black"
      style={{
        width: 150, height: 96,
        background: "linear-gradient(135deg,rgb(var(--persimmon)),#FF8A6A)",
        transform: "rotate(-10deg)",
        boxShadow: "0 12px 24px rgba(0,0,0,.35)",
        color: "#fff", fontSize: 20, letterSpacing: 2,
      }}
    >
      CADO
      <span className="mt-[38px] block text-[10px] tracking-[1px] opacity-90">XXXX · XXXX · XXXX</span>
    </span>
  );
}

/** A four-point sparkle plus two smaller ones — the usual 'assist' mark. */
function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M7 1.2 8.1 4.6 11.5 5.7 8.1 6.8 7 10.2 5.9 6.8 2.5 5.7 5.9 4.6 7 1.2Z" />
      <path d="M12.4 8.6 13 10.3 14.7 10.9 13 11.5 12.4 13.2 11.8 11.5 10.1 10.9 11.8 10.3 12.4 8.6Z" />
      <path d="M4.2 10.6 4.6 11.8 5.8 12.2 4.6 12.6 4.2 13.8 3.8 12.6 2.6 12.2 3.8 11.8 4.2 10.6Z" />
    </svg>
  );
}

export function HeroBanners({ onAskAi }: { onAskAi?: () => void }) {
  const navigate = useNavigate();
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    // 318 slide + 10 gap, from the mockup.
    setActive(Math.round(el.scrollLeft / 328));
  };

  return (
    <div>
      <div
        ref={railRef}
        onScroll={onScroll}
        // No touch-action: the browser decides the axis, so a vertical drag
        // starting on a slide scrolls the page instead of being swallowed.
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => (s.key === "gift" ? navigate(s.to) : navigate(s.to))}
            style={{ background: s.bg, color: s.fg }}
            className="relative min-h-[230px] w-[318px] shrink-0 snap-start overflow-hidden rounded-[22px] px-5 py-6 text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <h2
              className="font-hero max-w-[190px] text-[34px] font-black leading-[0.98]"
              style={{ letterSpacing: "-1px" }}
            >
              {s.headline}
            </h2>
            <p className="mt-2.5 max-w-[180px] text-[14px] font-extrabold opacity-90">{s.subline}</p>
            <span className={`mt-4 inline-block rounded-pill px-5 py-[11px] text-[14px] font-black ${s.ctaClass}`}>
              {s.cta}
            </span>
            <Art kind={s.art} />
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <span
            key={s.key}
            aria-hidden
            className="h-1.5 rounded-pill transition-all"
            style={{
              width: i === active ? 18 : 6,
              background: i === active ? "rgb(var(--persimmon))" : "rgb(var(--line))",
            }}
          />
        ))}
      </div>

      {/*
        A BUTTON, not a text link.

        As a bare coral line under the dots it read as a footnote and got
        skipped. It now matches the search field directly above it — same
        page gutter, same 40px height, same pill — so the two read as a pair
        of things you can do rather than a control and an afterthought.
        Cream fill with a coral hairline keeps it secondary to the hero's
        own buttons; it is a helper, not the main action.
      */}
      {/* Drawn inline rather than pulled from the icon sheet: this is the one
          place a wand appears, and it keeps the button self-contained. */}
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <button
          type="button"
          onClick={() => (onAskAi ? onAskAi() : navigate("/assistant"))}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-pill border border-persimmon bg-surface px-4 text-[13px] font-extrabold text-persimmon shadow-rest transition-transform duration-press ease-out active:scale-[0.99]"
        >
          <SparkleIcon />
          Let AI help me choose
        </button>
      </div>
    </div>
  );
}
