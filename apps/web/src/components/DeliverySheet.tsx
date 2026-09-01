import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { AREAS, type Area, getAddressDetails, setAddressDetails } from "../lib/area";
import { Sheet, Button } from "./ui";

/**
 * "Where should we deliver to?" (Part 4).
 *
 * Saved addresses live in `user_addresses` for a signed-in shopper (owner-only
 * RLS, one-default enforced by a trigger) and in localStorage for a guest. On
 * login the guest's addresses are copied up once — losing the address someone
 * typed before signing up is a small betrayal that costs a checkout.
 *
 * There is NO map and no geocoding service. "Use my location" reads the
 * browser's coordinates and picks the NEARER of the two cities CADO actually
 * delivers to; it never invents a street. If permission is refused it says so
 * and the city list is right there.
 */

const GUEST_KEY = "cado-guest-addresses";

export type SavedAddress = {
  id: string;
  label: string;
  city: Area;
  area?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  notes?: string | null;
  is_default: boolean;
};

/** Rough centres, used only to choose between the two cities we serve. */
const CITY_POINTS: Record<Area, { lat: number; lon: number }> = {
  Beirut: { lat: 33.8938, lon: 35.5018 },
  Tripoli: { lat: 34.4367, lon: 35.8497 },
};

const oneLine = (a: SavedAddress) =>
  [a.street, a.building && `Bldg ${a.building}`, a.floor && `Fl ${a.floor}`, a.apartment, a.area, a.city]
    .filter(Boolean)
    .join(", ");

