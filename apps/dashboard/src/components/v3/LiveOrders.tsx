"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusPill, usdShort } from "./primitives";

/**
 * The eight most recent orders, refreshed every 30 seconds.
 *
 * Polling rather than a Realtime subscription: what changes on an order is
 * mostly sub_orders.status, and a postgres_changes subscription on sub_orders
 * would still need a full re-read through admin_orders() to rebuild a row —
 * so a 30s poll is the same freshness for one moving part instead of two. The
 * server renders the first paint, so this never shows an empty flash.
 */

type Sub = { status: string; partner_name: string };
export type LiveOrderRow = {
  order_id: string;
  order_number: string;
  placed_at: string;
  customer_name: string | null;
  total: number;
  sub_orders: Sub[];
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function LiveOrders({ initial }: { initial: LiveOrderRow[] }) {
  const [rows, setRows] = useState<LiveOrderRow[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("admin_orders", { p_limit: 8, p_offset: 0 });
      if (!cancelled && data) setRows(data as unknown as LiveOrderRow[]);
    };
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-[13px] text-secondary">No orders yet.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((o) => {
        const subs = o.sub_orders ?? [];
        return (
          <li key={o.order_id}>
            <Link
              href={`/admin/orders/${o.order_id}`}
              className="flex h-11 items-center gap-3 px-4 text-[13px] transition-colors hover:bg-surface-sunk"
            >
              <span className="w-24 shrink-0 font-medium text-ribbon">#{o.order_number}</span>
              <span className="w-12 shrink-0 text-muted tnum">{clock(o.placed_at)}</span>
              <span className="min-w-0 flex-1 truncate text-secondary">
                {subs.length > 1 ? `${subs.length} stores` : subs[0]?.partner_name ?? "—"}
              </span>
              <span className="hidden w-32 truncate text-secondary sm:block">{o.customer_name ?? "—"}</span>
              <span className="w-16 shrink-0 text-right font-semibold text-ink tnum">{usdShort(o.total)}</span>
              <span className="w-32 shrink-0 text-right">
                <StatusPill status={subs[0]?.status} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
