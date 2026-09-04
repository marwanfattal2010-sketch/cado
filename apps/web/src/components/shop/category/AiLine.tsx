import { Link } from "react-router-dom";

/**
 * "Let AI help me choose" — one line, outlined, never filled.
 *
 * A filled persimmon bar here competes with the hero's own call to action and
 * with every price on the page; an outline offers the same door without
 * shouting over the products. It sits directly under the hero on every tab
 * that has been rebuilt, in the same place and the same treatment, so a
 * shopper who finds it once knows where it is on the next tab.
 *
 * It opens the existing three-question finder at /assistant — budget, then
 * occasion, then category. Nothing new was built behind it.
 */
export function AiLine({ accent }: { accent?: string }) {
  // The tab's own accent where it has one — rose on Flowers — and persimmon
  // everywhere else. 35% on the border, full strength on the text.
  const colour = accent ?? "var(--persimmon)";
  return (
    <Link
      to="/assistant"
      className="flex h-[46px] w-full items-center justify-center gap-1 rounded-[12px] border text-[14px] font-semibold transition-transform duration-press ease-out active:scale-[0.99]"
      style={{ borderColor: `rgb(${colour} / 0.35)`, color: `rgb(${colour})` }}
    >
      ✨ Let AI help me choose
      <span aria-hidden className="text-[16px] leading-none opacity-70">
        ›
      </span>
    </Link>
  );
}
