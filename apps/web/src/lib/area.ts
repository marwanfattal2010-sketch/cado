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
 * Same-day cut-off — MIDNIGHT, not 4PM.
 *
 * Confirmed by Marwan 2026-08: an order placed any time before midnight is
 * delivered the same day. After midnight there is no same-day slot left to
 * promise, so the customer picks a delivery date and the earliest one is
 * tomorrow.
 *
 * SAME_DAY_OPENS_HOUR closes that overnight window. It is a judgement call,
 * not a rule Marwan gave: 08:00 is when a courier can realistically be
 * moving, so between 00:00 and 08:00 the site stops offering same-day rather
 * than promising a delivery nobody can make. Change this one constant if the
 * real operating hours differ.
 *
 * This is real information the customer needs, never manufactured urgency:
 * no countdown, no "X minutes left". It must be honest about having passed.
 */
export const CUTOFF_HOUR = 24;
export const SAME_DAY_OPENS_HOUR = 8;
/** How the cut-off is written in copy. `24` has no sensible 12-hour form. */
export const CUTOFF_LABEL = "midnight";

/** True while an order placed now still earns same-day delivery. */
export function sameDayOpen(now = new Date()) {
  const h = now.getHours();
  return h >= SAME_DAY_OPENS_HOUR && h < CUTOFF_HOUR;
}

/**
 * Kept as `{ passed, label }` because several screens read one or the other:
 * the product card only asks `.passed` before it will say "today", the
 * product page prints `.label`.
 */
export function timeUntilCutoff(now = new Date()) {
  if (!sameDayOpen(now)) {
    return {
      passed: true as const,
      label: "Choose your delivery date — earliest tomorrow",
    };
  }
  return {
    passed: false as const,
    label: `Order before ${CUTOFF_LABEL} for delivery today`,
  };
}
