"use client";
import { useActionState } from "react";
import { inviteStoreOwner, type InviteState } from "./actions";
import { t } from "@/lib/dictionary";

const initial: InviteState = {};

export function InviteForm({ partners }: { partners: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(inviteStoreOwner, initial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-rest"
    >
      <label className="block">
        <span className="text-sm font-medium text-ink">{t("admin.invites.email")}</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ribbon"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("admin.invites.store")}</span>
        <select
          name="partnerId"
          required
          defaultValue=""
          className="mt-1 w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ribbon"
        >
          <option value="" disabled>
            —
          </option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p role="alert" className="rounded-card bg-status-red-tint px-3 py-2 text-sm text-status-red">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-card bg-status-green-tint px-3 py-2 text-sm text-status-green">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-pill bg-ribbon px-4 py-2.5 text-sm font-semibold text-inverse disabled:opacity-60"
      >
        {pending ? t("admin.invites.working") : t("admin.invites.submit")}
      </button>
    </form>
  );
}
