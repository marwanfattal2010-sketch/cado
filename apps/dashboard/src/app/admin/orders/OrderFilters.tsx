"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Search and filter controls. Everything writes to the URL and the server
 * re-queries — so a filtered view is a link you can send to someone, and the
 * back button does what it should.
 */
export function OrderFilters({
  stores,
  current,
}: {
  stores: { id: string; name: string }[];
  current: { q?: string; store?: string; pay?: string; paid?: string; view?: string };
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q ?? "");

  const push = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...current, ...over, page: undefined } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    router.push(`/admin/orders${p.toString() ? `?${p}` : ""}`);
  };

  const select =
    "h-9 rounded-card border border-line bg-canvas px-2 text-[13px] text-ink outline-none focus:border-line-strong";

  const active = current.store || current.pay || current.paid || current.q;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || undefined });
        }}
        className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-card border border-line bg-canvas px-2.5"
      >
        <Search size={14} className="shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order number, customer name or phone"
          className="h-full flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              push({ q: undefined });
            }}
            aria-label="Clear search"
            className="text-muted hover:text-ink"
          >
            <X size={14} />
          </button>
        ) : null}
      </form>

      <select
        value={current.store ?? ""}
        onChange={(e) => push({ store: e.target.value || undefined })}
        className={select}
        aria-label="Filter by store"
      >
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        value={current.pay ?? ""}
        onChange={(e) => push({ pay: e.target.value || undefined })}
        className={select}
        aria-label="Filter by payment method"
      >
        <option value="">Any payment</option>
        <option value="cod">Cash on delivery</option>
        <option value="whish">Whish</option>
      </select>

      <select
        value={current.paid ?? ""}
        onChange={(e) => push({ paid: e.target.value || undefined })}
        className={select}
        aria-label="Filter by paid or unpaid"
      >
        <option value="">Paid or unpaid</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid</option>
      </select>

      {active ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push(current.view ? `/admin/orders?view=${current.view}` : "/admin/orders");
          }}
          className="h-9 rounded-card px-2.5 text-[12px] font-medium text-muted hover:text-ink"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
