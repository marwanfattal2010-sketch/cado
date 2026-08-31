"use client";

import { useState, useTransition } from "react";
import { markDelivered, markOutForDelivery } from "./actions";
import { s } from "./strings";

/**
 * The two dispatch moves. Which sub-orders each one touches is decided on the
 * server-rendered page from real status values — "out for delivery" acts on
 * the portions that are `ready`, "delivered" on the portions that are already
 * on the road. An order split across two stores where only one is ready
 * therefore moves only that one, which is what actually happened.
 *
 * Delivered is final in the database (admin_set_sub_order_status refuses to
 * reopen it), so it asks first.
 */
export function AdvanceStatus({
  orderId,
  readySubOrderIds,
  outSubOrderIds,
}: {
  orderId: string;
  readySubOrderIds: string[];
  outSubOrderIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message ?? s("delivery.error.generic"));
    });

  if (readySubOrderIds.length === 0 && outSubOrderIds.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {readySubOrderIds.length > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markOutForDelivery(readySubOrderIds))}
          className="min-h-[44px] w-full rounded-pill bg-status-indigo px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? s("delivery.advance.working") : s("delivery.advance.out")}
        </button>
      ) : null}

      {outSubOrderIds.length > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(s("delivery.advance.confirmdelivered"))) {
              run(() => markDelivered(orderId, outSubOrderIds));
            }
          }}
          className="min-h-[44px] w-full rounded-pill bg-status-green px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? s("delivery.advance.working") : s("delivery.advance.delivered")}
        </button>
      ) : null}

      {error ? <p className="text-xs text-status-red">{error}</p> : null}
    </div>
  );
}
