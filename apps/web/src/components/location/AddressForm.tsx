import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  signedMediaUrl,
  useSaveAddress,
  type SavedAddress,
} from "../../hooks/useAddressBook";
import { VoiceDirections, type VoiceRecording } from "./VoiceDirections";
import { EntrancePhotos, type PendingPhoto } from "./EntrancePhotos";
import type { PinResult } from "./PinScreen";

/**
 * COMPLETE YOUR ADDRESS — everything the driver needs that a pin cannot say.
 *
 * A pin gets someone to the building. It does not say which of the four
 * unmarked doors is yours, that the bell is broken, or that the entrance is
 * round the back. That is what this screen is for, and it is why the optional
 * half of it (voice, photos) exists at all.
 *
 * MEDIA UPLOADS BEFORE THE ROW, always. The storage path contains the address
 * id, so a new address has to exist before its files can be named — which is
 * why an insert happens first and the media paths land in a follow-up update.
 * If the upload fails the row is already saved without media, which is the
 * right way round: an address that works minus a voice note beats a lost
 * address.
 */

const LABELS = [
  { id: "home", text: "Home", icon: "🏠" },
  { id: "work", text: "Work", icon: "💼" },
  { id: "other", text: "Other", icon: "📍" },
] as const;

export function AddressForm({
  pin,
  existing,
  onCancel,
  onAdjustPin,
  onSaved,
}: {
  pin: PinResult;
  existing?: SavedAddress | null;
  onCancel: () => void;
  onAdjustPin: () => void;
  onSaved: (a: SavedAddress) => void;
}) {
  const { session } = useAuth();
  const save = useSaveAddress();

  const [label, setLabel] = useState<string>(existing?.label ?? "home");
  const [labelCustom, setLabelCustom] = useState(existing?.label_custom ?? "");
  const [street, setStreet] = useState(existing?.street ?? pin.line ?? "");
  const [building, setBuilding] = useState(existing?.building ?? "");
  const [floor, setFloor] = useState(existing?.floor ?? "");
  const [apartment, setApartment] = useState(existing?.apartment ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [isDefault, setIsDefault] = useState(existing?.is_default ?? false);

  const [voice, setVoice] = useState<VoiceRecording | null>(null);
  const [dropVoice, setDropVoice] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [keptPhotoPaths, setKeptPhotoPaths] = useState<string[]>(existing?.photo_paths ?? []);
  const [signedVoice, setSignedVoice] = useState<string | null>(null);
  const [signedPhotos, setSignedPhotos] = useState<string[]>([]);

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The user's phone, if the profile has one and this is a new address.
  useEffect(() => {
    if (existing || phone) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", session?.user.id ?? "")
        .maybeSingle();
      const p = (data as { phone?: string } | null)?.phone;
      if (p) setPhone(p.replace(/^\+961/, "").trim());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Signed URLs for media already on this address. One hour, re-signed on
  // every open — see the note on the bucket in 0104.
  useEffect(() => {
    if (!existing) return;
    void (async () => {
      if (existing.voice_path) setSignedVoice(await signedMediaUrl(existing.voice_path));
      const urls = await Promise.all((existing.photo_paths ?? []).map(signedMediaUrl));
      setSignedPhotos(urls.filter((u): u is string => !!u));
    })();
  }, [existing]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!street.trim()) e.street = "Add the street or area";
    if (!building.trim()) e.building = "Add the building name or number";
    // 7-8 digits after +961. Lebanese mobiles are 8 (70/71/76/78/79/81/03),
    // landlines 7. Anything shorter is a typo, not a number.
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) e.phone = "Add a phone number we can call";
    if (label === "other" && !labelCustom.trim()) e.labelCustom = "Give it a name";
    return e;
  }, [street, building, phone, label, labelCustom]);

  const valid = Object.keys(errors).length === 0;

  async function onSave() {
    setTouched(true);
    setError(null);
    if (!valid) return;
    if (!session) {
      // The form survives: it is all component state and this screen stays
      // mounted behind the auth route.
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    try {
      const saved = await save.mutateAsync({
        id: existing?.id,
        label,
        label_custom: label === "other" ? labelCustom.trim() : null,
        city: pin.city,
        area: pin.geocodedCity,
        street: street.trim(),
        building: building.trim(),
        floor: floor.trim() || null,
        apartment: apartment.trim() || null,
        phone: `+961${phone.replace(/\D/g, "")}`,
        notes: notes.trim() || null,
        latitude: pin.lat,
        longitude: pin.lng,
        is_default: isDefault,
      });

      const base = `${session.user.id}/${saved.id}`;
      let voicePath = dropVoice ? null : (existing?.voice_path ?? null);
      let voiceSeconds = dropVoice ? null : (existing?.voice_seconds ?? null);

      if (voice) {
        const path = `${base}/voice.webm`;
        const { error: e } = await supabase.storage
          .from("address-media")
          .upload(path, voice.blob, { upsert: true, contentType: voice.blob.type });
        if (e) throw new Error("Your address saved, but the voice note did not upload.");
        voicePath = path;
        voiceSeconds = voice.seconds;
      }

      const photoPaths = [...keptPhotoPaths];
      for (let i = 0; i < photos.length; i++) {
        const path = `${base}/photo-${Date.now()}-${i}.jpg`;
        const { error: e } = await supabase.storage
          .from("address-media")
          .upload(path, photos[i]!.blob, { upsert: true, contentType: "image/jpeg" });
        if (e) throw new Error("Your address saved, but a photo did not upload.");
        photoPaths.push(path);
      }

      if (
        voicePath !== (existing?.voice_path ?? null) ||
        photoPaths.length !== (existing?.photo_paths ?? []).length ||
        dropVoice
      ) {
        await supabase
          .from("addresses")
          .update({
            voice_path: voicePath,
            voice_seconds: voiceSeconds,
            photo_paths: photoPaths,
          })
          .eq("id", saved.id);
      }

      onSaved({ ...saved, voice_path: voicePath, voice_seconds: voiceSeconds, photo_paths: photoPaths });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that address.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-3">
        <button type="button" onClick={onCancel} aria-label="Back" className="text-[18px] text-ink">
          ←
        </button>
        <h1 className="text-[17px] font-bold text-ink">Complete your address</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28">
        <MapStrip lat={pin.lat} lng={pin.lng} onAdjust={onAdjustPin} />

        <div className="space-y-4 px-4 pt-4">
          {error ? (
            <p className="rounded-[10px] bg-persimmon/10 px-3 py-2 text-[13px] font-medium text-persimmon">
              {error}
            </p>
          ) : null}

          <div>
            <div className="flex gap-2">
              {LABELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLabel(l.id)}
                  className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition-colors ${
                    label === l.id
                      ? "bg-persimmon text-white"
                      : "border border-line bg-white text-ink"
                  }`}
                >
                  <span aria-hidden>{l.icon}</span> {l.text}
                </button>
              ))}
            </div>
            {label === "other" ? (
              <Field
                className="mt-2"
                label=""
                value={labelCustom}
                onChange={setLabelCustom}
                placeholder="Name it (Mum's place, Gym…)"
                error={touched ? errors.labelCustom : undefined}
              />
            ) : null}
          </div>

          <Field label="Area / Street" value={street} onChange={setStreet} error={touched ? errors.street : undefined} />
          <Field label="Building name or number" value={building} onChange={setBuilding} error={touched ? errors.building : undefined} />

          <div className="flex gap-3">
            <Field className="flex-1" label="Floor" value={floor} onChange={setFloor} />
            <Field className="flex-1" label="Apartment" value={apartment} onChange={setApartment} />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted">Phone</label>
            <div className="flex items-stretch gap-2">
              <span className="flex shrink-0 items-center gap-1 rounded-[10px] border border-line px-2.5 text-[15px] text-ink">
                <span aria-hidden>🇱🇧</span> +961
              </span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-w-0 flex-1 rounded-[10px] border border-line px-3 py-2.5 text-[15px] text-ink outline-none focus:border-persimmon"
              />
            </div>
            {touched && errors.phone ? (
              <p className="mt-1 text-[13px] text-persimmon">{errors.phone}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted">
              Landmarks &amp; notes for the driver
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Next to the pharmacy, blue gate"
              className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] text-ink outline-none focus:border-persimmon"
            />
          </div>

          <div className="rounded-[12px] bg-tint p-3">
            <p className="text-[14px] font-bold text-ink">
              <span aria-hidden className="text-persimmon">◈</span> Help the driver find you
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              Record directions in your own words and add a photo of the entrance. Optional.
            </p>

            <div className="mt-3">
              <VoiceDirections
                existingUrl={dropVoice ? null : signedVoice}
                existingSeconds={existing?.voice_seconds}
                onChange={setVoice}
                onClearExisting={() => setDropVoice(true)}
              />
            </div>

            <div className="mt-3">
              <EntrancePhotos
                existingUrls={signedPhotos}
                onChange={setPhotos}
                onRemoveExisting={(i) => {
                  setSignedPhotos((p) => p.filter((_, n) => n !== i));
                  setKeptPhotoPaths((p) => p.filter((_, n) => n !== i));
                }}
              />
            </div>
          </div>

          <label className="flex items-center justify-between py-1">
            <span className="text-[15px] text-ink">Set as default</span>
            <button
              type="button"
              role="switch"
              aria-checked={isDefault}
              onClick={() => setIsDefault((v) => !v)}
              className={`relative h-[26px] w-[44px] shrink-0 rounded-pill transition-colors ${
                isDefault ? "bg-persimmon" : "bg-line"
              }`}
            >
              <span
                aria-hidden
                className="absolute top-[3px] h-5 w-5 rounded-pill bg-white transition-all"
                style={{ left: isDefault ? 21 : 3 }}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Above the bottom nav, not behind it. */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="w-full rounded-[12px] bg-persimmon py-3 text-[15px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save address"}
        </button>
        <button type="button" onClick={onCancel} className="mt-2 w-full py-1 text-[14px] text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <label className="mb-1 block text-[13px] font-medium text-muted">{label}</label> : null}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[10px] border px-3 py-2.5 text-[15px] text-ink outline-none focus:border-persimmon ${
          error ? "border-persimmon" : "border-line"
        }`}
      />
      {error ? <p className="mt-1 text-[13px] text-persimmon">{error}</p> : null}
    </div>
  );
}

/** A 120px non-interactive map showing where the pin landed. */
function MapStrip({ lat, lng, onAdjust }: { lat: number; lng: number; onAdjust: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!host) return;
    // Every interaction off: this is a picture of the pin, and a strip that
    // pans under a thumb scrolling the form is a trap.
    const map = L.map(host, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 20,
    }).addTo(map);
    return () => {
      map.remove();
    };
  }, [host, lat, lng]);

  return (
    <div className="relative h-[120px] w-full overflow-hidden bg-page">
      <div ref={setHost} className="h-full w-full" />
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <svg width="24" height="32" viewBox="0 0 34 46" fill="none">
          <path
            d="M17 1c8.3 0 15 6.6 15 14.7C32 26.3 17 41 17 41S2 26.3 2 15.7C2 7.6 8.7 1 17 1Z"
            fill="rgb(var(--persimmon))"
            stroke="#fff"
            strokeWidth="2"
          />
          <circle cx="17" cy="15.5" r="5" fill="#fff" />
        </svg>
      </span>
      <button
        type="button"
        onClick={onAdjust}
        className="absolute bottom-2 right-2 rounded-pill bg-white px-3 py-1.5 text-[12px] font-semibold text-ink shadow-rest"
      >
        Adjust pin
      </button>
    </div>
  );
}
