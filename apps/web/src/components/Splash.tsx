import { useEffect, useState } from "react";

const SEEN_KEY = "cado-splash-seen";

export function Splash() {
  // Only on a genuinely fresh app open, not on every route change.
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SEEN_KEY));
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    const fade = setTimeout(() => setLeaving(true), 1500);
    const hide = setTimeout(() => setVisible(false), 2100);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <span className="animate-splash-in font-display text-5xl font-semibold tracking-[0.3em] text-cream sm:text-6xl">
        CADO
      </span>
      <span className="animate-splash-fade mt-4 text-[11px] tracking-[0.35em] text-gold">
        GIFTS, DELIVERED
      </span>
    </div>
  );
}
