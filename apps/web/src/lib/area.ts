import { useEffect, useState } from "react";

/**
 * Same-day delivery is the whole promise, so the site has to know where the
 * customer is. Persisted locally — there's no account requirement to browse.
 */
export const AREAS = ["Beirut", "Metn", "Jounieh", "Tripoli", "Saida", "Zahle"] as const;
export type Area = (typeof AREAS)[number];

const KEY = "cado-area";
const EVENT = "cado-area-change";

export function getArea(): Area {
  const stored = localStorage.getItem(KEY);
  return (AREAS as readonly string[]).includes(stored ?? "") ? (stored as Area) : "Beirut";
}

export function setArea(area: Area) {
  localStorage.setItem(KEY, area);
  // Custom event so every mounted component updates, not just the setter's.
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useArea(): [Area, (a: Area) => void] {
  const [area, setLocal] = useState<Area>(() => getArea());

  useEffect(() => {
    const sync = () => setLocal(getArea());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [area, setArea];
}

/**
 * Same-day cut-off. Real information the customer needs, not manufactured
 * urgency — so it must be honest about having passed.
 */
export const CUTOFF_HOUR = 16;

export function timeUntilCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  const ms = cutoff.getTime() - now.getTime();
  if (ms <= 0) return { passed: true as const, label: "Order now for tomorrow morning" };
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    passed: false as const,
    label: h > 0 ? `${h}h ${m}m left for same-day delivery` : `${m}m left for same-day delivery`,
  };
}
