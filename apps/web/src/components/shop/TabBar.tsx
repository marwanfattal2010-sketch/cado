import { useEffect, useRef } from "react";
import { type BrowseTab } from "../../lib/browse";

/**
 * The horizontally scrolling tab strip.
 *
 * Two things it has to get right that are easy to miss:
 *
 * 1. The active tab scrolls itself into view whenever the active index
 *    changes — including when the change came from a swipe, not a tap.
 *    Otherwise swiping to tab six leaves the strip showing tabs one to four
 *    and nothing looks selected.
 * 2. The first tab starts on the page margin, so it lines up with every
 *    section title underneath it.
 */
export function TabBar({
  tabs,
  activeIndex,
  onSelect,
  onOpenAll,
}: {
  tabs: BrowseTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onOpenAll: () => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // First paint should not animate: the strip is arriving, not moving.
  const mounted = useRef(false);

  /**
   * ONE underline that TRAVELS, rather than one per tab that blinks out here
   * and in over there.
   *
   * A marker that appears at its destination gives no sense of having moved,
   * and that is a surprising amount of why a tab bar feels like a web page:
   * the panel slides, the underline teleports, and the two read as unrelated.
   * A single element with a transition on transform/width follows the panel,
   * so the whole bar moves as one thing.
   *
   * Measured from the DOM rather than computed from an assumed tab width,
   * because these labels are full category names of very different lengths.
   */
  useEffect(() => {
    const strip = stripRef.current;
    const item = itemRefs.current[activeIndex];
    if (!strip || !item) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // Centre the active tab where the strip has room to; the browser clamps
    // this at both ends, so tab one and the last tab stay flush.
    const left = item.offsetLeft - (strip.clientWidth - item.clientWidth) / 2;
    strip.scrollTo({ left, behavior: mounted.current && !reduced ? "smooth" : "auto" });

    mounted.current = true;
  }, [activeIndex, tabs]);

  return (
    /* z-20 so the strip stays above anything in the panel that scrolls under
       it, and an opaque canvas behind it so nothing shows through. */
    <div className="relative z-20 shrink-0 bg-frame-deep">
      <div
        ref={stripRef}
        /* scroll-padding-inline keeps a tab from resting half-cut against the
           left edge when the strip scrolls — "Accessories" was arriving as
           "sories". */
        className="tab-strip h-12 items-center pl-[var(--page-x)] pr-12"
        style={{ scrollPaddingInline: "var(--page-x)" }}
      >
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              onClick={() => onSelect(i)}
              aria-current={active ? "true" : undefined}
              /* A PILL, not an underline. On the frame an underline reads as a
                 scratch; a filled pill reads as a switch, which is what this
                 is. Active inverts to persimmon-on-white so the selected tab is the
                 brightest thing in the frame. */
              className={`relative flex shrink-0 items-center whitespace-nowrap rounded-pill px-3.5 py-1.5 text-[14px] transition-colors ${
                active ? "bg-white font-bold text-frame" : "bg-white/[0.22] font-medium text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}

      </div>

      {/* The fade is 18px of canvas so tabs vanish under the button instead of
          being sliced by it. pointer-events-none or it eats the last tab's
          taps. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-10 w-[18px] bg-gradient-to-r from-transparent to-frame-deep"
      />
      {/* The same on the left, so a scrolled-past tab fades out instead of
          ending mid-word against the screen edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[14px] bg-gradient-to-l from-transparent to-frame-deep"
      />
      <button
        type="button"
        onClick={onOpenAll}
        aria-label="All categories"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center bg-frame-deep text-white"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
