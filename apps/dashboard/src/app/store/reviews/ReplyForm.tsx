"use client";

import { useState, useTransition } from "react";
import { replyToReview } from "./actions";
import { t } from "@/lib/dictionary";

/**
 * Collapsed to a single button until tapped. A reviews list where every row
 * carries an open textarea is unreadable on a phone, and most rows don't need
 * a reply — the ones that already have one show it as text with an "Edit".
 */
export function ReplyForm({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [value, setValue] = useState(existingReply ?? "");

  if (!open) {
    return (
      <div className="mt-3">
        {existingReply ? (
          <div className="rounded-card bg-surface-sunk p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("reviews.reply.yours")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{existingReply}</p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 min-h-[36px] text-sm font-semibold text-ribbon underline underline-offset-4"
            >
              {t("reviews.reply.edit")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[40px] rounded-pill border border-line px-4 text-sm font-semibold text-ink"
          >
            {t("reviews.reply")}
          </button>
        )}
        {result ? (
          <p className={`mt-2 text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>
            {result.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">{t("reviews.reply")}</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t("reviews.reply.placeholder")}
          className="w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-ribbon focus:outline-none focus:ring-1 focus:ring-ribbon"
        />
      </label>
      <p className="text-xs text-muted">{t("reviews.reply.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await replyToReview(reviewId, value);
              setResult(res);
              if (res.ok) setOpen(false);
            })
          }
          className="min-h-[44px] rounded-pill bg-ink px-5 text-sm font-semibold text-canvas disabled:opacity-50"
        >
          {pending ? t("common.saving") : t("reviews.reply.save")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue(existingReply ?? "");
            setOpen(false);
          }}
          className="min-h-[44px] rounded-pill border border-line px-5 text-sm font-semibold text-muted disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
      </div>
      {result && !result.ok ? <p className="text-sm text-status-red">{result.message}</p> : null}
    </div>
  );
}
