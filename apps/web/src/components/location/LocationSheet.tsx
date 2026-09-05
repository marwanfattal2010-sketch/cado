import { useEffect, useMemo, useRef, useState } from "react";
import { geo, type GeoResult } from "../../lib/geo";
import { DEFAULT_CENTER, ZONES_SUMMARY } from "../../lib/deliveryZones";
import {
  locationFromPin,
  setLocation,
  useDeliveryLocation,
} from "../../lib/deliveryLocation";
import {
  addressLine,
  addressTitle,
  useAddressBook,
  useDeleteAddress,
  useSetDefaultAddress,
  type SavedAddress,
} from "../../hooks/useAddressBook";
import { PinScreen, type PinResult } from "./PinScreen";
import { AddressForm } from "./AddressForm";

/**
 * WHERE SHOULD WE DELIVER? — the sheet the header chip and checkout both open.
 *
 * There is no "Choose a city" here and there is not one anywhere else either.
 * The city is DERIVED from the pin, every time, by `resolveCity`. A picker let
 * someone select Beirut and then pin a building in Jounieh, and the two
 * answers disagreed with nobody to arbitrate.
 *
 * THREE SCREENS, ONE COMPONENT. Sheet → pin → details is a single flow with a
 * back button at every step, so it is one piece of state (`screen`) rather
 * than three routes. Routing it would put the map in the history stack, and
 * "back" out of a half-finished address would land on a map with no context.
 */

type Screen =
  | { name: "sheet" }
  | { name: "pin"; initial: { lat: number; lng: number } | null; editing: SavedAddress | null }
  | { name: "form"; pin: PinResult; editing: SavedAddress | null };

