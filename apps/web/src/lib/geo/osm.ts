import type { GeoPlace, GeoProvider, GeoResult } from "./types";

/**
 * PHOTON FOR SEARCH, NOMINATIM FOR REVERSE. Both free, both OpenStreetMap,
 * both used within their published limits.
 *
 * Photon is the search half because Nominatim's own search endpoint asks you
 * not to use it for autocomplete — it is not built for a request per
 * keystroke, and Photon is (it exists for exactly this).
 *
 * NOMINATIM'S RULE IS ONE REQUEST PER SECOND, and it is a condition of use
 * rather than a rate limiter that returns 429. Breaking it gets an IP blocked
 * with no warning, which on a deployed app means every pin says "Pinned
 * location" and nobody knows why. Both defences are below: a queue that spaces
 * calls, and a cache so a map jittering around one spot asks once.
 */

const PHOTON = "https://photon.komoot.io/api/";
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

/* -------------------------------------------------------------------------- */
/* Reverse-geocode cache + throttle                                            */
/* -------------------------------------------------------------------------- */

/**
 * FOUR DECIMAL PLACES, which is about 11 metres.
 *
 * A map settling after a drag reports a stream of positions a few centimetres
 * apart. Keyed on raw floats every one of them is a cache miss and a fresh
 * request; rounded to 11m they are one key. 11m is also roughly the point
 * below which the answer stops changing — two pins inside the same building
 * get the same street.
 */
const keyOf = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const cache = new Map<string, GeoPlace>();

/** Serialises calls at >= 1100ms apart. See the note above. */
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  // The chain must survive a rejection or every later call inherits it.
  chain = run.catch(() => undefined);
  return run;
}

/* -------------------------------------------------------------------------- */

/**
 * Photon returns GeoJSON features whose properties are sparse and
 * inconsistent — `street` may be absent on a named building, `name` absent on
 * a plain street. This builds the two display lines from whatever is there and
 * never repeats a value across both.
 */
function toResult(f: {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}): GeoResult | null {
  const c = f.geometry?.coordinates;
  const p = f.properties ?? {};
  if (!c || c.length < 2) return null;

  const name = p.name || p.street || p.district || p.city;
  if (!name) return null;

  const localityParts = [p.district, p.city, p.state].filter(
    (v): v is string => !!v && v !== name
  );

  return {
    id: `${p.osm_type ?? "x"}${p.osm_id ?? `${c[1]},${c[0]}`}`,
    name,
    locality: [...new Set(localityParts)].join(", "),
    lat: c[1]!,
    lng: c[0]!,
  };
}

export const osmProvider: GeoProvider = {
  async search(query, near) {
    const q = query.trim();
    if (q.length < 3) return [];

    const params = new URLSearchParams({ q, limit: "6", lang: "en" });
    // Bias, not a filter — Photon has no bounding-box parameter, so the
    // country check below is what actually keeps results Lebanese.
    if (near) {
      params.set("lat", String(near.lat));
      params.set("lon", String(near.lng));
    }

    try {
      const res = await fetch(`${PHOTON}?${params}`);
      if (!res.ok) return [];
      const json = (await res.json()) as {
        features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }[];
      };
      return (json.features ?? [])
        // Lebanon only. Photon biases towards `near` but will happily return
        // Cyprus for a coastal query, and a Cypriot address in a Lebanese
        // delivery app is not a near miss, it is a wrong answer.
        .filter((f) => (f.properties?.countrycode ?? "").toUpperCase() === "LB")
        .map(toResult)
        .filter((r): r is GeoResult => r !== null);
    } catch {
      // A dead autocomplete is a quiet inconvenience — the user can still pin
      // on the map. Throwing here would take the sheet down with it.
      return [];
    }
  },

  async reverse(lat, lng) {
    const key = keyOf(lat, lng);
    const hit = cache.get(key);
    if (hit) return hit;

    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lng),
      zoom: "18",
      "accept-language": "en",
    });

    try {
      const res = await throttled(() =>
        fetch(`${NOMINATIM}?${params}`, {
          // Nominatim asks callers to identify themselves. A browser will not
          // let us set User-Agent, but Referer arrives on its own from the
          // deployed origin, which is the identification that matters.
          headers: { Accept: "application/json" },
        })
      );
      if (!res.ok) return { line: null, city: null };

      const json = (await res.json()) as {
        address?: Record<string, string | undefined>;
        name?: string;
      };
      const a = json.address ?? {};

      // Road plus house number where both exist; otherwise the most specific
      // named thing available. Never a bare city — that is not an address, and
      // showing it as one implies a precision the pin does not have.
      const road = a.road || a.pedestrian || a.footway || a.neighbourhood;
      const line =
        road && a.house_number
          ? `${road} ${a.house_number}`
          : road || json.name || a.suburb || a.quarter || null;

      const place: GeoPlace = {
        line: line ?? null,
        city: a.city || a.town || a.village || a.state || null,
      };
      cache.set(key, place);
      return place;
    } catch {
      return { line: null, city: null };
    }
  },
};
