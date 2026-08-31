import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatusPill, EmptyStateV2, KpiCard, usd } from "@/components/ui";
import { s } from "./strings";
import { AssignDriver, type DriverOption } from "./AssignDriver";
import { AdvanceStatus } from "./AdvanceStatus";
import { AddDriverForm, DriverActiveToggle } from "./DriverAdmin";

export const dynamic = "force-dynamic";

/**
 * Delivery dispatch (§4.8) — today's board. Manual dispatch: a human decides
 * who drives, taps two buttons, and the database records what happened.
 * There are no maps, no ETAs and no tracking, because CADO does not have any
 * of those and a screen that implies otherwise is a screen that lies.
 *
 * WHERE THE DATA COMES FROM, AND WHY IT LOOKS INDIRECT
 *
 * Migration 0020 deliberately removed admin's direct SELECT on orders,
 * sub_orders, order_items and addresses (an admin browsing their own order
 * page was being shown everyone's), and 0035 re-states that admin stays
 * excluded on purpose. So this page cannot `.from("orders")`. It reads
 * through the two admin-gated SECURITY DEFINER windows that exist:
 *
 *   admin_orders(limit, offset)  every order + its sub-orders and statuses
 *   admin_order_detail(order_id) that order's delivery address
 *
 * drivers, deliveries, partners and settings ARE readable directly — 0068
 * gives drivers/deliveries an is_admin() policy of their own.
 *
 * TWO THINGS THE SPEC GOT WRONG ABOUT THE SCHEMA, confirmed against the live
 * database rather than the migration file:
 *
 *   1. `orders` has NO status column. Status lives on sub_orders, one row per
 *      store. An order is therefore in a dispatch lane because of what its
 *      store portions say, and a two-store order can legitimately be half
 *      ready. Each store shows its own pill and the buttons move only the
 *      portions that are actually at that stage.
 *   2. Drop-off is orders.delivery_address_id -> addresses (city, area), with
 *      orders.recipient_name / recipient_phone as the gift-order fallback.
 *
 * The window is the 200 most recent orders (admin_orders' maximum page). The
 * live table holds 29 orders, so that is currently the whole table; an order
 * sitting unfulfilled for 200 newer orders is a data problem, not a dispatch
 * one, and would need a status-filtered RPC to surface.
 */

const BOARD_WINDOW = 200;

/** Beirut, because that is where the drivers and the shops are. */
const TZ = "Asia/Beirut";
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

interface SubOrderLite {
  sub_order_id: string;
  partner_id: string;
  partner_name: string;
  status: string;
}

interface OrderDetail {
  address: {
    recipient_name: string | null;
    phone: string | null;
    city: string | null;
    area: string | null;
    street: string | null;
  } | null;
  recipient_name: string | null;
  recipient_phone: string | null;
}

type Lane = "awaiting" | "out" | "delivered";

interface BoardCard {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  lane: Lane;
  subs: SubOrderLite[];
  readySubOrderIds: string[];
  outSubOrderIds: string[];
  deliveredAt: string | null;
  driver: DriverOption | null;
  cost: number | null;
}

