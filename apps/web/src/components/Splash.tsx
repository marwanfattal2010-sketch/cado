import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

const SEEN_KEY = "cado-splash-seen";

export function Splash() {
  // Only on a genuinely fresh app open, not on every route change.
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SEEN_KEY));
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    const fade = setTimeout(() => setLeaving(true), 4200);
    const hide = setTimeout(() => setVisible(false), 4800);
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
      <BrandLogo variant="cream" className="animate-splash-in h-20 w-auto sm:h-24" />
      <span className="animate-splash-fade mt-4 text-[11px] tracking-[0.35em] text-gold">
        GIFTS, DELIVERED
      </span>
    </div>
  );
}
