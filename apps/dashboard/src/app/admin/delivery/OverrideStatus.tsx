"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { overrideStatus } from "./actions";

/**
 * The admin's only way to move a delivery status, and it asks why.
 *
 * The V3 board had plain "Mark out for delivery" and "Mark delivered" buttons.
 * Marwan's objection was right: an admin sitting at a desk does not know a
 * parcel was handed over, and a button that lets them say so turns the delivery
 * record into a guess. The store marks ready, the driver marks picked up and
 * delivered. This exists for when that chain breaks, and it writes the reason
 * into the audit trail beside the admin's name.
 */
export function OverrideStatus({
  subOrderId,
  current,
}: {
  subOrderId: string;
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current === "ready" ? "out_for_delivery" : "delivered");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
      >
        <AlertTriangle size={13} />
        Override
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          fd.set("subOrderId", subOrderId);
          const res = await overrideStatus(fd);
          if (res.ok) {
            setOpen(false);
            setReason("");
          } else {
            setError(res.message ?? "Didn't save.");
          }
        })
      }
      className="w-full rounded-[12px] border border-status-amber bg-status-amber-tint p-2.5"
    >
      <p className="mb-2 text-[12px] text-status-amber">
        Overriding is for when the store or driver can&rsquo;t. Your reason is recorded.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-[8px] border border-line bg-canvas px-2 text-[12.5px] text-ink"
          aria-label="New status"
        >
          <option value="ready">Ready for pickup</option>
          <option value="out_for_delivery">With driver</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why? e.g. driver's phone died"
          className="h-8 min-w-[180px] flex-1 rounded-[8px] border border-line bg-canvas px-2 text-[12.5px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending || reason.trim().length < 5}
          className="h-8 rounded-[8px] bg-ribbon px-3 text-[12.5px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Override"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="h-8 rounded-[8px] px-2 text-[12.5px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-status-red">{error}</p> : null}
    </form>
  );
}
