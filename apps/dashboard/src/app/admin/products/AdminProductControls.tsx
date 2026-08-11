"use client";

import { useState, useTransition } from "react";
import { adminUpdateProduct, adminSetProductActive, adminCreateProduct } from "./actions";
import { t } from "@/lib/dictionary";

/** Inline price/stock/active controls for one product row (admin). */
export function AdminProductControls({
  id,
  price,
  stock,
  isActive,
}: {
  id: string;
  price: number;
  stock: number;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message ?? t("common.error"));
    });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <InlineField
        label={t("prodedit.price")}
        defaultValue={price.toFixed(2)}
        prefix="$"
        disabled={pending}
        onCommit={(v) => run(() => adminUpdateProduct(id, { price: v }))}
      />
      <InlineField
        label={t("prodedit.stock")}
        defaultValue={String(stock)}
        disabled={pending}
        onCommit={(v) => run(() => adminUpdateProduct(id, { stock_quantity: v }))}
      />
      <button
        onClick={() => run(() => adminSetProductActive(id, !isActive))}
        disabled={pending}
        className={`min-h-[36px] rounded-pill px-3 text-xs font-semibold disabled:opacity-50 ${
          isActive ? "border border-status-red text-status-red" : "bg-status-green text-white"
        }`}
      >
        {isActive ? "Remove from sale" : "Put on sale"}
      </button>
      {error ? <p className="w-full text-xs text-status-red">{error}</p> : null}
    </div>
  );
}

function InlineField({
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
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <span className="flex items-center gap-1">
        {prefix ? <span className="text-sm text-muted">{prefix}</span> : null}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value !== defaultValue && onCommit(value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          disabled={disabled}
          inputMode="decimal"
          className="w-20 min-h-[36px] rounded-card border border-line bg-canvas px-2 text-sm tabular-nums disabled:opacity-50"
        />
      </span>
    </label>
  );
}

/** Collapsible add-product form. Created hidden; activate once photos exist. */
export function AddProductForm({
  partners,
  categories,
}: {
  partners: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-[40px] rounded-pill bg-ink px-4 text-sm font-semibold text-canvas"
      >
        + Add product
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await adminCreateProduct(fd);
          setResult(res);
          if (res.ok) (document.getElementById("add-product") as HTMLFormElement)?.reset();
        })
      }
      id="add-product"
      className="rounded-card border border-line bg-surface p-4 shadow-rest"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Title</span>
          <input name="title" required minLength={3} maxLength={120} className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Store</span>
          <select name="partner_id" required className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-2 text-sm">
            <option value="">—</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Category</span>
          <select name="category_id" required className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-2 text-sm">
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Price ($)</span>
          <input name="price" required inputMode="decimal" className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Stock</span>
          <input name="stock_quantity" defaultValue="0" inputMode="numeric" className="w-full min-h-[40px] rounded-card border border-line bg-canvas px-3 text-sm" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Description (optional)</span>
          <textarea name="description" rows={2} className="w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-[40px] rounded-pill bg-ink px-4 text-sm font-semibold text-canvas disabled:opacity-50">
          {pending ? t("common.saving") : t("common.save")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          {t("common.cancel")}
        </button>
        {result ? (
          <span className={`text-sm ${result.ok ? "text-status-green" : "text-status-red"}`}>{result.message}</span>
        ) : null}
      </div>
    </form>
  );
}
