/**
 * The signature motif (spec 1.5). One shape, used consistently, is what a
 * brand feels like — so the loading indicator, the order-confirmed moment
 * and empty states all draw the same ribbon rather than a generic spinner.
 */

/** Loading indicator: a ribbon that draws itself. Not a spinner. */
export function RibbonLoader({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" role="status" aria-label="Loading">
      <path
        d="M32 40C32 40 18 30 18 22a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 8-14 18-14 18Z"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="130"
        className="animate-draw-ribbon"
        style={{ animationIterationCount: "infinite" }}
      />
      <path d="M32 40v14" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/** Order confirmed: a bow that ties itself, once, 600ms. */
export function RibbonBow({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 34C32 34 14 26 14 18a6 6 0 0 1 12-2c2 2 6 8 6 8s4-6 6-8a6 6 0 0 1 12 2c0 8-18 16-18 16Z"
        stroke="var(--gold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="200"
        className="animate-tie-bow"
      />
      <path
        d="M26 38l-6 16M38 38l6 16"
        stroke="var(--gold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        className="animate-tie-bow"
        style={{ animationDelay: "200ms" }}
      />
      <circle cx="32" cy="34" r="3" fill="var(--primary)" />
    </svg>
  );
}

/** Empty states: an untied ribbon, quietly. */
export function RibbonEmpty({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M16 20c8 6 16 6 24 0s10-2 8 6-10 10-18 10-16-2-18-8 0-10 4-8Z"
        stroke="var(--text-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M28 40l-4 12M38 40l4 12"
        stroke="var(--text-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/** Section divider: a hairline with a small gold ribbon knot at the left. */
export function RibbonDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden>
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none">
        <path d="M2 3l4 3-4 3M10 3L6 6l4 3" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
