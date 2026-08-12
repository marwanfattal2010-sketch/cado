import type { ReactNode, RefObject } from "react";

/**
 * The horizontal scroll-snap container.
 *
 * Every panel element renders always — the pager's scroll width has to be
 * `panels × screen width` for snapping and for index maths to work, so a
 * missing panel would shift every tab after it. Only the *contents* are
 * windowed (see `TabPanel`), which is where the real cost is.
 *
 * All the styling lives in `.pager` / `.panel` in index.css, next to the note
 * explaining why this is scroll-snap and not transforms.
 */
export function Pager({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div ref={scrollRef} className="pager">
      {children}
    </div>
  );
}
