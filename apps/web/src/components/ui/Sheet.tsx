import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Fill the screen instead of hugging the content. For the filter panel,
   * which is a multi-group form: at 375px a content-height sheet grows and
   * shrinks as groups appear, so the Apply bar moves under your thumb
   * between one category and the next.
   */
  fullHeight?: boolean;
  /**
   * Pinned to the bottom of the panel, outside the scrolling body. This is a
   * flex row in normal flow, NOT `position: fixed` — the panel animates in on
   * a transform, which would make it the containing block for a fixed child
   * and leave the bar wherever the animation started.
   */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet. Used for gift options, variant pickers, the area selector,
 * filters and sort — anywhere a full page would make the person lose their
 * place.
 *
 * Dismissal: backdrop tap, Escape, or a downward drag past 100px.
 */
export function Sheet({ open, onClose, title, fullHeight = false, footer, children }: Props) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Escape to close, and lock background scroll while open so the page
  // behind doesn't move under the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    // Only arm the drag when the body is scrolled to the top. Otherwise a
    // normal downward scroll inside a long filter list reads as "dismiss",
    // and the sheet slides away mid-scroll.
    if ((bodyRef.current?.scrollTop ?? 0) > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    // Only track downward drags; upward should do nothing.
    setDragY(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (dragY > 100) onClose();
    else setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fade-in bg-[rgba(23,19,15,0.4)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        className={`relative flex w-full max-w-lg animate-sheet-up flex-col rounded-t-sheet bg-surface pb-[env(safe-area-inset-bottom)] shadow-lift ${
          fullHeight ? "h-[92dvh] max-h-[92dvh]" : "max-h-[85vh]"
        }`}
      >
        <div className="shrink-0 bg-surface pt-3">
          <div className="mx-auto h-1 w-10 rounded-pill bg-line" aria-hidden />
          {title ? <h2 className="px-5 pb-3 pt-3 font-display text-h2">{title}</h2> : null}
        </div>
        {/* min-h-0 so this can actually shrink inside the flex column —
            without it the body refuses to scroll and pushes the footer off
            the bottom of the panel. */}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-5 pb-4 pt-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
