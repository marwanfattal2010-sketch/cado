/**
 * WHERE CADO DELIVERS, and it is two circles.
 *
 * THIS FILE IS HALF OF A PAIR. `resolve_delivery_city(lat, lng)` in migration
 * 0104 holds the same two circles in SQL, and a trigger on `orders` uses it to
 * reject an undeliverable order. Change a radius here without changing it
 * there and the app enables the Confirm button for a pin the server will
 * refuse at checkout — which is the worst possible place to find out.
 *
 * They are duplicated rather than shared because the client has to answer this
 * question on every frame the map settles, and a round trip per pin drag is
 * not an option. The cost of the duplication is one line in a report; the cost
 * of a network call there is a map that feels broken.
 *
 * ADDING A CITY IS ONE LINE HERE AND ONE LINE IN 0104. Nothing else reads a
 * city list — the old "Choose a city" picker is gone, and the city is derived
 * from wherever the pin lands.
 */

export type DeliveryZone = {
  city: string;
  center: { lat: number; lng: number };
  radiusKm: number;
};

export const DELIVERY_ZONES: DeliveryZone[] = [
  { city: "Beirut", center: { lat: 33.8938, lng: 35.5018 }, radiusKm: 12 },
  { city: "Tripoli", center: { lat: 34.4367, lng: 35.8497 }, radiusKm: 8 },
];

/** Mean Earth radius in km. */
const R = 6371.0088;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine on a sphere rather than Vincenty on the ellipsoid: over the ~12km
 * these radii cover, at Lebanon's latitude, the two disagree by well under a
 * metre. The pin is not that accurate and neither is the driver.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Which city a point belongs to, and whether we deliver there.
 *
 * FIRST MATCH WINS rather than nearest-centre. The zones do not overlap today,
 * and if they ever do, "the first zone that contains this point" is a rule
 * someone can read off the array; "whichever centre happens to be nearer" is
 * a rule that changes when a radius changes.
 *
 * Outside every zone, `city` is null and the CALLER supplies a display name
 * from reverse geocoding. This function never invents a city name — it only
 * knows the ones it serves.
 */
export function resolveCity(
  lat: number,
  lng: number
): { city: string | null; inZone: boolean } {
  for (const zone of DELIVERY_ZONES) {
    if (distanceKm({ lat, lng }, zone.center) <= zone.radiusKm) {
      return { city: zone.city, inZone: true };
    }
  }
  return { city: null, inZone: false };
}

/** Where a map opens when we have nothing better: the first zone's centre. */
export const DEFAULT_CENTER = DELIVERY_ZONES[0]!.center;

/** The one line under the sheet title. Derived, so a new city updates it. */
export const ZONES_SUMMARY = `${DELIVERY_ZONES.map((z) => z.city).join(" & ")} tonight · more cities soon`;
