"use client";

import { useState, useTransition } from "react";
import { assignDriver } from "./actions";
import { s } from "./strings";

export interface DriverOption {
  id: string;
  name: string;
  phone: string;
}

/**
 * Driver assignment for one order, plus the optional real cost of that
 * delivery.
 *
 * The cost field is a real input with an EMPTY default. settings
 * .delivery_fee_usd is shown next to it as the standard fee so the dispatcher
 * knows what to expect, but it is never pre-filled into the box: a pre-filled
 * $5 that nobody looked at gets saved as $5 and then reads back as a recorded
 * fact. The standard fee is what CADO charges the customer; this column is
 * what the delivery cost CADO. They are different numbers and only one of
 * them is knowable at assignment time.
 */
export function AssignDriver({
  orderId,
  drivers,
  currentDriver,
  currentCost,
  standardFee,
}: {
  orderId: string;
  drivers: DriverOption[];
  currentDriver: DriverOption | null;
  currentCost: number | null;
  standardFee: number | null;
}) {
  const [open, setOpen] = useState(currentDriver === null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = await assignDriver(formData);
      if (res.ok) setOpen(false);
      else setError(res.message ?? s("delivery.error.generic"));
    });

  return (
    <div className="rounded-card bg-surface-sunk p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {s("delivery.driver.assigned")}
      </p>

      {currentDriver ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink">
            <span className="font-semibold">{currentDriver.name}</span>{" "}
            <a
              href={`tel:${currentDriver.phone}`}
              className="text-ribbon underline underline-offset-2"
            >
              {currentDriver.phone}
            </a>
          </p>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-h-[36px] rounded-pill border border-line px-3 text-xs font-semibold text-muted hover:text-ink"
            >
              {s("delivery.driver.change")}
            </button>
          ) : null}
        </div>
      ) : !open ? (
        <p className="mt-1 text-sm text-muted">{s("delivery.driver.none")}</p>
      ) : null}

      {currentCost != null ? (
        <p className="mt-1 text-xs text-muted">
          {s("delivery.card.cost")}: <span className="tabular-nums text-ink">${currentCost.toFixed(2)}</span>
        </p>
      ) : null}

      {open ? (
        drivers.length === 0 ? (
          <p className="mt-2 text-xs text-status-amber">{s("delivery.driver.noactive")}</p>
        ) : (
          <form action={submit} className="mt-2 space-y-2">
            <input type="hidden" name="orderId" value={orderId} />

            <label className="block">
              <span className="sr-only">{s("delivery.driver.assign")}</span>
              <select
                name="driverId"
                defaultValue={currentDriver?.id ?? ""}
                required
                disabled={pending}
                className="min-h-[44px] w-full rounded-card border border-line bg-surface px-2 text-sm text-ink disabled:opacity-50"
              >
                <option value="">{s("delivery.driver.choose")}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.phone}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">
                {s("delivery.driver.costlabel")}
              </span>
              <input
                name="cost"
                type="text"
                inputMode="decimal"
                defaultValue={currentCost != null ? String(currentCost) : ""}
                placeholder=""
                disabled={pending}
                className="mt-1 min-h-[44px] w-full rounded-card border border-line bg-surface px-2 text-sm tabular-nums text-ink disabled:opacity-50"
              />
              <span className="mt-1 block text-[11px] text-muted">
                {standardFee != null
                  ? `${s("delivery.driver.costhint")} $${standardFee.toFixed(2)}. ${s("delivery.driver.costblank")}`
                  : s("delivery.driver.costblank")}
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={pending}
                className="min-h-[44px] flex-1 rounded-pill bg-ribbon px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? s("delivery.driver.saving") : s("delivery.driver.save")}
              </button>
              {currentDriver ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  disabled={pending}
                  className="min-h-[44px] rounded-pill border border-line px-4 text-sm font-semibold text-muted disabled:opacity-50"
                >
                  {s("delivery.driver.cancel")}
                </button>
              ) : null}
            </div>

            {error ? <p className="text-xs text-status-red">{error}</p> : null}
          </form>
        )
      ) : null}
    </div>
  );
}
