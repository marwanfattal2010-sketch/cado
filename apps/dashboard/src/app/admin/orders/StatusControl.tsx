"use client";

import { useState, useTransition } from "react";
import { setSubOrderStatus } from "./actions";
import { t } from "@/lib/dictionary";

const STATUSES = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered"] as const;

/**
 * Status dropdown + cancel for one store's part of an order. Delivered and
 * cancelled are final — the database enforces it, this UI just says so.
 */
export function StatusControl({ subOrderId, status }: { subOrderId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const final = status === "delivered" || status === "cancelled";

  const run = (next: string) =>
    startTransition(async () => {
      setError(null);
      const res = await setSubOrderStatus(subOrderId, next);
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  if (final) {
    return <span className="text-xs text-muted">{t("admin.orders.final")}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => run(e.target.value)}
        disabled={pending}
        className="min-h-[40px] rounded-card border border-line bg-canvas px-2 text-sm disabled:opacity-50"
        aria-label={t("admin.orders.setstatus")}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}` as Parameters<typeof t>[0])}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (window.confirm("Cancel this store's part of the order? This is final.")) run("cancelled");
        }}
        disabled={pending}
        className="min-h-[40px] rounded-pill border border-status-red px-3 text-xs font-semibold text-status-red disabled:opacity-50"
      >
        {t("admin.orders.cancel")}
      </button>
      {error ? <p className="w-full text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
