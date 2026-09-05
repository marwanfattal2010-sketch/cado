"use client";

import { useState, useTransition } from "react";
import { updateProduct, setProductActive, setProductFlag, updateVariantStock } from "./actions";
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
  compareAtPrice,
  stock,
  isActive,
  isPick: initialIsPick,
  isGiftReady: initialIsGiftReady,
  variants,
}: {
  id: string;
  price: number;
  /** products.compare_at_price — null when the product is not on sale. */
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
  isPick: boolean;
  isGiftReady: boolean;
  variants: Variant[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Optimistic, so a tap on a phone feels instant; a failed save surfaces
  // in the error line beside the row and the next render restores truth.
  const [isPick, setIsPick] = useState(initialIsPick);
  const [isGiftReady, setIsGiftReady] = useState(initialIsGiftReady);

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
        {/*
          THIS FIELD IS THE SALE. Putting a number here above the price is what
          shows the discount badge on the storefront, strikes through the old
          price, and puts the product into Super Deals. Emptying it ends the
          promotion. There is no separate list to curate anywhere — the shop
          window is decided here.
        */}
        <Field
          label="Was (sale)"
          defaultValue={compareAtPrice != null ? compareAtPrice.toFixed(2) : ""}
          prefix="$"
          placeholder="—"
          disabled={pending}
          onCommit={(v) => run(() => updateProduct(id, { compare_at_price: v }))}
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
        {/* The two curation flags the storefront's category tabs read. They
            are the ONLY way "Store picks" and "Ready to gift" ever have
            anything in them — the storefront will not invent either. */}
        <Toggle
          label="Store pick"
          on={isPick}
          disabled={pending}
          onClick={() => {
            const next = !isPick;
            setIsPick(next);
            run(() => setProductFlag(id, "is_pick", next));
          }}
        />
        <Toggle
          label="Ready to gift"
          on={isGiftReady}
          disabled={pending}
          onClick={() => {
            const next = !isGiftReady;
            setIsGiftReady(next);
            run(() => setProductFlag(id, "is_gift_ready", next));
          }}
        />
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

function Toggle({
  label,
  on,
  onClick,
  disabled,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`min-h-[40px] rounded-pill px-4 text-sm font-semibold disabled:opacity-50 ${
        on ? "bg-persimmon text-white" : "border border-line text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  defaultValue,
  onCommit,
  disabled,
  prefix,
  placeholder,
}: {
  label: string;
  defaultValue: string;
  onCommit: (value: string) => void;
  disabled: boolean;
  prefix?: string;
  placeholder?: string;
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
          placeholder={placeholder}
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
