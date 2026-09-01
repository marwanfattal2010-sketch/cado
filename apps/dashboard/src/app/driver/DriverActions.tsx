"use client";

import { useState, useTransition } from "react";
import { driverAdvance } from "./actions";

/**
 * Two buttons, both confirmed. Big targets — this is used one-handed on a
 * phone, often in a hurry, and "delivered" cannot be undone by the driver.
 */
export function DriverActions({ subOrderId, status }: { subOrderId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (next: "out_for_delivery" | "delivered", confirmText: string) =>
    start(async () => {
      if (!window.confirm(confirmText)) return;
      setError(null);
      const res = await driverAdvance(subOrderId, next);
      if (!res.ok) setError(res.message ?? "That didn't work. Try again.");
    });

  return (
    <div>
      {status === "ready" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => go("out_for_delivery", "Confirm you have collected this parcel from the shop?")}
          className="min-h-[52px] w-full rounded-[14px] bg-ribbon text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "I picked it up"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => go("delivered", "Confirm this parcel has been handed to the customer?")}
          className="min-h-[52px] w-full rounded-[14px] text-[15px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--st-delivered)" }}
        >
          {pending ? "Saving…" : "Delivered"}
        </button>
      )}
      {error ? <p className="mt-2 text-[13px] text-status-red">{error}</p> : null}
    </div>
  );
}
