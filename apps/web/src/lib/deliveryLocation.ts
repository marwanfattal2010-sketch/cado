import { useEffect, useState } from "react";
import { AREAS, type Area } from "./area";
import { resolveCity } from "./deliveryZones";

/**
 * WHERE THE ORDER IS GOING — one value, one place, one event.
 *
 * This replaces "the city the shopper picked from a list". The city is now
 * DERIVED from a pin, and the pin travels with everything else the driver
 * needs, so the app has to remember more than a string.
 *
 * IT STILL WRITES `cado-area`. A dozen screens read `useArea()` — "Top stores
 * near you", the delivery promise, availability copy — and rewriting all of
 * them to read this store would be a large diff whose only purpose is to end
 * up at the same value. Instead this is the single writer and `cado-area`
 * becomes its projection: set a location here and every existing reader sees
 * the new city with no change at all. That also means a shopper who had a
 * city stored before this shipped keeps it.
 *
 * A GUEST IS A FIRST-CLASS CASE. You can pin, confirm and browse without an
 * account; only SAVING an address to the address book needs one. So the
 * selected location lives in localStorage whether or not there is a session,
 * and signing in later does not discard it.
 */

export type DeliveryLocation = {
  /**
   * The saved address this came from, when it came from one. Null means a
   * one-off pin (GPS or a map drop) that is not in the address book.
   */
  addressId: string | null;
  /**
   * 'home' | 'work' | 'other' for a saved address; 'current' for a GPS fix;
   * 'pin' for a dropped pin.
   */
  kind: "home" | "work" | "other" | "current" | "pin";
  /** What the header chip prints before the city. "Home", "Current location". */
  label: string;
  /** The resolved delivery city, or the geocoder's guess outside our zones. */
  city: string;
  lat: number;
  lng: number;
  /** One line under the label in the sheet. Not shown in the header chip. */
  line: string | null;
};

const KEY = "cado-delivery-location";
const EVENT = "cado-delivery-location-change";

export function getLocation(): DeliveryLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<DeliveryLocation>;
    // Coordinates are the one part that cannot be defaulted: a location
    // without them cannot be zone-checked, and a zone check that silently
    // passes is worse than no stored location at all.
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return null;
    if (!p.city || !p.label) return null;
    return {
      addressId: typeof p.addressId === "string" ? p.addressId : null,
      kind: (p.kind as DeliveryLocation["kind"]) ?? "pin",
      label: p.label,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      line: typeof p.line === "string" ? p.line : null,
    };
  } catch {
    return null;
  }
}

export function setLocation(loc: DeliveryLocation) {
  localStorage.setItem(KEY, JSON.stringify(loc));

  // Keep the legacy projection in step. Only ever written with a city we
  // actually serve — `useArea` has no room for anything else, and writing
  // "Jounieh" into it would make every "we deliver here" surface lie.
  if ((AREAS as readonly string[]).includes(loc.city)) {
    localStorage.setItem("cado-area", loc.city);
    window.dispatchEvent(new CustomEvent("cado-area-change"));
  }

  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearLocation() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useDeliveryLocation(): [DeliveryLocation | null, (l: DeliveryLocation) => void] {
  const [loc, setLocal] = useState<DeliveryLocation | null>(() => {
    try {
      return getLocation();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => setLocal(getLocation());
    window.addEventListener(EVENT, sync);
    // `storage` fires for OTHER tabs, which is exactly when we would otherwise
    // miss a change: two tabs open, address set in one.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [loc, setLocation];
}

/**
 * THE HEADER’S ONE LINE.
 *
 * LABEL PLUS STREET, not label plus city. "Home · Beirut" is true of every
 * address this shopper has; "Home · Main St" is the one they picked. The city
 * still drives availability everywhere else — it is just not what belongs in
 * eight characters of header.
 *
 * A GPS fix has no label, so it shows its reverse-geocoded street when one
 * came back and the words "Current location" when none did. It never shows a
 * bare city, which would read as a saved address that is not one.
 *
 * "Set your location" appears ONLY when nothing is selected. A default city
 * printed as though it were a choice is how an order ends up at the wrong end
 * of the country.
 */
export function chipLabel(loc: DeliveryLocation | null): {
  text: string;
  unset: boolean;
} {
  if (!loc) return { text: "Set your location", unset: true };

  const detail = loc.line?.trim();
  if (loc.kind === "current" || loc.kind === "pin") {
    return { text: detail || loc.label, unset: false };
  }
  return {
    text: detail ? `${loc.label} · ${detail}` : `${loc.label} · ${loc.city}`,
    unset: false,
  };
}

/**
 * Builds a location from a pin, resolving the city from the zones and falling
 * back to the geocoder's name outside them.
 *
 * The fallback city is DISPLAY ONLY — `inZone` is what gates the button, and
 * a name from Nominatim never makes a place deliverable.
 */
export function locationFromPin(args: {
  lat: number;
  lng: number;
  geocodedCity: string | null;
  line: string | null;
  kind: DeliveryLocation["kind"];
  label: string;
  addressId?: string | null;
}): { location: DeliveryLocation; inZone: boolean } {
  const { city, inZone } = resolveCity(args.lat, args.lng);
  return {
    inZone,
    location: {
      addressId: args.addressId ?? null,
      kind: args.kind,
      label: args.label,
      city: city ?? args.geocodedCity ?? "Unknown area",
      lat: args.lat,
      lng: args.lng,
      line: args.line,
    },
  };
}

/**
 * True when nothing has been chosen yet, so a caller can decide whether to
 * preload a saved default. Kept as a function rather than a bare null check
 * so the "is anything set" question has one answer in one place.
 */
export function hasLocation(): boolean {
  try {
    return getLocation() !== null;
  } catch {
    return false;
  }
}

/** The legacy type, for the handful of props still typed as `Area`. */
export type { Area };
