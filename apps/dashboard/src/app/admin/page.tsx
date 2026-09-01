import Link from "next/link";
import { DollarSign, ShoppingBag, Wallet, Users, ArrowUpRight, ArrowDownRight, Gift, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc, isMissingFunction } from "@/lib/rpc";
import { publicEnv } from "@/lib/env";
import { TintCard, TintChip, Spark, Pill, Initials, type Tint } from "@/components/v3/tint";
import { RangeChips } from "@/components/v3/RangeChips";
import { resolveV4Range, RANGE_WORDS } from "@/lib/range";
import { AssistantWidget } from "@/components/v3/AssistantWidget";

export const dynamic = "force-dynamic";

/**
 * HOME — V4.
 *
 * V3's Home was rejected as "so dark, there's no colors" and too empty. This is
 * the same honest data in the reference's shape: four tinted KPI cards with
 * real sparklines, a data-driven hero, a compact assistant, recent orders, top
 * products, orders by area and upcoming occasions — one screen at 1440×900.
 *
 * Every figure is from a SECURITY DEFINER function. Admins cannot read orders,
 * sub_orders, order_items or addresses directly (0020), and PostgREST answers a
 * blocked select with an EMPTY ARRAY, not an error — so a page that queried
 * those tables would show a confident $0. Any error here is shown in red
 * instead.
 *
 * Nothing invented: no growth arrow without a previous period, no rating, no
 * placeholder faces, no sample rows.
 */

type HomeSummary = {
  gmv: number; orders: number; commission: number; delivery_fees: number;
  cado_earned: number; avg_order_value: number; active_customers: number; owed_to_stores: number;
  prev_gmv: number; prev_orders: number; prev_commission: number; prev_delivery_fees: number;
  prev_cado_earned: number; prev_avg_order_value: number; prev_active_customers: number;
  had_previous: boolean;
};
type DayRow = { day: string; gmv: number; orders: number; commission: number; delivery_fees: number };
type TopProduct = { product_id: string; title: string; partner_name: string; units: number; revenue: number };
type AreaRow = { area: string; orders: number };
type NewCust = { day: string; new_customers: number };
type Sub = { status: string; partner_name: string };
type OrderRow = {
  order_id: string; order_number: string; placed_at: string;
  customer_name: string | null; total: number; sub_orders: Sub[];
};

const usd = (v: unknown, dp = 0) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

