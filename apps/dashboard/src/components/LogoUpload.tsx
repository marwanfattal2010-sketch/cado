"use client";

import { useRef, useState, useTransition } from "react";

/**
 * THE LOGO CONTROL, shared by the shop's own account page and the admin's
 * store detail page. The two differ only in which server action they hand it,
 * so they cannot drift apart in what they accept or how they report failure.
 *
 * It shows the mark as the storefront shows it — a round crop on white —
 * because a logo that looks right as a rectangle here and wrong as a circle on
 * the tab is the whole problem this control exists to prevent.
 *
 * With no logo it shows the SAME persimmon initials the storefront falls back
 * to, so what you see here is what a shopper sees.
 */
export function LogoUpload({
  name,
  logoUrl,
  upload,
  remove,
}: {
  name: string;
  logoUrl: string | null;
  upload: (formData: FormData) => Promise<{ ok: boolean; message: string }>;
  remove: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  /** A local preview, so the new mark appears the instant it is chosen. */
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const shown = preview ?? logoUrl;

  const submit = (form: FormData) =>
    startTransition(async () => {
      setResult(null);
      const r = await upload(form);
      setResult(r);
      if (!r.ok) setPreview(null);
      if (input.current) input.current.value = "";
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-pill border border-line bg-white">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt={`${name} logo`}
              className="h-full w-full object-contain"
              style={{ padding: "18%" }}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-persimmon text-[22px] font-bold text-white">
              {initialsOf(name)}
            </span>
          )}
        </span>

        <div className="min-w-0 space-y-1">
          <p className="text-sm leading-relaxed text-muted">
            PNG, JPG, WEBP or GIF, up to 2MB. Square works best — the storefront
            shows it in a circle.
          </p>
          {!shown ? (
            <p className="text-sm text-muted">
              Until then the shop shows <strong>{initialsOf(name)}</strong> on persimmon.
            </p>
          ) : null}
        </div>
      </div>

      <form
        action={submit}
        className="flex flex-wrap items-center gap-2"
        onChange={(e) => {
          const target = e.target as HTMLElement & { files?: FileList | null };
          const file = target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
      >
        <input
          ref={input}
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          disabled={pending}
          className="min-h-[44px] max-w-full text-sm file:mr-3 file:min-h-[36px] file:rounded-pill file:border-0 file:bg-ink file:px-4 file:text-sm file:font-semibold file:text-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-pill bg-persimmon px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Save logo"}
        </button>
        {logoUrl ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setResult(null);
                setPreview(null);
                setResult(await remove());
              })
            }
            className="min-h-[44px] rounded-pill border border-line px-5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </form>

      {result ? (
        <p className={`text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The same rule the storefront uses, deliberately duplicated rather than
 * imported: the two apps do not share a bundle, and a preview that disagreed
 * with the live tab would be worse than useless. Keep them in step —
 * `apps/web/src/components/shop/StoreLogoCircle.tsx`.
 */
function initialsOf(name: string): string {
  const clean = name.replace(/\[.*?\]\s*/g, "").trim();
  if (/^[A-Z0-9]{1,3}$/.test(clean)) return clean;
  const words = clean.split(/[^A-Za-z0-9]+/).filter((w) => w && !/^(and|the|co|de|of)$/i.test(w));
  if (!words.length) return clean.slice(0, 1).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
