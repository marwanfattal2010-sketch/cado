"use client";

import { useState, useTransition } from "react";
import { updateProduct, setProductActive, updateVariantStock } from "./actions";
import { t } from "@/lib/dictionary";

interface Variant {
  id: string;
  name: string;
  stock_quantity: number;
}

/**
 * Inline editor for one product row: price, stock, sold-out toggle, and
 * per-variant stock. Field edits save on blur/Enter; the toggle saves on tap.
 * Errors surface next to the row — a store owner on a phone will not see a
 * toast that vanished.
 */
export function ProductEditor({
  id,
  price,
  stock,
  isActive,
  variants,
}: {
  id: string;
  price: number;
  stock: number;
  isActive: boolean;
  variants: Variant[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res = await fn();
      if (!res.ok) setError(res.message ?? t("common.error"));
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label={t("prodedit.price")}
          defaultValue={price.toFixed(2)}
          prefix="$"
          disabled={pending}
          onCommit={(v) => run(() => updateProduct(id, { price: v }))}
        />
        <Field
          label={t("prodedit.stock")}
          defaultValue={String(stock)}
          disabled={pending}
          onCommit={(v) => run(() => updateProduct(id, { stock_quantity: v }))}
        />
        <button
          onClick={() => run(() => setProductActive(id, !isActive))}
          disabled={pending}
          className={`min-h-[40px] rounded-pill px-4 text-sm font-semibold disabled:opacity-50 ${
            isActive
              ? "border border-status-red text-status-red"
              : "bg-status-green text-white"
          }`}
        >
          {isActive ? t("prodedit.soldout") : t("prodedit.onsale")}
        </button>
        {saved ? <span className="pb-2 text-xs text-status-green">{t("common.saved")}</span> : null}
      </div>

      {variants.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {variants.map((v) => (
            <Field
              key={v.id}
              label={`${v.name} ${t("prodedit.variant.stock")}`}
              defaultValue={String(v.stock_quantity)}
              disabled={pending}
              onCommit={(val) => run(() => updateVariantStock(v.id, val))}
            />
          ))}
        </div>
      )}

      {error ? <p className="mt-1 text-xs text-status-red">{error}</p> : null}
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onCommit,
  disabled,
  prefix,
}: {
  label: string;
  defaultValue: string;
  onCommit: (value: string) => void;
  disabled: boolean;
  prefix?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const commit = () => {
    if (value !== defaultValue) onCommit(value);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <span className="flex items-center gap-1">
        {prefix ? <span className="text-sm text-muted">{prefix}</span> : null}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          disabled={disabled}
          inputMode="decimal"
          className="w-24 min-h-[40px] rounded-card border border-line bg-canvas px-3 text-sm tabular-nums text-ink disabled:opacity-50"
        />
      </span>
    </label>
  );
}
