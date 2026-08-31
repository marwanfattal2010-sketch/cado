"use client";

import { useState, useTransition } from "react";
import { setReviewStatus } from "./actions";
import { t } from "@/lib/dictionary";

/**
 * Hide / Show for one review. There is no delete, by design: hiding takes the
 * review off the storefront while keeping what the customer actually wrote,
 * so a moderation call can always be reviewed or reversed.
 */
export function ReviewModeration({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hidden = status === "hidden";

  const toggle = () =>
    startTransition(async () => {
      setError(null);
      const res = await setReviewStatus(reviewId, hidden ? "visible" : "hidden");
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`min-h-[44px] rounded-pill border px-4 text-sm font-semibold disabled:opacity-40 ${
          hidden
            ? "border-status-green text-status-green"
            : "border-line text-muted hover:text-ink"
        }`}
      >
        {pending
          ? t("admin.support.working")
          : hidden
            ? t("admin.support.review.show")
            : t("admin.support.review.hide")}
      </button>
      {error ? <p className="text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
