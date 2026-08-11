import { useEffect, useState } from "react";

/**
 * Same-day delivery is the whole promise, so the site has to know where the
 * customer is. Persisted locally — there's no account requirement to browse.
 */
// Only cities we genuinely deliver to today. A stale stored pick from the
// old longer list falls back to Beirut in getArea().
export const AREAS = ["Beirut", "Tripoli"] as const;
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
 * Optional street-level details the shopper can attach from the header's
 * area picker. Mirrors the addresses table's street fields (street, building,
 * floor, apartment, notes) so checkout can prefill instead of asking again.
 * Local-only for guests; the signed-in path also updates their default
 * address record from the picker.
 */
export type AddressDetails = {
  street: string;
  building: string;
  floor: string;
  apartment: string;
  notes: string;
};

export const EMPTY_ADDRESS_DETAILS: AddressDetails = {
  street: "",
  building: "",
  floor: "",
  apartment: "",
  notes: "",
};

const ADDRESS_KEY = "cado-address-details";

export function getAddressDetails(): AddressDetails {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (!raw) return { ...EMPTY_ADDRESS_DETAILS };
    const p = JSON.parse(raw) as Partial<AddressDetails>;
    return {
      street: typeof p.street === "string" ? p.street : "",
      building: typeof p.building === "string" ? p.building : "",
      floor: typeof p.floor === "string" ? p.floor : "",
      apartment: typeof p.apartment === "string" ? p.apartment : "",
      notes: typeof p.notes === "string" ? p.notes : "",
    };
  } catch {
    return { ...EMPTY_ADDRESS_DETAILS };
  }
}

export function setAddressDetails(details: AddressDetails) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(details));
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
