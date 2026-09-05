import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { geo } from "../../lib/geo";
import { DEFAULT_CENTER, resolveCity } from "../../lib/deliveryZones";

/**
 * PIN YOUR LOCATION — full screen, and the map moves under a fixed pin.
 *
 * Dragging a marker means your thumb covers the exact point you are trying to
 * place. Every delivery app converged on the same answer: nail the pin to the
 * centre of the screen and move the world behind it. The point you are
 * choosing is never under your finger.
 *
 * LEAFLET DIRECTLY, not react-leaflet. The map here is one imperative object
 * with a lifetime tied to a screen that opens and closes — no markers to
 * reconcile, no layers driven by props, nothing React is good at. Wrapping it
 * in components would add a reconciliation layer over an API that already
 * does exactly what is needed.
 *
 * THE TILES ARE ESRI WORLD STREET MAP, and that is not what the brief asked
 * for. CARTO Voyager was the plan; every CARTO basemap now returns tiles with
 * "API KEY REQUIRED" stamped diagonally across them, and OpenStreetMaps own
 * tile.openstreetmap.org answers 200 with a picture that says "Access
 * blocked". Both were opened and looked at before this was changed.
 *
 * Esri needs no key, carries no watermark, and labels Lebanese streets in
 * French and Arabic the way they are signed. Its attribution is required and
 * is in the corner.
 */

const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ATTRIB = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

export type PinResult = {
  lat: number;
  lng: number;
  line: string | null;
  geocodedCity: string | null;
  city: string;
  inZone: boolean;
};

export function PinScreen({
  initial,
  onBack,
  onConfirm,
}: {
  initial?: { lat: number; lng: number } | null;
  onBack: () => void;
  onConfirm: (r: PinResult) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [center, setCenter] = useState(initial ?? DEFAULT_CENTER);
  const [line, setLine] = useState<string | null>(null);
  const [geoCity, setGeoCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState(true);
  const [settling, setSettling] = useState(false);

  const zone = resolveCity(center.lat, center.lng);

  // The map is created ONCE. Re-creating it on a state change would tear down
  // the tile cache and flash white on every pin move.
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      zoomControl: false,
      // The pin is the target; a double-tap zoom fights the drag it usually
      // follows on a phone.
      doubleClickZoom: false,
      attributionControl: true,
    });
    L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 20 }).addTo(map);
    mapRef.current = map;

    // `movestart` is the honest moment to say "this is stale" — the address
    // under the old pin stops being true the instant the map starts moving.
    map.on("movestart", () => {
      setSettling(true);
      setHint(false);
    });
    map.on("moveend", () => {
      const c = map.getCenter();
      setSettling(false);
      setCenter({ lat: c.lat, lng: c.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 2000);
    return () => clearTimeout(t);
  }, []);

  /**
   * Reverse geocode, debounced 500ms after the map settles.
   *
   * `cancelled` is not optional. Drag, pause, drag again and two requests are
   * in flight; without this the first one to return wins, which is routinely
   * the older one, and the card shows the address of a place the pin has
   * already left.
   */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const place = await geo.reverse(center.lat, center.lng);
      if (cancelled) return;
      setLine(place.line);
      setGeoCity(place.city);
      setLoading(false);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [center.lat, center.lng]);

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Zoom from the fix's own accuracy: a 10m fix earns 18, a 500m cell
        // tower fix gets 16, because showing a doorway for a fix that could be
        // three streets away is a lie told at high magnification.
        const acc = pos.coords.accuracy ?? 100;
        const zoom = acc <= 30 ? 18 : acc <= 150 ? 17 : 16;
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], zoom);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const cityText = zone.city ?? geoCity ?? "Unknown area";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div ref={hostRef} className="relative min-h-0 flex-1" />

      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-3 top-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-pill bg-white text-[18px] text-ink shadow-lift"
      >
        ←
      </button>
      <span className="pointer-events-none absolute inset-x-0 top-4 z-[1000] text-center text-[15px] font-bold text-ink">
        <span className="rounded-pill bg-white/90 px-3 py-1">Pin your location</span>
      </span>

      {/* THE PIN. Centred on the map viewport, not the screen: the bottom card
          takes real height, and a pin centred on the screen would sit below
          the point the map reports as its centre. `-translate-y-full` puts the
          pin's TIP on that point rather than its middle. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 z-[999] -translate-x-1/2 -translate-y-full"
        style={{ top: "calc(50% - 96px)" }}
      >
        <svg width="34" height="46" viewBox="0 0 34 46" fill="none">
          <ellipse cx="17" cy="43" rx="6" ry="2.5" fill="rgba(0,0,0,.25)" />
          <path
            d="M17 1c8.3 0 15 6.6 15 14.7C32 26.3 17 41 17 41S2 26.3 2 15.7C2 7.6 8.7 1 17 1Z"
            fill="rgb(var(--persimmon))"
            stroke="#fff"
            strokeWidth="2"
          />
          <circle cx="17" cy="15.5" r="5" fill="#fff" />
        </svg>
      </span>

      {hint ? (
        <span className="pointer-events-none absolute left-1/2 z-[1000] -translate-x-1/2 rounded-pill bg-ink/85 px-3 py-1.5 text-[12px] font-medium text-white" style={{ top: "calc(50% - 156px)" }}>
          Adjust the pin
        </span>
      ) : null}

      <button
        type="button"
        onClick={locateMe}
        aria-label="Use my current location"
        className="absolute right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-pill bg-white text-[18px] shadow-lift"
        style={{ bottom: "calc(var(--pin-card-h, 210px) + 12px)" }}
      >
        ◎
      </button>

      <div className="shrink-0 rounded-t-[24px] bg-white px-4 pb-4 pt-4 shadow-lift">
        <p className="text-[16px] font-semibold text-ink">
          {settling || loading ? "Finding this address…" : (line ?? "Pinned location")}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">{cityText}</p>

        {zone.inZone ? (
          <p className="mt-2 text-[13px] font-medium text-success">
            Delivers tonight to {zone.city}
          </p>
        ) : (
          <p className="mt-2 rounded-[10px] bg-persimmon/10 px-2.5 py-2 text-[13px] font-medium text-persimmon">
            We don&rsquo;t deliver here yet — Beirut &amp; Tripoli only for now
          </p>
        )}

        <button
          type="button"
          disabled={!zone.inZone}
          onClick={() =>
            onConfirm({
              lat: center.lat,
              lng: center.lng,
              line,
              geocodedCity: geoCity,
              city: cityText,
              inZone: zone.inZone,
            })
          }
          className="mt-3 w-full rounded-[12px] bg-persimmon py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
        >
          Confirm location
        </button>
      </div>
    </div>
  );
}
