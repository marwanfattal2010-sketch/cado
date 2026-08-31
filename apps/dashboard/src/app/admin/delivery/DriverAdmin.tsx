"use client";

import { useRef, useState, useTransition } from "react";
import { addDriver, setDriverActive } from "./actions";
import { s } from "./strings";

/** Add a driver. Both fields required — a driver with no phone cannot be dispatched. */
export function AddDriverForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = await addDriver(formData);
      if (res.ok) formRef.current?.reset();
      else setError(res.message ?? s("delivery.error.generic"));
    });

  return (
    <form ref={formRef} action={submit} className="mt-4 border-t border-line pt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">{s("delivery.drivers.addname")}</span>
          <input
            name="name"
            required
            maxLength={80}
            placeholder={s("delivery.drivers.addname")}
            disabled={pending}
            className="min-h-[44px] w-full rounded-card border border-line bg-surface px-3 text-sm text-ink disabled:opacity-50"
          />
        </label>
        <label className="flex-1">
          <span className="sr-only">{s("delivery.drivers.addphone")}</span>
          <input
            name="phone"
            required
            maxLength={40}
            inputMode="tel"
            placeholder={s("delivery.drivers.addphone")}
            disabled={pending}
            className="min-h-[44px] w-full rounded-card border border-line bg-surface px-3 text-sm text-ink disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-pill bg-ribbon px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? s("delivery.drivers.adding") : s("delivery.drivers.add")}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-status-red">{error}</p> : null}
      <p className="mt-2 text-xs text-muted">{s("delivery.drivers.note")}</p>
    </form>
  );
}

/** Activate / deactivate. There is no delete, by design. */
export function DriverActiveToggle({ driverId, active }: { driverId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await setDriverActive(driverId, !active);
            if (!res.ok) setError(res.message ?? s("delivery.error.generic"));
          })
        }
        className={`min-h-[36px] whitespace-nowrap rounded-pill border px-3 text-xs font-semibold disabled:opacity-50 ${
          active
            ? "border-line text-muted hover:text-ink"
            : "border-status-green text-status-green"
        }`}
      >
        {active ? s("delivery.drivers.deactivate") : s("delivery.drivers.activate")}
      </button>
      {error ? <span className="ml-2 text-xs text-status-red">{error}</span> : null}
    </>
  );
}