const greeting = () => {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Beirut" }).format(new Date())
  );
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;
  const r = resolveV4Range(sp.range);
  const iso = (d: Date) => d.toISOString();
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const [
    summaryRes, dailyRes, topRes, ordersRes, areaRes, newCustRes,
    occRes, pendingStoresRes, oosRes, ticketsRes,
  ] = await Promise.all([
      callRpc<HomeSummary[]>(supabase, "admin_home_summary", { p_from: iso(r.from), p_to: iso(r.to) }),
      supabase.rpc("admin_finance_breakdown", { p_from: day(r.from), p_to: day(r.to) }),
      callRpc<TopProduct[]>(supabase, "admin_top_products", { p_from: iso(r.from), p_to: iso(r.to), p_limit: 5 }),
      // 200, not 5: the "needs you" counts below are computed from these rows,
      // and counting over the newest five would quietly understate every one of
      // them. The rail only shows the first five.
      supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 }),
      callRpc<AreaRow[]>(supabase, "admin_orders_by_area", { p_from: iso(r.from), p_to: iso(r.to) }),
      callRpc<NewCust[]>(supabase, "admin_new_customers", { p_from: iso(r.from), p_to: iso(r.to) }),
      supabase
        .from("occasion_events")
        .select("id, title, event_date, banner_image_url, occasion_id")
        .eq("is_active", true)
        .gte("event_date", day(new Date()))
        .order("event_date")
        .limit(3),
      supabase.from("partners").select("id, name").eq("status", "pending").limit(20),
      supabase.from("products").select("id, title").eq("is_active", true).eq("stock_quantity", 0).limit(50),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

  const s = (summaryRes.data ?? [])[0] ?? null;
  const summaryError =
    summaryRes.error && !isMissingFunction(summaryRes.error) ? summaryRes.error.message : null;
  const days = (dailyRes.data ?? []) as DayRow[];
  const top = topRes.data ?? [];
  const recent = (ordersRes.data ?? []) as unknown as OrderRow[];
  /** The rail shows five; the counts above use the whole window. */
  const recentFive = recent.slice(0, 5);
  const areas = areaRes.data ?? [];
  const newCust = newCustRes.data ?? [];
  const occasions = occRes.data ?? [];

  /* ------------------------------------------------- what needs doing ----- */
  /*
   * This replaces the "what customers see first" banner. That card told Marwan
   * something he already knew and could not act on; this one is the answer to
   * the question he actually opens the dashboard with — what do I have to deal
   * with right now. Every row is a real count with a link straight to it, and
   * when there is nothing, it says so rather than manufacturing a task.
   */
  const now = Date.now();
  const hrsSince = (iso: string) => (now - new Date(iso).getTime()) / 3_600_000;
  const legsWith = (o: OrderRow, st: string) => (o.sub_orders ?? []).some((x) => x.status === st);

  const unconfirmed = recent.filter((o) => hrsSince(o.placed_at) > 2 && legsWith(o, "pending"));
  const waitingDriver = recent.filter((o) => legsWith(o, "ready"));
  const pendingStores = pendingStoresRes.data ?? [];
  const outOfStock = oosRes.data ?? [];
  const openTickets = ticketsRes.count ?? 0;

  const attention: AttentionItem[] = [
    {
      n: unconfirmed.length,
      label: unconfirmed.length === 1 ? "order a shop hasn't confirmed" : "orders shops haven't confirmed",
      detail: "Waiting over 2 hours",
      href: "/admin/orders?view=needs-action",
      cta: "Chase them",
      tint: "coral" as Tint,
    },
    {
      n: waitingDriver.length,
      label: waitingDriver.length === 1 ? "parcel waiting for a driver" : "parcels waiting for a driver",
      detail: "Packed and ready to collect",
      href: "/admin/delivery",
      cta: "Assign a driver",
      tint: "amber" as Tint,
    },
    {
      n: pendingStores.length,
      label: pendingStores.length === 1 ? "shop waiting to be approved" : "shops waiting to be approved",
      detail: pendingStores.slice(0, 2).map((p) => p.name).join(", "),
      href: "/admin/stores?status=pending",
      cta: "Review",
      tint: "violet" as Tint,
    },
    {
      n: openTickets,
      label: openTickets === 1 ? "customer message unanswered" : "customer messages unanswered",
      detail: "Someone is waiting on a reply",
      href: "/admin/support",
      cta: "Reply",
      tint: "sky" as Tint,
    },
    {
      n: outOfStock.length,
      label: outOfStock.length === 1 ? "product on sale with no stock" : "products on sale with no stock",
      detail: "Customers can still order these",
      href: "/admin/stores",
      cta: "Fix stock",
      tint: "rose" as Tint,
    },
  ].filter((x) => x.n > 0);

  // The calm state needs something true to say, so today's own numbers.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todays = recent.filter((o) => new Date(o.placed_at) >= startOfToday);
  const ordersToday = todays.length;
  const takingsToday = todays.reduce((n, o) => n + Number(o.total), 0);

  // Thumbnails for the top-selling list, from the real product image table.
  const topIds = top.map((t) => t.product_id).filter(Boolean);
  const { data: imgs } = topIds.length
    ? await supabase.from("product_images").select("product_id, storage_path, is_primary").in("product_id", topIds)
    : { data: [] as { product_id: string; storage_path: string; is_primary: boolean }[] };
  const imgOf = new Map<string, string>();
  for (const im of imgs ?? []) if (!imgOf.has(im.product_id) || im.is_primary) imgOf.set(im.product_id, im.storage_path);
  const publicImg = (path: string) =>
    `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path.replace(/^\/+/, "")}`;

  const newInPeriod = newCust.reduce((n, d) => n + Number(d.new_customers), 0);
  const totalAreaOrders = areas.reduce((n, a) => n + Number(a.orders), 0);
  const topTotal = top.reduce((n, t) => n + Number(t.revenue), 0);

  /* ------------------------------------------------ the summary sentence -- */
  // One real sentence about the range. Never a slogan.
  let summaryLine: string;
  if (!s || Number(s.orders) === 0) {
    summaryLine = `No orders in the last ${RANGE_WORDS[r.key] ?? r.key} yet.`;
  } else if (s.had_previous && Number(s.prev_gmv) > 0) {
    const pct = ((Number(s.gmv) - Number(s.prev_gmv)) / Number(s.prev_gmv)) * 100;
    summaryLine = `Revenue is ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}% on the previous ${
      RANGE_WORDS[r.key] ?? r.key
    }.`;
  } else {
    const storeCount = new Set(recent.flatMap((o) => (o.sub_orders ?? []).map((x) => x.partner_name))).size;
    summaryLine = `${s.orders} order${Number(s.orders) === 1 ? "" : "s"} worth ${usd(s.gmv)} in the last ${
      RANGE_WORDS[r.key] ?? r.key
    }${storeCount ? ` across ${storeCount} store${storeCount === 1 ? "" : "s"}` : ""}.`;
  }

  // Demo/test accounts are named like "[DEMO] CADO Admin"; drop the tag, then
  // take the first real word. Never greet someone as "[DEMO]".
  const firstName = (user.fullName ?? "").replace(/\[[^\]]*\]/g, "").trim().split(/\s+/)[0] ?? "";

  /* ----------------------------------------------------------- KPI defs -- */
  const delta = (now?: number, prev?: number) => {
    if (!s?.had_previous || prev === undefined || Number(prev) === 0) return null;
    const d = ((Number(now) - Number(prev)) / Number(prev)) * 100;
    return { pct: d, up: d >= 0 };
  };

  const kpis: {
    tint: Tint; icon: React.ReactNode; label: string; value: string;
    sub: React.ReactNode; spark: number[];
  }[] = [
    {
      tint: "coral",
      icon: <DollarSign size={17} />,
      label: "Revenue",
      value: usd(s?.gmv),
      sub: renderDelta(delta(s?.gmv, s?.prev_gmv)),
      spark: days.map((d) => Number(d.gmv)),
    },
    {
      tint: "amber",
      icon: <ShoppingBag size={17} />,
      label: "Orders",
      value: String(s?.orders ?? 0),
      sub: renderDelta(delta(s?.orders, s?.prev_orders)),
      spark: days.map((d) => Number(d.orders)),
    },
    {
      tint: "mint",
      icon: <Wallet size={17} />,
      label: "CADO earned",
      value: usd(s?.cado_earned, 2),
      sub: <span className="text-[12px] text-secondary">Owed to stores {usd(s?.owed_to_stores, 2)}</span>,
      spark: days.map((d) => Number(d.commission) + Number(d.delivery_fees)),
    },
    {
      tint: "sky",
      icon: <Users size={17} />,
      label: "Customers",
      value: String(s?.active_customers ?? 0),
      sub: (
        <span className="text-[12px] text-secondary">
          {newInPeriod > 0 ? `${newInPeriod} new this period` : "No new customers yet"}
        </span>
      ),
      spark: newCust.map((d) => Number(d.new_customers)),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-8 text-ink">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-secondary">{summaryLine}</p>
        </div>
        <RangeChips current={r.key} basePath="/admin" explicit={r.explicit} />
      </div>

      {summaryError ? (
        <p className="rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13px] text-status-red">
          The headline figures could not be read, so the four numbers below are not your totals: {summaryError}
        </p>
      ) : null}

      {/* KPI strip + assistant */}
      <div className="stagger grid gap-4 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_360px]">
        {kpis.map((k) => (
          <TintCard key={k.label} tint={k.tint} className="flex flex-col p-4">
            <div className="mb-3 flex items-start justify-between">
              <TintChip>{k.icon}</TintChip>
            </div>
            <p className="text-[13px] font-medium text-secondary">{k.label}</p>
            <p className="mt-0.5 text-[28px] font-bold leading-8 text-ink tnum">{k.value}</p>
            <div className="mt-1 min-h-[18px]">{k.sub}</div>
            <div className="mt-2"><Spark points={k.spark} /></div>
          </TintCard>
        ))}
        <div className="lg:col-span-4 xl:col-span-1"><AssistantWidget /></div>
      </div>

      {/* Hero + rail */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <NeedsYou items={attention} ordersToday={ordersToday} takingsToday={takingsToday} />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top selling */}
            <section className="rounded-card border border-line bg-surface">
              <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <h2 className="text-[15px] font-semibold text-ink">Top selling products</h2>
              </div>
              {top.length === 0 ? (
                <EmptyBlock
                  icon={<Gift size={20} />}
                  title="No sales in this range yet"
                  action={<Link href="/admin?range=all" className="text-[13px] font-semibold text-ribbon">Change range</Link>}
                />
              ) : (
                <ul className="divide-y divide-line">
                  {top.map((p, i) => {
                    const share = topTotal > 0 ? (Number(p.revenue) / topTotal) * 100 : 0;
                    const medal = ["--tint-amber", "--text-2", "--tint-coral"][i];
                    const img = imgOf.get(p.product_id);
                    return (
                      <li key={p.product_id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-[11.5px] font-bold"
                          style={
                            i < 3
                              ? { color: `var(${medal})`, background: `color-mix(in srgb, var(${medal}) 16%, transparent)` }
                              : { color: "var(--text-muted)", background: "var(--surface-sunk)" }
                          }
                        >
                          {i + 1}
                        </span>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={publicImg(img)} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunk text-muted">
                            <Gift size={16} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] text-ink">{p.title}</p>
                          <p className="truncate text-[12px] text-secondary">{p.partner_name}</p>
                        </div>
                        <div className="w-24 text-right">
                          <p className="text-[13px] font-semibold text-ink tnum">{p.units} sold</p>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-pill bg-surface-sunk">
                            <div className="h-full rounded-pill bg-ribbon" style={{ width: `${share.toFixed(0)}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Orders by area */}
            <section className="rounded-card border border-line bg-surface">
              <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <h2 className="text-[15px] font-semibold text-ink">Orders by area</h2>
                <span className="text-[12px] text-muted tnum">{totalAreaOrders} total</span>
              </div>
              {areas.length === 0 ? (
                <EmptyBlock icon={<ShoppingBag size={20} />} title="No delivered orders in this range" />
              ) : (
                <ul className="space-y-3 p-4">
                  {areas.slice(0, 6).map((a, i) => {
                    const pct = totalAreaOrders > 0 ? (Number(a.orders) / totalAreaOrders) * 100 : 0;
                    const tints = ["--tint-coral", "--tint-amber", "--tint-mint", "--tint-sky", "--tint-rose", "--tint-violet"];
                    const c = tints[i % tints.length];
                    return (
                      <li key={a.area}>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-pill" style={{ background: `var(${c})` }} />
                          <span className="flex-1 text-[13px] text-ink">{a.area}</span>
                          <span className="text-[12.5px] text-secondary tnum">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunk">
                          <div className="h-full rounded-pill" style={{ width: `${pct}%`, background: `var(${c})` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4 xl:col-span-4">
          <section className="rounded-card border border-line bg-surface">
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
              <h2 className="text-[15px] font-semibold text-ink">Recent orders</h2>
              <Link href="/admin/orders" className="text-[12.5px] font-medium text-ribbon">View all</Link>
            </div>
            {recentFive.length === 0 ? (
              <EmptyBlock icon={<ShoppingBag size={20} />} title="No orders yet" />
            ) : (
              <ul className="divide-y divide-line">
                {recentFive.map((o) => {
                  const legs = o.sub_orders ?? [];
                  return (
                    <li key={o.order_id}>
                      <Link
                        href={`/admin/orders/${o.order_id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunk"
                      >
                        <Initials name={o.customer_name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] text-ink">{o.customer_name ?? "Customer"}</p>
                          <p className="truncate text-[12px] text-secondary tnum">
                            {legs.length} {legs.length === 1 ? "store" : "stores"} · {usd(o.total, 2)}
                          </p>
                        </div>
                        <Pill status={legs[0]?.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-line bg-surface">
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
              <h2 className="text-[15px] font-semibold text-ink">Upcoming occasions</h2>
              <Link href="/admin/marketing" className="text-[12.5px] font-medium text-ribbon">+ Add</Link>
            </div>
            {occasions.length === 0 ? (
              <EmptyBlock
                icon={<Sparkles size={20} />}
                title="No dated occasions yet"
                hint="Add Mother's Day or Valentine's with a date and CADO can push them here."
                action={<Link href="/admin/marketing" className="text-[13px] font-semibold text-ribbon">Open Marketing</Link>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {occasions.map((o) => {
                  const d = new Date(o.event_date);
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[12px]"
                        style={{ background: "color-mix(in srgb, var(--tint-rose) 16%, transparent)", color: "var(--tint-rose)" }}
                      >
                        <span className="text-[15px] font-bold leading-4">{d.getDate()}</span>
                        <span className="text-[10px] uppercase">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-ink">{o.title}</p>
                        <p className="text-[12px] text-secondary">
                          {Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))} days away
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- pieces ---- */

function renderDelta(d: { pct: number; up: boolean } | null) {
  if (!d) return <span className="text-[12px] text-muted">No previous period yet</span>;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[12px] font-medium tnum"
      style={{ color: d.up ? "var(--st-delivered)" : "var(--st-cancelled)" }}
    >
      {d.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(d.pct).toFixed(0)}% vs previous period
    </span>
  );
}

function EmptyBlock({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-sunk text-muted">
        {icon}
      </span>
      <p className="text-[13.5px] text-secondary">{title}</p>
      {hint ? <p className="max-w-[240px] text-[12px] text-muted">{hint}</p> : null}
      {action}
    </div>
  );
}


/* ------------------------------------------------------- what needs you --- */

type AttentionItem = {
  n: number;
  label: string;
  detail: string;
  href: string;
  cta: string;
  tint: Tint;
};

/**
 * The prime slot on Home.
 *
 * It used to hold "what customers see first" — a card showing which stores were
 * featured. Marwan didn't like it, and he was right: it told him something he
 * had chosen himself, and gave him nothing to do about it.
 *
 * This answers the question he actually opens the dashboard to ask: what needs
 * me right now. Each row is a real count from a real query with a button that
 * lands on exactly that filtered list, worst first.
 *
 * When nothing needs him it says so and shows today's takings instead. It never
 * manufactures a task to look busy — an empty list here is good news, and the
 * card is allowed to say that.
 */
function NeedsYou({
  items,
  ordersToday,
  takingsToday,
}: {
  items: AttentionItem[];
  ordersToday: number;
  takingsToday: number;
}) {
  if (items.length === 0) {
    return (
      <TintCard tint="mint" className="flex flex-col justify-center p-6" style={{ minHeight: 220 }}>
        <div className="flex items-center gap-2.5">
          <TintChip><Check /></TintChip>
          <h2 className="font-editorial text-[30px] font-medium leading-9 text-ink">All caught up</h2>
        </div>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-secondary">
          No orders waiting on a shop, no parcels without a driver, nothing waiting on you.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[12px] text-secondary">Orders today</p>
            <p className="text-[24px] font-bold text-ink tnum">{ordersToday}</p>
          </div>
          <div>
            <p className="text-[12px] text-secondary">Taken today</p>
            <p className="text-[24px] font-bold text-ink tnum">{usd(takingsToday, 2)}</p>
          </div>
        </div>
      </TintCard>
    );
  }

  const total = items.reduce((n, i) => n + i.n, 0);

  return (
    <TintCard tint={items[0].tint} className="p-5" style={{ minHeight: 220 }}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="font-editorial text-[28px] font-medium leading-8 text-ink">
          {total} thing{total === 1 ? "" : "s"} need you
        </h2>
        <span className="text-[13px] text-secondary">right now</span>
      </div>

      <ul className="space-y-1.5">
        {items.slice(0, 4).map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="group flex items-center gap-3 rounded-[12px] bg-surface/50 px-3 py-2.5 transition-colors hover:bg-surface/80"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold tnum"
                style={{
                  color: `var(--tint-${i.tint})`,
                  background: `color-mix(in srgb, var(--tint-${i.tint}) 18%, transparent)`,
                }}
              >
                {i.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-ink">{i.label}</span>
                {i.detail ? (
                  <span className="block truncate text-[12.5px] text-secondary">{i.detail}</span>
                ) : null}
              </span>
              <span className="shrink-0 rounded-[10px] bg-ribbon px-3 py-1.5 text-[12.5px] font-semibold text-white">
                {i.cta}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {items.length > 4 ? (
        <p className="mt-2 text-[12.5px] text-secondary">
          and {items.length - 4} more kind{items.length - 4 === 1 ? "" : "s"} of thing below
        </p>
      ) : null}
    </TintCard>
  );
}

/** A tick, drawn rather than pulled from an icon set for one use. */
function Check() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
