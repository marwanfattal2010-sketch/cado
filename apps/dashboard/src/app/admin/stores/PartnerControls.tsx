"use client";

import { useState, useTransition } from "react";
import { setPartnerCommission, setPartnerStatus } from "./actions";
import { t } from "@/lib/dictionary";

/** Inline commission editor + activate/suspend for one partner row. */
export function PartnerControls({
  partnerId,
  commissionPercent,
  status,
}: {
  partnerId: string;
  commissionPercent: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(commissionPercent.toFixed(1));

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-muted">
        {t("admin.stores.commission")}
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => {
            if (Number(rate) !== commissionPercent) run(() => setPartnerCommission(partnerId, rate));
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          disabled={pending}
          inputMode="decimal"
          className="w-16 min-h-[36px] rounded-card border border-line bg-canvas px-2 text-sm tabular-nums disabled:opacity-50"
        />
        %
      </label>
      <button
        onClick={() =>
          run(() => setPartnerStatus(partnerId, status === "active" ? "suspended" : "active"))
        }
        disabled={pending}
        className={`min-h-[36px] rounded-pill px-3 text-xs font-semibold disabled:opacity-50 ${
          status === "active"
            ? "border border-status-red text-status-red"
            : "bg-status-green text-white"
        }`}
      >
        {status === "active" ? "Suspend" : "Activate"}
      </button>
      {error ? <p className="w-full text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
