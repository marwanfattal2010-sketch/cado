import { redirect } from "next/navigation";
import { Package, MapPin, Phone, Store } from "lucide-react";
import { getDashboardUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";
import { DriverActions } from "./DriverActions";

export const dynamic = "force-dynamic";

/**
 * THE DRIVER PAGE (V3 §8).
 *
 * The whole driver product: today's round, and two buttons. Mobile-first with
 * big targets because it is used one-handed, standing next to a scooter.
 *
 * A driver has no dashboard, no sidebar and no access to anything else. They
 * cannot read orders, sub_orders or addresses — driver_my_deliveries() returns
 * only the parcels assigned to THEM, derived from auth.uid(), and
 * driver_set_delivery_status() is the only way they can move anything.
 *
 * The admin cannot mark a parcel delivered. This screen is where "delivered"
 * comes from, because the person holding the parcel is the only one who knows.
 */

type Delivery = {
  sub_order_id: string;
  order_number: string;
  status: string;
  store_name: string;
  pickup_address: string | null;
  store_phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  drop_off: string | null;
  items: number;
  cod_amount: number;
};

const usd = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DriverPage() {
  const user = await getDashboardUser();
  const supabase = await createServerClient();

  // A driver's profile role is 'driver', which getDashboardUser() does not hand
  // a dashboard role — so identity is confirmed by whether the RPC returns.
  const { data, error } = await callRpc<Delivery[]>(supabase, "driver_my_deliveries");

  if (error?.code === "42501" || (!user && !data)) redirect("/login");

  const runs = data ?? [];
  const toCollect = runs.reduce((n, r) => n + Number(r.cod_amount), 0);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[520px] px-4 py-5">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-ink">Today&rsquo;s deliveries</h1>
        <p className="mt-0.5 text-[14px] text-secondary tnum">
          {runs.length} parcel{runs.length === 1 ? "" : "s"}
          {toCollect > 0 ? ` · ${usd(toCollect)} to collect` : ""}
        </p>
      </header>

      {error ? (
        <p className="rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13.5px] text-status-red">
          Could not load your round: {error.message}
        </p>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface px-4 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-surface-sunk text-muted">
            <Package size={24} />
          </span>
          <p className="text-[15px] text-ink">Nothing assigned to you yet</p>
          <p className="max-w-[260px] text-[13.5px] text-muted">
            When CADO assigns you a parcel it appears here. Keep this page open.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {runs.map((r) => (
            <li key={r.sub_order_id} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-[15px] font-semibold text-ink">#{r.order_number}</span>
                <span
                  className="rounded-pill px-2.5 py-1 text-[12.5px] font-medium"
                  style={{
                    color: r.status === "ready" ? "var(--st-preparing)" : "var(--st-out)",
                    background:
                      r.status === "ready"
                        ? "color-mix(in srgb, var(--st-preparing) 16%, transparent)"
                        : "color-mix(in srgb, var(--st-out) 16%, transparent)",
                  }}
                >
                  {r.status === "ready" ? "Collect" : "Deliver"}
                </span>
              </div>

              <div className="space-y-3 px-4 py-3">
                <Leg
                  icon={<Store size={16} />}
                  title="Pick up from"
                  name={r.store_name}
                  line={r.pickup_address ?? "No pickup address on file — call the shop"}
                  phone={r.store_phone}
                />
                <Leg
                  icon={<MapPin size={16} />}
                  title="Deliver to"
                  name={r.recipient_name ?? "Customer"}
                  line={r.drop_off ?? "No address on file — call CADO"}
                  phone={r.recipient_phone}
                />

                <div className="flex items-center justify-between rounded-[12px] bg-surface-sunk px-3 py-2 text-[13.5px]">
                  <span className="text-secondary tnum">
                    {r.items} item{r.items === 1 ? "" : "s"}
                  </span>
                  {Number(r.cod_amount) > 0 ? (
                    <span className="font-semibold text-ink tnum">Collect {usd(r.cod_amount)} cash</span>
                  ) : (
                    <span className="text-muted">Already paid</span>
                  )}
                </div>
              </div>

              <div className="border-t border-line p-3">
                <DriverActions subOrderId={r.sub_order_id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leg({
  icon,
  title,
  name,
  line,
  phone,
}: {
  icon: React.ReactNode;
  title: string;
  name: string;
  line: string;
  phone: string | null;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunk text-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] uppercase tracking-wide text-muted">{title}</p>
        <p className="text-[14.5px] font-medium text-ink">{name}</p>
        <p className="text-[13.5px] leading-5 text-secondary">{line}</p>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ribbon tnum"
          >
            <Phone size={13} /> {phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}
