import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** An optional way to act on what just happened — "Gift card added · View cart". */
/** `to` navigates; `onClick` acts in place (Undo). Exactly one is used. */
type ToastAction = { label: string; to?: string; onClick?: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {});

/** Call this from anywhere to confirm an action: toast("Added to cart").
 *  Pass an action to offer somewhere to go: toast("Gift card added",
 *  { label: "View cart", to: "/cart" }). */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, action?: ToastAction) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, action }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Sits above the tab bar so it never covers the primary nav. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => setToasts((list) => list.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    // A toast carrying an action stays a little longer — it is offering
    // something to tap, and 2.5s is not long enough to read it and reach it.
    const t = setTimeout(onDone, toast.action ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [onDone, toast.action]);

  return (
    <div
      role="status"
      className="animate-toast-in flex items-center gap-3 rounded-pill bg-ink px-5 py-3 text-body text-inverse shadow-lift"
    >
      {toast.message}
      {toast.action ? (
        // pointer-events-auto: the container above is deliberately
        // click-through so a toast never blocks the page, so the one thing
        // meant to be tapped has to opt back in.
        toast.action.to ? (
          <Link
            to={toast.action.to}
            onClick={onDone}
            className="pointer-events-auto shrink-0 font-medium text-gold underline underline-offset-4"
          >
            {toast.action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick?.();
              onDone();
            }}
            className="pointer-events-auto shrink-0 font-medium text-gold underline underline-offset-4"
          >
            {toast.action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
