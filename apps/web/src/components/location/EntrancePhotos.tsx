import { useEffect, useState } from "react";

/**
 * UP TO THREE PHOTOS of the entrance, compressed before they ever leave the
 * phone.
 *
 * A modern phone camera produces 4-8MB per frame. Three of those is up to
 * 24MB uploaded over Lebanese mobile data to show a driver a blue gate, and on
 * a bad connection that is the difference between an address that saves and
 * one that times out. Resized to 1200px on the long edge at JPEG 0.8 the same
 * photo is 150-350KB and looks identical at the size anyone views it.
 *
 * The compression happens on a canvas, which also strips EXIF — including the
 * GPS tag most phones write. That is a privacy improvement we get for free and
 * would have had to build deliberately otherwise.
 */

const MAX_PHOTOS = 3;
const MAX_EDGE = 1200;
const QUALITY = 0.8;
/** 3MB, checked AFTER compression. Only a pathological image can trip it. */
const MAX_BYTES = 3 * 1024 * 1024;

export type PendingPhoto = { blob: Blob; url: string };

async function compress(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY)
  );
}

export function EntrancePhotos({
  existingUrls,
  onChange,
  onRemoveExisting,
}: {
  /** Signed URLs for photos already saved on this address. */
  existingUrls: string[];
  onChange: (photos: PendingPhoto[]) => void;
  onRemoveExisting: (index: number) => void;
}) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Object URLs are a manual allocation. Without this every photo the user
  // adds and removes stays in memory until the tab closes.
  useEffect(() => {
    return () => pending.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = existingUrls.length + pending.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - total;
    const next: PendingPhoto[] = [];

    for (const file of Array.from(files).slice(0, room)) {
      const blob = await compress(file);
      if (!blob) {
        setError("That file could not be read as an image.");
        continue;
      }
      if (blob.size > MAX_BYTES) {
        setError("That photo is too large even after compressing.");
        continue;
      }
      next.push({ blob, url: URL.createObjectURL(blob) });
    }

    if (next.length) {
      const merged = [...pending, ...next];
      setPending(merged);
      onChange(merged);
    }
  }

  function removePending(i: number) {
    URL.revokeObjectURL(pending[i]!.url);
    const merged = pending.filter((_, n) => n !== i);
    setPending(merged);
    onChange(merged);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {existingUrls.map((url, i) => (
          <Thumb key={`saved-${url}`} url={url} onRemove={() => onRemoveExisting(i)} />
        ))}
        {pending.map((p, i) => (
          <Thumb key={p.url} url={p.url} onRemove={() => removePending(i)} />
        ))}

        {total < MAX_PHOTOS ? (
          <label className="card-press flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-[12px] border border-dashed border-line bg-white text-[22px] text-muted">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void add(e.target.files);
                // Reset, or picking the same file twice in a row does nothing.
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-[13px] text-persimmon">{error}</p> : null}
    </div>
  );
}

function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-[12px] bg-page">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-pill bg-black/60 text-[12px] leading-none text-white"
      >
        ×
      </button>
    </span>
  );
}