export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loc] = useDeliveryLocation();
  const book = useAddressBook();
  const del = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [screen, setScreen] = useState<Screen>({ name: "sheet" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [geoDenied, setGeoDenied] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const near = useMemo(
    () => (loc ? { lat: loc.lat, lng: loc.lng } : DEFAULT_CENTER),
    [loc]
  );

  // Reset to the first screen whenever the sheet is reopened, or a user who
  // backed out mid-address returns to a form for a pin they cannot see.
  useEffect(() => {
    if (open) setScreen({ name: "sheet" });
  }, [open]);

  /** Autocomplete: 400ms after typing stops, 3 characters minimum. */
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    timer.current = window.setTimeout(async () => {
      const r = await geo.search(q, near);
      if (!cancelled) setResults(r);
    }, 400);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, near]);

  if (!open) return null;

  if (screen.name === "pin") {
    return (
      <PinScreen
        initial={screen.initial}
        onBack={() => setScreen({ name: "sheet" })}
        onConfirm={(pin) => setScreen({ name: "form", pin, editing: screen.editing })}
      />
    );
  }

  if (screen.name === "form") {
    return (
      <AddressForm
        pin={screen.pin}
        existing={screen.editing}
        onCancel={() => setScreen({ name: "sheet" })}
        onAdjustPin={() =>
          setScreen({
            name: "pin",
            initial: { lat: screen.pin.lat, lng: screen.pin.lng },
            editing: screen.editing,
          })
        }
        onSaved={(a) => {
          selectSaved(a);
          setToast("Address saved");
          onClose();
        }}
      />
    );
  }

  function selectSaved(a: SavedAddress) {
    if (a.latitude == null || a.longitude == null) return;
    const { location } = locationFromPin({
      lat: a.latitude,
      lng: a.longitude,
      geocodedCity: a.city,
      line: addressLine(a),
      kind: (a.label as "home" | "work" | "other") ?? "other",
      label: addressTitle(a),
      addressId: a.id,
    });
    setLocation(location);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setScreen({
          name: "pin",
          initial: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          editing: null,
        }),
      () => setGeoDenied(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const addresses = book.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-white pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-[1] bg-white pt-2">
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-pill bg-line" />
        </div>

        <div className="px-4">
          <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
            Where should we deliver?
          </h2>
          <p className="mt-1 text-[13px] text-muted">{ZONES_SUMMARY}</p>

          {/* MAGNIFIER ON THE RIGHT, matching every other search field in the
              app. */}
          <div className="relative mt-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a street, building or landmark"
              className="w-full rounded-pill border border-line bg-white py-2.5 pl-4 pr-10 text-[15px] text-ink outline-none focus:border-persimmon"
            />
            <span aria-hidden className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink">
              ⌕
            </span>
          </div>

          {results.length ? (
            <ul className="mt-2 overflow-hidden rounded-[12px] border border-line">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setScreen({ name: "pin", initial: { lat: r.lat, lng: r.lng }, editing: null })
                    }
                    className="block w-full px-3 py-2.5 text-left"
                  >
                    <span className="block truncate text-[15px] font-medium text-ink">{r.name}</span>
                    {r.locality ? (
                      <span className="block truncate text-[13px] text-muted">{r.locality}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={useCurrentLocation}
            className="card-press mt-3 flex w-full items-center gap-3 rounded-[12px] px-1 py-2.5 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-tint text-persimmon">
              ◎
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-ink">Use my current location</span>
              <span className="block text-[13px] text-muted">We&rsquo;ll pin it on the map</span>
            </span>
          </button>
          {geoDenied ? (
            <p className="mt-1 text-[13px] text-muted">
              Location is off — search for your address instead
            </p>
          ) : null}

          {addresses.length ? (
            <>
              <h3 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">
                Saved addresses
              </h3>
              <ul className="space-y-2">
                {addresses.map((a) => {
                  const selected = loc?.addressId === a.id;
                  return (
                    <li key={a.id}>
                      <div
                        className={`rounded-[12px] border bg-white p-3 ${
                          selected ? "border-persimmon" : "border-line"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              selectSaved(a);
                              onClose();
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="flex items-center gap-1.5">
                              <span aria-hidden>
                                {a.label === "home" ? "🏠" : a.label === "work" ? "💼" : "📍"}
                              </span>
                              <span className="truncate text-[15px] font-bold text-ink">
                                {addressTitle(a)}
                              </span>
                              {a.is_default ? (
                                <span className="shrink-0 rounded-pill bg-tint px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                                  Default
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-[13px] text-ink">
                              {addressLine(a)}
                            </span>
                            <span className="block text-[13px] text-muted">{a.city}</span>
                          </button>

                          {selected ? (
                            <span aria-hidden className="shrink-0 text-persimmon">✓</span>
                          ) : null}
                          <button
                            type="button"
                            aria-label="Address options"
                            onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}
                            className="shrink-0 px-1 text-[18px] leading-none text-muted"
                          >
                            ⋯
                          </button>
                        </div>

                        {menuFor === a.id ? (
                          <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setScreen({
                                  name: "pin",
                                  initial:
                                    a.latitude != null && a.longitude != null
                                      ? { lat: a.latitude, lng: a.longitude }
                                      : null,
                                  editing: a,
                                })
                              }
                              className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold text-ink"
                            >
                              Edit
                            </button>
                            {!a.is_default ? (
                              <button
                                type="button"
                                onClick={() => void setDefault.mutateAsync(a.id)}
                                className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold text-ink"
                              >
                                Set as default
                              </button>
                            ) : null}
                            {confirmDelete === a.id ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await del.mutateAsync(a);
                                  setConfirmDelete(null);
                                  setMenuFor(null);
                                }}
                                className="rounded-pill bg-persimmon px-3 py-1.5 text-[13px] font-semibold text-white"
                              >
                                Tap again to delete
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(a.id)}
                                className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold text-persimmon"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <button
            type="button"
            onClick={() =>
              setScreen({
                name: "pin",
                initial: loc ? { lat: loc.lat, lng: loc.lng } : null,
                editing: null,
              })
            }
            className="card-press mt-4 w-full rounded-[12px] border border-persimmon py-3 text-[15px] font-bold text-persimmon"
          >
            + Add new address
          </button>
        </div>

        {toast ? (
          <p className="px-4 pt-3 text-center text-[13px] font-medium text-success">{toast}</p>
        ) : null}
      </div>
    </div>
  );
}
