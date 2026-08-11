"use client";

import { useState, useTransition } from "react";
import { confirmItem, rejectItem } from "./actions";
import { t } from "@/lib/dictionary";

/**
 * The Yes / Out-of-stock pair for one pending order line. Optimistic enough to
 * feel instant (buttons lock while the action runs) but the rendered state
 * always comes back from the server via revalidatePath — the client never
 * decides what the database now contains.
 */
export function ItemDecision({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (fn: (id: string) => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn(itemId);
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted">{t("feed.available")}</span>
        <button
          onClick={() => act(confirmItem)}
          disabled={pending}
          className="min-h-[40px] rounded-pill bg-status-green px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("feed.yes")}
        </button>
        <button
          onClick={() => act(rejectItem)}
          disabled={pending}
          className="min-h-[40px] rounded-pill border border-status-red px-4 text-sm font-semibold text-status-red disabled:opacity-50"
        >
          {t("feed.no")}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
