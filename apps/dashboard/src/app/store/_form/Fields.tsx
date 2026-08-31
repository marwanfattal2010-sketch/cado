"use client";

/**
 * The shared form primitives for the store-owner area.
 *
 * These exist because §5.5 and §5.7 are both "a phone-sized form a shop owner
 * fills in while standing behind a counter", and the account page's
 * PasswordForm had already settled what that looks like: label above, 44px
 * minimum tap target, hairline border, no floating labels, no toasts. This
 * file just stops that from being copy-pasted three more times.
 *
 * `_form` is a Next.js private folder — it is never a route.
 */

import { useFormStatus } from "react-dom";

const inputClass =
  "w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 text-sm text-ink " +
  "placeholder:text-muted focus:border-ribbon focus:outline-none focus:ring-1 focus:ring-ribbon " +
  "disabled:opacity-50";

export function TextField({
  label,
  name,
  defaultValue,
  hint,
  placeholder,
  type = "text",
  required,
  maxLength,
  inputMode,
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: "text" | "tel" | "url" | "numeric";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={inputClass}
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  hint,
  rows = 4,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`${inputClass} py-2 leading-relaxed`}
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * A checkbox styled as a full-width row, because the whole row is the tap
 * target — a 16px checkbox is not something to aim at one-handed.
 */
export function CheckboxRow({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-card border border-line bg-canvas p-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--ribbon)]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A radio group rendered as stacked rows — same tap-target reasoning. */
export function RadioRows({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string; hint?: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-card border border-line bg-canvas p-3"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--ribbon)]"
          />
          <span>
            <span className="block text-sm font-medium text-ink">{o.label}</span>
            {o.hint ? <span className="mt-0.5 block text-xs text-muted">{o.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * Reads the enclosing <form>'s pending state, so the button disables itself
 * during a server action without the page holding that state.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] w-full rounded-pill bg-ink px-5 text-sm font-semibold text-canvas disabled:opacity-50 sm:w-auto"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** One place for the "it saved" / "it didn't" line, so it always reads alike. */
export function FormResult({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={`text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}
    >
      {result.message}
    </p>
  );
}
