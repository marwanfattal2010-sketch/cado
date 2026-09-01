"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardRole } from "@/lib/auth";

/**
 * ⌘K / Ctrl-K search. Type an order number, a customer, a product or a store
 * and jump straight there.
 *
 * Everything it queries runs under the CALLER's own session, so a store owner
 * searching sees only their own rows — the isolation is RLS's, not this
 * component's. Orders go through admin_orders() because admins have no direct
 * read on orders (0020); for a store owner that RPC refuses, so order results
 * simply do not appear for them rather than the box erroring.
 */

type Hit = { kind: string; label: string; sub?: string; href: string };

export function GlobalSearch({ role }: { role: DashboardRole }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    // Debounced: a keystroke should not be a round trip.
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;
      const found: Hit[] = [];

      const [stores, products, orders] = await Promise.all([
        role === "admin"
          ? supabase.from("partners").select("id, name, city").ilike("name", like).limit(5)
          : Promise.resolve({ data: [] as { id: string; name: string; city: string | null }[] }),
        supabase.from("products").select("id, title, partner_id").ilike("title", like).limit(5),
        role === "admin"
          ? supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 })
          : Promise.resolve({ data: [] as unknown[] }),
      ]);

      for (const s of (stores.data ?? []) as { id: string; name: string; city: string | null }[]) {
        found.push({ kind: "Store", label: s.name, sub: s.city ?? undefined, href: `/admin/stores/${s.id}` });
      }
      for (const p of (products.data ?? []) as { id: string; title: string }[]) {
        found.push({
          kind: "Product",
          label: p.title,
          href: role === "admin" ? "/admin/products" : "/store/products",
        });
      }
      const lower = term.toLowerCase();
      const orderRows = (orders.data ?? []) as {
        order_id: string;
        order_number: string;
        customer_name: string | null;
      }[];
      for (const o of orderRows) {
        const hay = `${o.order_number} ${o.customer_name ?? ""}`.toLowerCase();
        if (!hay.includes(lower)) continue;
        found.push({
          kind: "Order",
          label: `#${o.order_number}`,
          sub: o.customer_name ?? undefined,
          href: `/admin/orders/${o.order_id}`,
        });
        if (found.filter((f) => f.kind === "Order").length >= 6) break;
      }

      if (!cancelled) {
        setHits(found);
        setBusy(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, role]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-card border border-line bg-canvas px-2.5 text-left text-[13px] text-muted transition-colors hover:border-line-strong"
      >
        <Search size={14} />
        <span className="flex-1 truncate">Search orders, stores, products…</span>
        <kbd className="hidden rounded border border-line px-1 text-[10px] text-muted sm:block">⌘K</kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-sheet border border-line bg-surface shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search size={16} className="text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Order number, customer, product or store…"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {q.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-xs text-muted">Type at least two characters.</p>
              ) : busy ? (
                <p className="px-3 py-6 text-center text-xs text-muted">Searching…</p>
              ) : hits.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted">Nothing matched “{q.trim()}”.</p>
              ) : (
                hits.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => go(h.href)}
                    className="flex w-full items-center gap-2 rounded-card px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-sunk"
                  >
                    <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted">{h.kind}</span>
                    <span className="flex-1 truncate">{h.label}</span>
                    {h.sub ? <span className="truncate text-xs text-muted">{h.sub}</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
