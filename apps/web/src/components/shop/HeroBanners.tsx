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
 * SCROLL CONTAINMENT (spec 1.8): the rail is `touch-action: pan-x`, so the
 * browser hands it horizontal gestures and keeps vertical ones for the page,
 * and it stops horizontal touchmove from reaching the tab-swipe handler above
 * it. The rail is never wider than the viewport — it scrolls inside itself.
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
    bg: "#F94E33",
    fg: "#fff",
    headline: "Choose the gift. We do the rest.",
    subline: "Wrapped and at their door tonight.",
    cta: "Shop now",
    ctaClass: "bg-white text-[#B8321C]",
    to: "/find",
    art: "peachBox",
  },
  {
    key: "card",
    bg: "#151210",
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
    fg: "#151210",
    headline: "Big gift? Split it.",
    subline: "Friends chip in together for one gift.",
    cta: "Start a group gift",
    ctaClass: "bg-[#151210] text-white",
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
    return <GiftBox size={120} lid="#FFE9DF" body="#FFD2C2" ribbon="#B8321C" rotate={-8} className="-bottom-3.5 -right-4" />;
  }
  if (kind === "persimmonBox") {
    return <GiftBox size={110} lid="#F94E33" body="#B8321C" ribbon="#fff" rotate={9} className="-bottom-4 -right-2.5" />;
  }
  // The gift card: a tilted card with a masked number, per the mockup.
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-5 bottom-[18px] rounded-[14px] p-3.5 font-black"
      style={{
        width: 150, height: 96,
        background: "linear-gradient(135deg,#F94E33,#FF8A6A)",
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

export function HeroBanners({ onAskAi }: { onAskAi: () => void }) {
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
        // pan-x hands vertical gestures back to the page, so scrolling down
        // over the hero never drags the rail (spec 1.8).
        style={{ touchAction: "pan-x" }}
        onTouchMove={(e) => e.stopPropagation()}
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
              background: i === active ? "#F94E33" : "#d6cfc5",
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAskAi}
        className="mx-auto mt-3 block text-center text-[13px] font-extrabold text-[#B8321C]"
      >
        Let AI help me choose
      </button>
    </div>
  );
}
