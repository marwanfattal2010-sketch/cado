"use client";

import { useState, useTransition } from "react";
import { changePassword } from "./actions";
import { t } from "@/lib/dictionary";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await changePassword(fd);
          setResult(res);
          if (res.ok) (document.getElementById("pw-form") as HTMLFormElement)?.reset();
        })
      }
      id="pw-form"
      className="max-w-sm space-y-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">{t("account.password.new")}</span>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">{t("account.password.confirm")}</span>
        <input
          type="password"
          name="confirm"
          required
          minLength={10}
          autoComplete="new-password"
          className="w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-pill bg-ink px-5 text-sm font-semibold text-canvas disabled:opacity-50"
      >
        {pending ? t("common.saving") : t("account.password.submit")}
      </button>
      {result ? (
        <p className={`text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