function readGuest(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedAddress[]) : [];
  } catch {
    return [];
  }
}
function writeGuest(list: SavedAddress[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

const FIELD =
  "h-11 w-full rounded-card border border-line bg-canvas px-3 text-body text-ink outline-none placeholder:text-muted";

export function DeliverySheet({
  open,
  onClose,
  area,
  setArea,
}: {
  open: boolean;
  onClose: () => void;
  area: Area;
  setArea: (a: Area) => void;
}) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const saved = useQuery({
    queryKey: ["addresses", session?.user.id ?? "guest"],
    queryFn: async (): Promise<SavedAddress[]> => {
      if (!session) return readGuest();
      const { data } = await supabase
        .from("user_addresses")
        .select("id, label, city, area, street, building, floor, apartment, notes, is_default")
        .order("is_default", { ascending: false })
        .order("created_at");
      return (data ?? []) as SavedAddress[];
    },
  });

  /* Guest addresses follow the person into their account, once. */
  useEffect(() => {
    if (!session) return;
    const guests = readGuest();
    if (guests.length === 0) return;
    void (async () => {
      await supabase.from("user_addresses").insert(
        guests.map((g) => ({
          profile_id: session.user.id,
          label: g.label,
          city: g.city,
          area: g.area ?? null,
          street: g.street ?? null,
          building: g.building ?? null,
          floor: g.floor ?? null,
          apartment: g.apartment ?? null,
          notes: g.notes ?? null,
          is_default: g.is_default,
        }))
      );
      writeGuest([]);
      void qc.invalidateQueries({ queryKey: ["addresses"] });
    })();
  }, [session, qc]);

  const list = saved.data ?? [];
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => `${a.label} ${oneLine(a)}`.toLowerCase().includes(q));
  }, [list, filter]);

  const cityMatches = AREAS.filter((c) => c.toLowerCase().includes(filter.trim().toLowerCase()));

  const pick = (a: SavedAddress) => {
    setArea(a.city);
    // Keep the existing checkout prefill working.
    setAddressDetails({
      ...getAddressDetails(),
      street: a.street ?? "",
      building: a.building ?? "",
      floor: a.floor ?? "",
      apartment: a.apartment ?? "",
      notes: a.notes ?? "",
    });
    onClose();
  };

  const useMyLocation = () => {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Location unavailable — pick a city below.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Nearest of the two cities we serve. This is the ONLY thing the
        // coordinates are used for — no street is guessed from them.
        const { latitude: lat, longitude: lon } = pos.coords;
        const dist = (c: Area) =>
          (lat - CITY_POINTS[c].lat) ** 2 + (lon - CITY_POINTS[c].lon) ** 2;
        setArea(dist("Beirut") <= dist("Tripoli") ? "Beirut" : "Tripoli");
        onClose();
      },
      () => {
        setLocating(false);
        setLocError("Location unavailable — pick a city below.");
      },
      { timeout: 8000 }
    );
  };

  const remove = async (a: SavedAddress) => {
    setMenuFor(null);
    if (session) await supabase.from("user_addresses").delete().eq("id", a.id);
    else writeGuest(readGuest().filter((x) => x.id !== a.id));
    void qc.invalidateQueries({ queryKey: ["addresses"] });
  };

  const makeDefault = async (a: SavedAddress) => {
    setMenuFor(null);
    if (session) await supabase.from("user_addresses").update({ is_default: true }).eq("id", a.id);
    else writeGuest(readGuest().map((x) => ({ ...x, is_default: x.id === a.id })));
    void qc.invalidateQueries({ queryKey: ["addresses"] });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Where should we deliver to?">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search for an address"
        aria-label="Search for an address"
        className={FIELD}
      />

      {/* Three actions */}
      <div className="mt-3 overflow-hidden rounded-card border border-line">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left disabled:opacity-60"
        >
          <span aria-hidden className="text-[18px]">📍</span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium text-ink">
              {locating ? "Finding you…" : "Use current location"}
            </span>
            <span className="block text-caption text-muted">Deliver to my current location</span>
          </span>
          <span aria-hidden className="text-muted">›</span>
        </button>

        <button
          type="button"
          onClick={() => setCityOpen((v) => !v)}
          className="flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left"
        >
          <span aria-hidden className="text-[18px]">🗺</span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium text-ink">Choose a city</span>
            <span className="block text-caption text-muted">Beirut or Tripoli — more cities soon</span>
          </span>
          <span aria-hidden className="text-muted">{cityOpen ? "▾" : "›"}</span>
        </button>

        {cityOpen || filter.trim() ? (
          <div className="border-b border-line bg-surface-sunk/40">
            {cityMatches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setArea(c);
                  onClose();
                }}
                className="flex w-full items-center justify-between px-5 py-2.5 text-left text-body text-ink"
              >
                {c}
                {c === area ? <span className="text-persimmon">✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-3 px-3 py-3 text-left"
        >
          <span aria-hidden className="text-[18px]">➕</span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium text-ink">Add new address</span>
            <span className="block text-caption text-muted">Save a new delivery address</span>
          </span>
          <span aria-hidden className="text-muted">›</span>
        </button>
      </div>

      {locError ? <p className="mt-2 text-caption text-alert">{locError}</p> : null}

      {/* Saved addresses */}
      {shown.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-caption font-medium text-muted">Saved addresses</p>
          <div className="flex flex-col gap-2">
            {shown.map((a) => (
              <div key={a.id} className="relative flex items-start gap-3 rounded-card border border-line p-3">
                <button type="button" onClick={() => pick(a)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  <span aria-hidden className={a.is_default ? "text-persimmon" : "text-muted"}>📍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-bold text-ink">{a.label}</span>
                    <span className="block truncate text-caption text-muted">{oneLine(a) || a.city}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Options for ${a.label}`}
                  onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}
                  className="shrink-0 px-1 text-muted"
                >
                  ···
                </button>
                {menuFor === a.id ? (
                  <div className="absolute right-2 top-10 z-10 w-40 overflow-hidden rounded-card border border-line bg-surface shadow-lift">
                    <button type="button" onClick={() => makeDefault(a)} className="block w-full px-3 py-2 text-left text-body">
                      Set as default
                    </button>
                    <button type="button" onClick={() => remove(a)} className="block w-full px-3 py-2 text-left text-body text-alert">
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {adding ? (
        <AddAddressForm
          city={area}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void qc.invalidateQueries({ queryKey: ["addresses"] });
          }}
        />
      ) : null}
    </Sheet>
  );
}

function AddAddressForm({
  city,
  onCancel,
  onSaved,
}: {
  city: Area;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [f, setF] = useState({ label: "", street: "", building: "", floor: "", apartment: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!f.label.trim()) {
      setError("Give it a name — Home, Work, Teta's.");
      return;
    }
    setSaving(true);
    setError(null);
    const row: SavedAddress = {
      id: crypto.randomUUID(),
      label: f.label.trim(),
      city,
      street: f.street.trim() || null,
      building: f.building.trim() || null,
      floor: f.floor.trim() || null,
      apartment: f.apartment.trim() || null,
      notes: f.notes.trim() || null,
      is_default: false,
    };
    if (session) {
      const { error: e } = await supabase.from("user_addresses").insert({
        profile_id: session.user.id,
        label: row.label,
        city: row.city,
        street: row.street,
        building: row.building,
        floor: row.floor,
        apartment: row.apartment,
        notes: row.notes,
      });
      if (e) {
        setSaving(false);
        setError(e.message);
        return;
      }
    } else {
      writeGuest([...readGuest(), row]);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-body font-medium text-ink">New address in {city}</p>
      <div className="mt-3 flex flex-col gap-2">
        <input className={FIELD} placeholder="Name it (Home, Work…)" value={f.label}
          onChange={(e) => setF({ ...f, label: e.target.value })} />
        <input className={FIELD} placeholder="Street" value={f.street}
          onChange={(e) => setF({ ...f, street: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <input className={FIELD} placeholder="Building" value={f.building}
            onChange={(e) => setF({ ...f, building: e.target.value })} />
          <input className={FIELD} placeholder="Floor" value={f.floor}
            onChange={(e) => setF({ ...f, floor: e.target.value })} />
          <input className={FIELD} placeholder="Apt" value={f.apartment}
            onChange={(e) => setF({ ...f, apartment: e.target.value })} />
        </div>
        <input className={FIELD} placeholder="Notes for the driver (landmark, gate code…)" value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      {error ? <p className="mt-2 text-caption text-alert">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button fullWidth onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </Button>
        <button type="button" onClick={onCancel} className="shrink-0 px-3 text-body text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
