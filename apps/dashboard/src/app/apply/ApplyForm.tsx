"use client";

import { useActionState } from "react";
import { submitApplication } from "./actions";

const FIELD =
  "w-full rounded-card border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition focus:border-ink/40";

/** The nine real categories, straight from the catalogue. */
const CATEGORIES = [
  "Fashion",
  "Shoes",
  "Jewelry & Accessories",
  "Perfume & Beauty",
  "Chocolate",
  "Toys",
  "Gift Sets",
  "Electronics",
  "Sport",
  "Flowers",
];

export function ApplyForm() {
  const [state, action, pending] = useActionState(submitApplication, null);

  if (state?.ok) {
    return (
      <div className="mt-6 rounded-card bg-status-green-tint p-4 text-sm text-status-green">
        <p className="font-semibold">Application received.</p>
        <p className="mt-1">
          Your store is waiting for CADO approval — we&apos;ll email you. You can log in any time to check.
        </p>
        <a href="/login" className="mt-3 inline-block font-medium underline">
          Go to login
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Your full name</span>
          <input name="ownerName" required className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Store name</span>
          <input name="storeName" required className={FIELD} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Phone (WhatsApp)</span>
          <input name="phone" required inputMode="tel" placeholder="+961…" className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email</span>
          <input name="email" required type="email" className={FIELD} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">City</span>
          <input name="city" required className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Area</span>
          <input name="area" className={FIELD} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">What do you sell?</span>
        <select name="category" className={FIELD} defaultValue="">
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Instagram (optional)</span>
        <input name="instagram" placeholder="@yourstore" className={FIELD} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Tell us about your store</span>
        <textarea name="about" rows={3} className={`${FIELD} resize-none`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Password (10+ characters)</span>
        <input name="password" required type="password" minLength={10} className={FIELD} />
      </label>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-status-red">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-card bg-ribbon py-3 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Apply to sell on CADO"}
      </button>
    </form>
  );
}
