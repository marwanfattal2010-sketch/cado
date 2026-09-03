import { cutoffLabel, isBeforeCutoff } from "./deliveryPromise";
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
 * SUPERSEDED BY `app_settings`.
 *
 * These were a hardcoded guess (midnight, opens 08:00) made before the shop's
 * real hours existed as data. They now do — one row, 09:00–21:00 Asia/Beirut,
 * and it is the row the server checks when an order is placed. Leaving two
 * numbers in the codebase meant the product card said "tonight" until 9pm
 * while checkout offered same-day until midnight, and one of them had to be
 * wrong. Everything below delegates to `deliveryPromise`, which reads that
 * row; the exports stay so existing call sites keep compiling.
 */
export const SAME_DAY_OPENS_HOUR = 8;

/**
 * True while an order placed now still earns same-day delivery.
 *
 * Note this uses the SHOP's clock, not the device's. A phone with its
 * timezone set wrong must not be able to talk itself into a same-day promise
 * the server will refuse.
 */
export function sameDayOpen() {
  return isBeforeCutoff();
}

/**
 * Kept as `{ passed, label }` because several screens read one or the other:
 * the product card only asks `.passed` before it will say "today", the
 * product page prints `.label`.
 */
export function timeUntilCutoff() {
  if (!sameDayOpen()) {
    return {
      passed: true as const,
      label: "Choose your delivery date — earliest tomorrow",
    };
  }
  return {
    passed: false as const,
    label: `Order before ${cutoffLabel()} for delivery today`,
  };
}
