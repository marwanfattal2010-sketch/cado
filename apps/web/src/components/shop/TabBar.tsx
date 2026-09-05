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
    /* WHITE, AND THE HAIRLINE IS THE ONLY EDGE. The strip used to be a band
       of frame colour carrying filled pills, which is two separations doing
       one job: the band said "this row is not the page" and the pills said
       "these are switches". On white the row IS the page, and a 0.5px rule
       under the whole width is all that divides it from the panel below. */
    <div className="relative z-20 shrink-0 border-b-[0.5px] border-tab-line bg-white">
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
              /* AN UNDERLINE, not a pill. Eleven filled pills in a scrolling
                 row read as eleven buttons of equal weight — the selected one
                 was a shape among shapes. A rule under one word is the
                 quietest possible way to say "you are here", and it is drawn
                 as a child of the button so its width is the TEXT's width
                 rather than the tap target's. */
              className={`relative flex h-full shrink-0 items-center whitespace-nowrap px-3 text-[14px] transition-colors ${
                active ? "font-medium text-tab-active" : "font-medium text-tab-inactive"
              }`}
            >
              {tab.label}
              {active ? (
                <span
                  aria-hidden
                  /* Square-ended and flush to the bottom of the strip, so it
                     sits on the hairline instead of floating above it. */
                  className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] bg-tab-active"
                />
              ) : null}
            </button>
          );
        })}

      </div>

      {/* The fade is 18px of canvas so tabs vanish under the button instead of
          being sliced by it. pointer-events-none or it eats the last tab's
          taps. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-10 w-[18px] bg-gradient-to-r from-transparent to-white"
      />
      {/* The same on the left, so a scrolled-past tab fades out instead of
          ending mid-word against the screen edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[14px] bg-gradient-to-l from-transparent to-white"
      />
      <button
        type="button"
        onClick={onOpenAll}
        aria-label="All categories"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center bg-white text-header-fg"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
