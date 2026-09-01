"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { callRpc } from "@/lib/rpc";

/**
 * "In motion right now" (V5 §1.6) — every parcel between confirmed and the
 * doorstep, with a four-step tracker.
 *
 * Live via Supabase Realtime on sub_orders, because that is where delivery
 * status actually lives (orders has no status column). A change event triggers
 * one re-read through the admin RPC rather than trying to patch a row from the
 * payload: the payload is the raw row, and this list needs the store name, the
 * area and the driver joined onto it.
 *
 * A 60-second poll runs alongside as a safety net — Realtime is a websocket and
 * websockets drop. A board that silently stops updating is worse than one that
 * updates a minute late.
 */

export type MotionRow = {
  sub_order_id: string;
  order_id: string;
  order_number: string;
  status: string;
  store_name: string;
  area: string | null;
  placed_at: string;
  driver_name: string | null;
};

/** The four steps a customer would recognise, mapped from real statuses. */
const STEPS = ["Confirmed", "Packed", "Collected", "Delivered"];
const stepOf = (status: string) =>
  status === "accepted" ? 0 : status === "preparing" ? 1 : status === "ready" ? 1 : status === "out_for_delivery" ? 2 : 3;

export function InMotion({ initial }: { initial: MotionRow[] }) {
  const [rows, setRows] = useState<MotionRow[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const reload = async () => {
      const { data } = await callRpc<MotionRow[]>(supabase, "admin_orders_in_motion", { p_limit: 8 });
      if (!cancelled && data) setRows(data);
    };

    // Unique channel name per mount: supabase.channel(name) returns the
    // EXISTING channel for a name already in use, and a subscribed channel
    // rejects new callbacks — which surfaces as an uncaught error that takes
    // the page down. (Same trap the notification bell hit.)
    const channel = supabase
      .channel(`motion-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sub_orders" }, () => void reload())
      .subscribe();

    const poll = setInterval(reload, 60_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="flex h-full flex-col rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-ink">In motion right now</h2>
          {rows.length > 0 ? (
            <span className="flex items-center gap-1 text-[11.5px] text-secondary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-status-green" />
              live
            </span>
          ) : null}
        </div>
        <Link href="/admin/delivery" className="text-[12.5px] font-medium text-ribbon">View all</Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-sunk text-muted">
            <Truck size={20} />
          </span>
          <p className="text-[13.5px] text-secondary">Nothing on the road right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const step = stepOf(r.status);
            return (
              <li key={r.sub_order_id}>
                <Link
                  href={`/admin/orders/${r.order_id}`}
                  className="block px-4 py-2.5 transition-colors hover:bg-surface-sunk"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-ribbon">#{r.order_number}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-secondary">
                      {r.store_name} → {r.area ?? "—"}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted">
                      {r.driver_name ?? "No driver"}
                    </span>
                  </div>

                  {/* Four steps; the current one and everything before it filled. */}
                  <div className="mt-2 flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex flex-1 items-center gap-1">
                        <span
                          className="h-1 flex-1 rounded-pill"
                          style={{
                            background:
                              i <= step
                                ? "var(--ribbon)"
                                : "color-mix(in srgb, var(--text-muted) 30%, transparent)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{STEPS[step]}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