export default async function AdminDeliveryPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const today = dayFmt.format(new Date());
  const isToday = (iso: string | null | undefined) =>
    !!iso && dayFmt.format(new Date(iso)) === today;

  /* ------------------------------------------------------------- orders -- */

  const { data: orderRows, error: ordersError } = await supabase.rpc("admin_orders", {
    p_limit: BOARD_WINDOW,
    p_offset: 0,
  });

  const orders = (orderRows ?? []).map((o) => ({
    orderId: o.order_id,
    orderNumber: o.order_number,
    placedAt: o.placed_at,
    subs: ((o.sub_orders ?? []) as unknown as SubOrderLite[]) ?? [],
  }));

  /* --------------------------------------------------------- deliveries -- */
  // One row per order (unique(order_id)). Fetched for the whole window so the
  // "delivered today" lane can key off delivered_at, not just when the order
  // was placed.

  type DeliveryRow = {
    order_id: string;
    driver_id: string | null;
    cost: number | null;
    delivered_at: string | null;
  };
  let deliveryRows: DeliveryRow[] = [];
  if (orders.length > 0) {
    const { data } = await supabase
      .from("deliveries")
      .select("order_id, driver_id, cost, delivered_at")
      .in(
        "order_id",
        orders.map((o) => o.orderId)
      );
    deliveryRows = data ?? [];
  }
  const deliveryByOrder = new Map(deliveryRows.map((d) => [d.order_id, d]));

  /* ------------------------------------------------------------ drivers -- */

  const { data: driverRows } = await supabase
    .from("drivers")
    .select("id, name, phone, active, created_at")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  const drivers = driverRows ?? [];
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const activeDrivers: DriverOption[] = drivers
    .filter((d) => d.active)
    .map((d) => ({ id: d.id, name: d.name, phone: d.phone }));

  // Deliveries assigned today, per driver. Coarse-filtered in SQL (a day
  // either side of the Beirut date, so no timezone arithmetic can drop a row)
  // then counted exactly in JS against the Beirut calendar day.
  const coarseSince = new Date(`${today}T00:00:00Z`);
  coarseSince.setUTCDate(coarseSince.getUTCDate() - 1);
  const { data: recentAssignments } = await supabase
    .from("deliveries")
    .select("driver_id, assigned_at")
    .gte("assigned_at", coarseSince.toISOString());
  const assignedTodayByDriver = new Map<string, number>();
  for (const row of recentAssignments ?? []) {
    if (!row.driver_id || !isToday(row.assigned_at)) continue;
    assignedTodayByDriver.set(row.driver_id, (assignedTodayByDriver.get(row.driver_id) ?? 0) + 1);
  }

  /* ----------------------------------------------------------- settings -- */
  // The standard customer-facing delivery fee, shown as context next to the
  // cost box. It is NOT written into any delivery row: the fee CADO charges
  // and what a run cost CADO are different numbers.

  const { data: feeSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "delivery_fee_usd")
    .maybeSingle();
  const rawFee = feeSetting?.value;
  const standardFee = typeof rawFee === "number" ? rawFee : Number.isFinite(Number(rawFee)) ? Number(rawFee) : null;

  /* ------------------------------------------------------------- lanes --- */

  const cards: BoardCard[] = [];
  for (const o of orders) {
    const active = o.subs.filter((x) => x.status !== "cancelled" && x.status !== "refunded");
    if (active.length === 0) continue;

    const delivery = deliveryByOrder.get(o.orderId) ?? null;
    const readyIds = active.filter((x) => x.status === "ready").map((x) => x.sub_order_id);
    const outIds = active
      .filter((x) => x.status === "out_for_delivery")
      .map((x) => x.sub_order_id);

    let lane: Lane | null = null;
    if (outIds.length > 0) lane = "out";
    else if (readyIds.length > 0) lane = "awaiting";
    else if (active.every((x) => x.status === "delivered")) {
      if (isToday(delivery?.delivered_at) || isToday(o.placedAt)) lane = "delivered";
    }
    if (!lane) continue;

    cards.push({
      orderId: o.orderId,
      orderNumber: o.orderNumber,
      placedAt: o.placedAt,
      lane,
      subs: active,
      readySubOrderIds: readyIds,
      outSubOrderIds: outIds,
      deliveredAt: delivery?.delivered_at ?? null,
      driver: delivery?.driver_id
        ? (() => {
            const d = driverById.get(delivery.driver_id!);
            return d ? { id: d.id, name: d.name, phone: d.phone } : null;
          })()
        : null,
      cost: delivery?.cost != null ? Number(delivery.cost) : null,
    });
  }

  /* ------------------------------------------- pickup addresses + drops -- */

  const partnerIds = [...new Set(cards.flatMap((c) => c.subs.map((x) => x.partner_id)))];
  let partnerRows: { id: string; name: string; pickup_address: string | null; driver_contact: string | null }[] = [];
  if (partnerIds.length > 0) {
    const { data } = await supabase
      .from("partners")
      .select("id, name, pickup_address, driver_contact")
      .in("id", partnerIds);
    partnerRows = data ?? [];
  }
  const partnerById = new Map(partnerRows.map((p) => [p.id, p]));

  // The delivery address is only reachable through admin_order_detail(), one
  // call per order. Bounded by the board — the orders actually being
  // dispatched — not by the order table, and issued in parallel.
  const detailEntries = await Promise.all(
    cards.map(async (c) => {
      const { data } = await supabase.rpc("admin_order_detail", { p_order_id: c.orderId });
      return [c.orderId, (data as unknown as OrderDetail | null) ?? null] as const;
    })
  );
  const detailByOrder = new Map(detailEntries);

  const lanes: { key: Lane; title: string; empty: string; accent: string }[] = [
    {
      key: "awaiting",
      title: s("delivery.lane.awaiting"),
      empty: s("delivery.empty.awaiting"),
      accent: "bg-status-amber",
    },
    {
      key: "out",
      title: s("delivery.lane.out"),
      empty: s("delivery.empty.out"),
      accent: "bg-status-indigo",
    },
    {
      key: "delivered",
      title: s("delivery.lane.delivered"),
      empty: s("delivery.empty.delivered"),
      accent: "bg-status-grey",
    },
  ];

  const countFor = (lane: Lane) => cards.filter((c) => c.lane === lane).length;

  return (
    <div>
      <PageHeader title={s("delivery.title")} />

      {ordersError ? (
        <p className="mb-4 rounded-card border border-line bg-status-red-tint p-3 text-sm text-status-red">
          {ordersError.message}
        </p>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={s("delivery.kpi.awaiting")}
          value={String(countFor("awaiting"))}
          hint={s("delivery.kpi.unit")}
        />
        <KpiCard
          label={s("delivery.kpi.out")}
          value={String(countFor("out"))}
          hint={s("delivery.kpi.unit")}
        />
        <KpiCard
          label={s("delivery.kpi.delivered")}
          value={String(countFor("delivered"))}
          hint={s("delivery.kpi.unit")}
        />
      </div>

      {/* The board. One column per lane on desktop; stacked on a phone, in
          dispatch order, so the thing needing action is at the top. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {lanes.map((lane) => {
          const laneCards = cards.filter((c) => c.lane === lane.key);
          return (
            <section key={lane.key} aria-label={lane.title}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-pill ${lane.accent}`} aria-hidden />
                <h2 className="text-sm font-semibold text-ink">{lane.title}</h2>
                <span className="rounded-pill bg-surface-sunk px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {laneCards.length}
                </span>
              </div>

              {laneCards.length === 0 ? (
                <EmptyStateV2 icon="—" title={lane.empty} />
              ) : (
                <ul className="space-y-3">
                  {laneCards.map((c) => {
                    const detail = detailByOrder.get(c.orderId) ?? null;
                    const addr = detail?.address ?? null;
                    const dropParts = [addr?.area, addr?.city].filter(Boolean) as string[];
                    const recipientName = addr?.recipient_name ?? detail?.recipient_name ?? null;
                    const recipientPhone = addr?.phone ?? detail?.recipient_phone ?? null;

                    return (
                      <li
                        key={c.orderId}
                        className="rounded-2xl border border-line bg-surface p-4 shadow-card"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold text-ink">{c.orderNumber}</p>
                          <p className="text-xs text-muted">
                            {timeFmt.format(new Date(c.placedAt))}
                          </p>
                        </div>

                        {/* Pick up from — one line per store, with its own status */}
                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
                          {s("delivery.card.pickup")}
                        </p>
                        <ul className="mt-1 space-y-2">
                          {c.subs.map((sub) => {
                            const p = partnerById.get(sub.partner_id);
                            return (
                              <li key={sub.sub_order_id} className="text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <span className="font-medium text-ink">
                                    {p?.name ?? sub.partner_name}
                                  </span>
                                  <StatusPill status={sub.status} />
                                </div>
                                {p?.pickup_address ? (
                                  <p className="text-xs text-muted">{p.pickup_address}</p>
                                ) : (
                                  <p className="text-xs italic text-muted">
                                    {s("delivery.card.nopickup")}
                                  </p>
                                )}
                                {p?.driver_contact ? (
                                  <p className="text-xs text-muted">
                                    {s("delivery.card.storephone")}:{" "}
                                    <a
                                      href={`tel:${p.driver_contact}`}
                                      className="text-ribbon underline underline-offset-2"
                                    >
                                      {p.driver_contact}
                                    </a>
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>

                        {/* Drop off */}
                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
                          {s("delivery.card.dropoff")}
                        </p>
                        {dropParts.length > 0 ? (
                          <p className="text-sm text-ink">{dropParts.join(", ")}</p>
                        ) : (
                          <p className="text-sm italic text-muted">
                            {s("delivery.card.noaddress")}
                          </p>
                        )}
                        <p className="text-xs text-muted">
                          {recipientName ?? "—"}
                          {" · "}
                          {recipientPhone ? (
                            <a
                              href={`tel:${recipientPhone}`}
                              className="text-ribbon underline underline-offset-2"
                            >
                              {recipientPhone}
                            </a>
                          ) : (
                            <span className="italic">{s("delivery.card.nophone")}</span>
                          )}
                        </p>

                        {c.deliveredAt ? (
                          <p className="mt-2 text-xs text-status-green">
                            {s("delivery.card.deliveredat")} {timeFmt.format(new Date(c.deliveredAt))}
                          </p>
                        ) : null}

                        <div className="mt-3">
                          <AssignDriver
                            orderId={c.orderId}
                            drivers={activeDrivers}
                            currentDriver={c.driver}
                            currentCost={c.cost}
                            standardFee={standardFee}
                          />
                        </div>

                        <AdvanceStatus
                          orderId={c.orderId}
                          readySubOrderIds={c.readySubOrderIds}
                          outSubOrderIds={c.outSubOrderIds}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        {s("delivery.note.window")}
        {standardFee != null ? ` Standard delivery fee ${usd(standardFee)}.` : ""}
      </p>

      {/* ------------------------------------------------------- drivers -- */}

      <div className="mt-6">
        <Card title={s("delivery.drivers.title")}>
          {drivers.length === 0 ? (
            <EmptyStateV2 icon="—" title={s("delivery.drivers.empty")} />
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">{s("delivery.drivers.name")}</th>
                    <th className="py-2 pr-3 font-medium">{s("delivery.drivers.phone")}</th>
                    <th className="py-2 pr-3 text-right font-medium">
                      {s("delivery.drivers.today")}
                    </th>
                    <th className="py-2 pr-3 font-medium">{s("delivery.drivers.status")}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-ink">{d.name}</td>
                      <td className="py-2.5 pr-3">
                        <a
                          href={`tel:${d.phone}`}
                          className="text-ribbon underline underline-offset-2"
                        >
                          {d.phone}
                        </a>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ink">
                        {assignedTodayByDriver.get(d.id) ?? 0}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                            d.active
                              ? "bg-status-green-tint text-status-green"
                              : "bg-status-grey-tint text-status-grey"
                          }`}
                        >
                          {d.active ? s("delivery.drivers.active") : s("delivery.drivers.inactive")}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <DriverActiveToggle driverId={d.id} active={d.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddDriverForm />
        </Card>
      </div>
    </div>
  );
}
