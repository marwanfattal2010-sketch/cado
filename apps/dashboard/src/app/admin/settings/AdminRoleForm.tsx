"use client";

import { useState, useTransition } from "react";
import { setAdminRole } from "./actions";
import { t } from "@/lib/dictionary";

export function AdminRoleForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setResult(await setAdminRole(fd));
        })
      }
      className="flex flex-wrap items-end gap-2"
    >
      <label className="block grow">
        <span className="mb-1 block text-xs font-medium text-muted">Account email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="someone@example.com"
          className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-3 text-sm"
        />
      </label>
      <button
        name="mode"
        value="grant"
        disabled={pending}
        className="min-h-[40px] rounded-pill bg-ink px-4 text-sm font-semibold text-canvas disabled:opacity-50"
      >
        {pending ? t("common.saving") : "Make admin"}
      </button>
      <button
        name="mode"
        value="revoke"
        disabled={pending}
        className="min-h-[40px] rounded-pill border border-status-red px-4 text-sm font-semibold text-status-red disabled:opacity-50"
      >
        Remove admin
      </button>
      {result ? (
        <p className={`w-full text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
