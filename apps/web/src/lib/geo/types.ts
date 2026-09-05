/**
 * THE ONE SEAM between CADO and whoever is doing its geocoding.
 *
 * Google Maps needs a billing-enabled key we do not have, so the shipping
 * implementation is Photon + Nominatim (both free, both OSM). That will very
 * likely change once there is a key, and when it does it should be ONE file —
 * not a search-and-replace through a map screen, an autocomplete list and a
 * details form.
 *
 * So nothing outside `lib/geo/` may name Photon or Nominatim, and nothing
 * inside this interface may leak their response shapes.
 */

/** One autocomplete suggestion. */
export type GeoResult = {
  /** Stable enough to use as a React key within one result set. */
  id: string;
  /** The bold first line: "Hamra Street", "Le Gray Beirut". */
  name: string;
  /** The grey second line: "Ras Beirut, Beirut". Never repeats `name`. */
  locality: string;
  lat: number;
  lng: number;
};

/** What a pin resolves to. */
export type GeoPlace = {
  /**
   * A street-level line, or null when the provider has nothing.
   *
   * Null is a real answer and the UI shows "Pinned location" for it. It is
   * NOT the same as an empty string, and it must never be filled in with a
   * guess — half of Lebanon has no formal street addressing, and a made-up
   * street name on a delivery is worse than none.
   */
  line: string | null;
  /** The provider's idea of the city, for display only outside our zones. */
  city: string | null;
};

export interface GeoProvider {
  /**
   * Autocomplete. `near` biases results; it does not restrict them.
   * Implementations must filter to Lebanon themselves.
   */
  search(query: string, near?: { lat: number; lng: number }): Promise<GeoResult[]>;
  /** Reverse geocode a pin. Never throws — returns nulls on failure. */
  reverse(lat: number, lng: number): Promise<GeoPlace>;
}
