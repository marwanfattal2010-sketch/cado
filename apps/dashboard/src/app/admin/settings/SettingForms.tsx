"use client";

import { useActionState } from "react";
import { saveDeliveryFee, saveOrderingWindow, saveSupportContacts } from "./actions";

/**
 * The three editable settings. Each is its own form so saving the delivery fee
 * can't silently rewrite the support email, and each reports its own result —
 * a settings page that says "saved" for something it didn't save is worse than
 * one with no save button at all.
 */

type Result = { ok: boolean; message?: string } | null;

function Status({ state, savedLabel }: { state: Result; savedLabel: string }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-xs font-semibold text-status-green">{savedLabel}</p>
  ) : (
    <p className="text-xs font-semibold text-status-red">{state.message ?? "Didn't save."}</p>
  );
}

const inputCls =
  "min-h-[40px] w-full rounded-card border border-line bg-canvas px-3 text-sm text-ink disabled:opacity-50";
const btnCls =
  "min-h-[40px] shrink-0 rounded-pill bg-ink px-4 text-sm font-semibold text-canvas disabled:opacity-50";

/* ------------------------------------------------------- delivery fee ----- */

export function DeliveryFeeForm({ fee }: { fee: number }) {
  const [state, action, pending] = useActionState(saveDeliveryFee, null);
  return (
    <form action={action} className="space-y-2">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Delivery fee charged per order (USD)</span>
          <input
            name="fee"
            defaultValue={String(fee)}
            inputMode="decimal"
            disabled={pending}
            className={inputCls}
          />
        </label>
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <Status state={state} savedLabel="Saved. New orders use this fee." />
    </form>
  );
}

/* ---------------------------------------------------- ordering window ----- */

export function OrderingWindowForm({ open, close }: { open: string; close: string }) {
  const [state, action, pending] = useActionState(saveOrderingWindow, null);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Opens</span>
          <input name="open" type="time" defaultValue={open} disabled={pending} className={inputCls} />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Closes</span>
          <input name="close" type="time" defaultValue={close} disabled={pending} className={inputCls} />
        </label>
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <Status state={state} savedLabel="Saved." />
    </form>
  );
}

/* --------------------------------------------------- support contacts ----- */

export function SupportContactsForm({
  email,
  whatsapp,
  instagram,
}: {
  email: string;
  whatsapp: string;
  instagram: string;
}) {
  const [state, action, pending] = useActionState(saveSupportContacts, null);
  return (
    <form action={action} className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Support email</span>
        <input name="email" type="email" defaultValue={email} disabled={pending} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">WhatsApp number</span>
        <input name="whatsapp" defaultValue={whatsapp} disabled={pending} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Instagram handle</span>
        <input name="instagram" defaultValue={instagram} disabled={pending} className={inputCls} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Saving…" : "Save"}
        </button>
        <Status state={state} savedLabel="Saved." />
      </div>
    </form>
  );
}
