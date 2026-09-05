import { useEffect, useState } from "react";
import {
  locationFromAddress,
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
import { PinIcon } from "../Icons";
import { PinScreen, type PinResult } from "./PinScreen";
import { AddressForm } from "./AddressForm";

/**
 * DELIVERY ADDRESS — a list of places, and nothing else.
 *
 * THERE IS NO SEARCH FIELD HERE, deliberately. The first build had one, and it
 * made the sheet do two unrelated jobs: pick a saved address, or find a new
 * place on a map. Searching only makes sense next to the map it moves, so it
 * moved to the Pin screen. What is left is a list you choose from and one
 * button — which is all this sheet was ever for.
 *
 * THREE SCREENS, ONE COMPONENT. Sheet -> pin -> details is a single flow with
 * a back button at every step, so it is one piece of state rather than three
 * routes. Routing it would put the map in the history stack, and "back" out of
 * a half-finished address would land on a map with no context.
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
  const [geoDenied, setGeoDenied] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Reset to the first screen whenever the sheet reopens, or someone who
  // backed out mid-address returns to a form for a pin they cannot see.
  useEffect(() => {
    if (open) {
      setScreen({ name: "sheet" });
      setMenuFor(null);
      setConfirmDelete(null);
    }
  }, [open]);

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
          onClose();
        }}
      />
    );
  }

  /**
   * Returns whether anything was actually selected.
   *
   * This used to open with `if (a.latitude == null) return;` and every address
   * saved before the pin flow existed has null coordinates — so tapping "Home"
   * closed the sheet and changed nothing, with no error to explain it. The
   * fallback now lives in `locationFromAddress`; the boolean is so the sheet
   * cannot close on a no-op again.
   */
  function selectSaved(a: SavedAddress): boolean {
    const location = locationFromAddress(a, {
      title: addressTitle(a),
      line: addressLine(a),
    });
    if (location) setLocation(location);
    return !!location;
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

      {/* Fits its content up to 70% of the screen; the LIST is what scrolls,
          so the title and the button stay put however many addresses there
          are. */}
      <div className="relative flex max-h-[70vh] w-full flex-col rounded-t-[24px] bg-white">
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-page text-[16px] leading-none text-ink"
          >
            ×
          </button>
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-ink">Delivery address</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* CURRENT LOCATION SITS ABOVE THE SAVED ONES and wears the same row
              shape. It is the fastest answer for someone standing where they
              want the delivery, and giving it a different treatment made it
              look like a setting rather than a choice. */}
          <Row
            title="Current location"
            subtitle="We'll pin it on the map"
            onClick={useCurrentLocation}
          />
          {geoDenied ? (
            <p className="px-4 pb-2 text-[13px] text-muted">
              Location is off — add an address instead
            </p>
          ) : null}

          {addresses.map((a) => {
            const selected = loc?.addressId === a.id;
            return (
              <div key={a.id}>
                <Row
                  title={addressTitle(a)}
                  subtitle={addressLine(a)}
                  selected={selected}
                  badge={a.is_default ? "Default" : undefined}
                  // Only close when something was actually selected. Closing
                  // on a no-op is precisely what made this look broken.
                  onClick={() => {
                    if (selectSaved(a)) onClose();
                  }}
                  onMenu={() => setMenuFor(menuFor === a.id ? null : a.id)}
                />

                {menuFor === a.id ? (
                  <div className="flex flex-wrap gap-2 border-b border-line px-4 pb-3">
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
                    {/* Inline confirm, never a browser confirm(): it cannot be
                        styled, it blocks the thread, and inside a WebView it
                        looks like the app has crashed. */}
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
            );
          })}
        </div>

        <div className="shrink-0 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() =>
              setScreen({
                name: "pin",
                initial: loc ? { lat: loc.lat, lng: loc.lng } : null,
                editing: null,
              })
            }
            className="card-press h-[52px] w-full rounded-[12px] bg-persimmon text-[16px] font-bold text-white"
          >
            + Add new address
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ONE ROW SHAPE for every entry, saved or not.
 *
 * 72px, full-bleed, hairline-separated. The selected one takes a persimmon
 * wash across the WHOLE row rather than a border or a tick alone — at a glance
 * from arm's length a 1px outline is invisible and a tinted band is not.
 */
function Row({
  title,
  subtitle,
  selected = false,
  badge,
  onClick,
  onMenu,
}: {
  title: string;
  subtitle: string;
  selected?: boolean;
  badge?: string;
  onClick: () => void;
  onMenu?: () => void;
}) {
  return (
    <div
      className="flex h-[72px] items-center gap-3 border-b border-line px-4"
      style={selected ? { background: "rgb(var(--persimmon) / 0.06)" } : undefined}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {/* ONE OUTLINE PIN for every row. The emoji set was three
            different drawing styles in one list — a 3D pushpin, a flat
            house, a briefcase — and the label beside each row already
            says which kind it is. */}
        <PinIcon className="h-6 w-6 shrink-0 text-ink" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[16px] font-bold text-ink">{title}</span>
            {badge ? (
              <span className="shrink-0 rounded-pill bg-page px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[14px] text-muted">{subtitle}</span>
        </span>
      </button>

      {selected ? (
        <span aria-hidden className="shrink-0 text-[15px] text-persimmon">
          ✓
        </span>
      ) : null}
      {onMenu ? (
        <button
          type="button"
          aria-label="Address options"
          onClick={onMenu}
          className="shrink-0 px-1 text-[18px] leading-none text-muted"
        >
          ⋮
        </button>
      ) : null}
    </div>
  );
}
