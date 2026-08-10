"use client";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type LoginState } from "./actions";
import { t } from "@/lib/dictionary";

const initial: LoginState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-rest">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("login.email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ribbon"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("login.password")}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
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
        {pending ? t("login.working") : t("login.submit")}
      </button>
    </form>
  );
}
