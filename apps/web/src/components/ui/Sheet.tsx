import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Bottom sheet. Used for gift options, variant pickers, the area selector —
 * anywhere a full page would make the person lose their place.
 *
 * Dismissal: backdrop tap, Escape, or a downward drag past 100px.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
        className="relative max-h-[85vh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-sheet bg-surface pb-[env(safe-area-inset-bottom)] shadow-lift"
      >
        <div className="sticky top-0 z-10 bg-surface pt-3">
          <div className="mx-auto h-1 w-10 rounded-pill bg-line" aria-hidden />
          {title ? <h2 className="px-5 pb-3 pt-3 font-display text-h2">{title}</h2> : null}
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
