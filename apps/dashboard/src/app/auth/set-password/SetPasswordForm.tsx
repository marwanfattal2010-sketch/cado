"use client";
import { useActionState } from "react";
import { setPassword, type SetPwState } from "./actions";
import { t } from "@/lib/dictionary";

const initial: SetPwState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-rest">
      <label className="block">
        <span className="text-sm font-medium text-ink">{t("setpw.password")}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ribbon"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("setpw.confirm")}</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ribbon"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-card bg-status-red-tint px-3 py-2 text-sm text-status-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-pill bg-ribbon px-4 py-2.5 text-sm font-semibold text-inverse disabled:opacity-60"
      >
        {pending ? t("setpw.working") : t("setpw.submit")}
      </button>
    </form>
  );
}
