"use client";

import { useState, useTransition } from "react";
import { setStorePaused } from "./actions";
import { t } from "@/lib/dictionary";

/**
 * Pause is destructive-adjacent — it takes the shop off the storefront — so
 * it asks once before doing it. Resuming does not: putting yourself back on
 * sale is not something anyone regrets.
 *
 * The button never offers 'closed'. Closing a store is a CADO decision and is
 * not reachable from this screen by design.
 */
export function PauseToggle({ paused }: { paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const run = (next: boolean) =>
    startTransition(async () => {
      setResult(null);
      setConfirming(false);
      setResult(await setStorePaused(next));
    });

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">{t("storepause.body")}</p>

      {paused ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="min-h-[44px] w-full rounded-pill bg-status-green px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          {pending ? t("common.saving") : t("storepause.resume")}
        </button>
      ) : confirming ? (
        <div className="space-y-2 rounded-card bg-status-amber-tint p-3">
          <p className="text-sm font-medium text-ink">
            Pause the store? Customers won&apos;t be able to order until you resume.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(true)}
              className="min-h-[44px] rounded-pill bg-status-amber px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? t("common.saving") : t("storepause.pause")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="min-h-[44px] rounded-pill border border-line px-5 text-sm font-semibold text-muted disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className="min-h-[44px] w-full rounded-pill border border-status-amber px-5 text-sm font-semibold text-status-amber disabled:opacity-50 sm:w-auto"
        >
          {t("storepause.pause")}
        </button>
      )}

      {result ? (
        <p role="status" className={`text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
