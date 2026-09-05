import { osmProvider } from "./osm";
import type { GeoProvider } from "./types";

/**
 * The provider the app uses. Swapping to Google is this one line.
 *
 * Import `geo` from here and nothing else — `osm.ts` is an implementation
 * detail, and a component that imports it directly is a component that has to
 * be edited when the provider changes.
 */
export const geo: GeoProvider = osmProvider;

export type { GeoPlace, GeoProvider, GeoResult } from "./types";
