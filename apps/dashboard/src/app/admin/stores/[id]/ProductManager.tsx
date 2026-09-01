"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Package } from "lucide-react";
import { adminUpdateProduct, adminSetProductActive } from "@/app/admin/products/actions";
import { Pill } from "@/components/v3/tint";

/**
 * The store's catalogue, editable in place (V4 §4). This is where Products
 * lives now that the global product page is gone.
 *
 * Price and stock save on blur — an admin fixing a price should not have to
 * find a save button — and every write goes through the existing admin actions,
 * which re-check requireAdmin() on the server. The row shows what it changed,
 * or why it could not.
 */

export type ManagedProduct = {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  review_status: string;
  image: string | null;
};

const usd = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ProductManager({ products }: { products: ManagedProduct[] }) {
  const [query, setQuery] = useState("");
  const visible = products.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center gap-3 border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">Products</h2>
        <span className="text-[12px] text-muted tnum">{products.length}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          className="ml-auto h-8 w-52 rounded-pill border border-line bg-canvas px-3 text-[12.5px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-sunk text-muted">
            <Package size={20} />
          </span>
          <p className="text-[13.5px] text-secondary">
            {products.length === 0 ? "This store has no products yet." : `Nothing matches “${query}”.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] text-muted">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                <th className="px-3 py-2.5 font-medium">Review</th>
                <th className="px-3 py-2.5 text-right font-medium">On storefront</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: ManagedProduct }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock_quantity));
  const [active, setActive] = useState(product.is_active);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) =>
    start(async () => {
      setErr(null);
      setMsg(null);
      const res = await fn();
      if (res.ok) setMsg(okMsg);
      else setErr(res.message ?? "Didn't save.");
    });

  const cell =
    "h-8 w-20 rounded-[8px] border border-line bg-canvas px-2 text-right text-[13px] text-ink tnum disabled:opacity-50";

  return (
    <tr className="border-b border-line/60 last:border-0 hover:bg-surface-sunk">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2.5">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="h-9 w-9 shrink-0 rounded-[8px] object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-surface-sunk text-muted">
              <Package size={14} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-ink">{product.title}</p>
            {msg ? <p className="text-[11px] text-status-green">{msg}</p> : null}
            {err ? <p className="text-[11px] text-status-red">{err}</p> : null}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            if (Number(price) !== Number(product.price))
              run(() => adminUpdateProduct(product.id, { price }), "Price saved");
          }}
          disabled={pending}
          inputMode="decimal"
          className={cell}
          aria-label={`Price of ${product.title}`}
        />
        {product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price) ? (
          <span className="ml-1 text-[11px] text-muted line-through">{usd(product.compare_at_price)}</span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={() => {
            if (Number(stock) !== Number(product.stock_quantity))
              run(() => adminUpdateProduct(product.id, { stock_quantity: stock }), "Stock saved");
          }}
          disabled={pending}
          inputMode="numeric"
          className={`${cell} w-16`}
          aria-label={`Stock of ${product.title}`}
        />
      </td>
      <td className="px-3 py-2">
        <Pill status={product.review_status} label={product.review_status === "approved" ? "Live" : undefined} />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !active;
            setActive(next);
            run(() => adminSetProductActive(product.id, next), next ? "Now visible" : "Hidden");
          }}
          className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50 ${
            active
              ? "bg-status-green-tint text-status-green"
              : "border border-line text-muted hover:text-ink"
          }`}
        >
          {active ? <Eye size={13} /> : <EyeOff size={13} />}
          {active ? "Visible" : "Hidden"}
        </button>
      </td>
    </tr>
  );
}
