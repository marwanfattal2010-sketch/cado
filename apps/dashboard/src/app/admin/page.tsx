import Link from "next/link";
import {
  DollarSign, ShoppingBag, Wallet, Users, ArrowUpRight, ArrowDownRight,
  Gift, Truck, Eye, UserPlus, PackageCheck, Clock,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc, isMissingFunction } from "@/lib/rpc";
import { publicEnv } from "@/lib/env";
import { TintCard, TintChip, Spark, Pill, Initials, type Tint } from "@/components/v3/tint";
import { RangeChips } from "@/components/v3/RangeChips";
import { resolveV4Range, RANGE_WORDS } from "@/lib/range";
import { AssistantWidget } from "@/components/v3/AssistantWidget";
import { OverviewChart, type MonthPoint } from "@/components/v5/OverviewChart";
import { InMotion, type MotionRow } from "@/components/v5/InMotion";
import { MiniCalendar, type DayCount } from "@/components/v5/MiniCalendar";
import { Tasks, type TaskRow } from "@/components/v5/Tasks";
import {
  Satisfaction, FinanceSnapshot, TeamAndActivity, UpcomingDeliveries, TopStores,
  type ReviewSummary, type RecentReview, type TeamMember, type ActivityRow,
  type UpcomingRow, type TopStoreRow,
} from "@/components/v5/SidePanels";

export const dynamic = "force-dynamic";

/**
 * HOME — V5. One dense screen that runs the business.
 *
 * Every figure comes from a SECURITY DEFINER function. Admins cannot read
 * orders, sub_orders, order_items or addresses directly (0020), and PostgREST
 * answers a blocked select with an EMPTY ARRAY rather than an error — so a page
 * that queried those tables would show a confident $0. Errors surface in red.
 *
 * Nothing is invented. No growth arrow without a previous period, no rating
 * without ratings, no visitor count before tracking existed, no sample rows.
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
type SiteStat = { day: string; page_views: number; visitors: number; new_users: number };
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

type Supa = Awaited<ReturnType<typeof createServerClient>>;

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string; day?: string }>;
}) {
  const user = await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;
  const r = resolveV4Range(sp.range);
  const iso = (d: Date) => d.toISOString();
  const day = (d: Date) => d.toISOString().slice(0, 10);

  // The calendar shows whole months around today, whatever the range is.
  const calFrom = new Date();
  calFrom.setDate(1);
  calFrom.setMonth(calFrom.getMonth() - 1);
  const calTo = new Date();
  calTo.setMonth(calTo.getMonth() + 2);

  const [
    summaryRes, dailyRes, topRes, ordersRes, areaRes, newCustRes, occRes,
    pendingStoresRes, oosRes, ticketsRes, siteRes, trackingSinceRes,
    monthlyRes, motionRes, upcomingRes, byDayRes, reviewSumRes, recentRevRes,
    teamRes, auditRes, tasksRes, payablesRes, byStoreRes,
  ] = await Promise.all([
    callRpc<HomeSummary[]>(supabase, "admin_home_summary", { p_from: iso(r.from), p_to: iso(r.to) }),
    supabase.rpc("admin_finance_breakdown", { p_from: day(r.from), p_to: day(r.to) }),
    callRpc<TopProduct[]>(supabase, "admin_top_products", { p_from: iso(r.from), p_to: iso(r.to), p_limit: 5 }),
    // 200, not 8: the counts below are computed from these rows, and counting
    // over the newest handful would quietly understate every one of them.
    supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 }),
    callRpc<AreaRow[]>(supabase, "admin_orders_by_area", { p_from: iso(r.from), p_to: iso(r.to) }),
    callRpc<NewCust[]>(supabase, "admin_new_customers", { p_from: iso(r.from), p_to: iso(r.to) }),
    supabase.from("occasion_events").select("id, title, event_date").eq("is_active", true)
      .gte("event_date", day(new Date())).order("event_date").limit(6),
    supabase.from("partners").select("id, name").eq("status", "pending").limit(20),
    supabase.from("products").select("id, title").eq("is_active", true).eq("stock_quantity", 0).limit(50),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    callRpc<SiteStat[]>(supabase, "admin_site_stats", { p_from: iso(r.from), p_to: iso(r.to) }),
    callRpc<string>(supabase, "admin_tracking_since"),
    callRpc<MonthPoint[]>(supabase, "admin_monthly_overview"),
    callRpc<MotionRow[]>(supabase, "admin_orders_in_motion", { p_limit: 8 }),
    callRpc<UpcomingRow[]>(supabase, "admin_upcoming_deliveries"),
    callRpc<DayCount[]>(supabase, "admin_orders_by_day", { p_from: day(calFrom), p_to: day(calTo) }),
    callRpc<ReviewSummary[]>(supabase, "admin_review_summary"),
    callRpc<RecentReview[]>(supabase, "admin_recent_reviews", { p_limit: 3 }),
    callRpc<TeamMember[]>(supabase, "admin_team_members"),
    supabase.from("audit_log").select("id, action, table_name, created_at, actor")
      .order("created_at", { ascending: false }).limit(8),
    supabase.from("dashboard_tasks").select("id, title, done, due_date, created_by")
      .order("done").order("due_date", { nullsFirst: false }).limit(40),
    supabase.from("store_payables").select("net_owed, status"),
    supabase.rpc("admin_finance_by_store", { p_from: day(r.from), p_to: day(r.to) }),
  ]);

  const s = (summaryRes.data ?? [])[0] ?? null;
  const summaryError = summaryRes.error && !isMissingFunction(summaryRes.error) ? summaryRes.error.message : null;
  const days = (dailyRes.data ?? []) as DayRow[];
  const top = topRes.data ?? [];
  const allOrders = (ordersRes.data ?? []) as unknown as OrderRow[];
  const areas = areaRes.data ?? [];
  const newCust = newCustRes.data ?? [];
  const occasions = occRes.data ?? [];
  const site = siteRes.data ?? [];
  const trackingSince = trackingSinceRes.data ?? null;
  const monthly = monthlyRes.data ?? [];
  const motion = motionRes.data ?? [];
  const upcoming = upcomingRes.data ?? [];
  const byDay = byDayRes.data ?? [];
  const reviewSummary = (reviewSumRes.data ?? [])[0] ?? null;
  const recentReviews = recentRevRes.data ?? [];
  const team = teamRes.data ?? [];
  const topStores = ((byStoreRes.data ?? []) as unknown as TopStoreRow[]).slice(0, 5);

  /* ------------------------------------------------------------- filters -- */
  const monthFilter = sp.month ?? null;
  const dayFilter = sp.day ?? null;
  const matches = (o: OrderRow) => {
    const d = new Date(o.placed_at);
    if (dayFilter) return d.toISOString().slice(0, 10) === dayFilter;
    if (monthFilter) return d.toISOString().slice(0, 7) === monthFilter.slice(0, 7);
    return true;
  };
  const recentFive = allOrders.filter(matches).slice(0, 5);

  /* --------------------------------------------------------- second row --- */
  const inRange = (o: OrderRow) => {
    const t = new Date(o.placed_at).getTime();
    return t >= r.from.getTime() && t <= r.to.getTime();
  };
  const rangeOrders = allOrders.filter(inRange);
  const countLegs = (rows: OrderRow[], statuses: string[]) =>
    rows.reduce((n, o) => n + (o.sub_orders ?? []).filter((x) => statuses.includes(x.status)).length, 0);

  const pendingCount = countLegs(rangeOrders, ["pending", "accepted", "preparing"]);
  const deliveredCount = countLegs(rangeOrders, ["delivered"]);
  const outNow = countLegs(allOrders, ["out_for_delivery"]);

  const pageViews = site.reduce((n, d) => n + Number(d.page_views), 0);
  const visitors = site.reduce((n, d) => n + Number(d.visitors), 0);
  const newUsers = site.reduce((n, d) => n + Number(d.new_users), 0);
  // A zero before tracking existed is not a measurement, and the caption says so.
  const trackingNote = trackingSince
    ? `Since ${new Date(trackingSince).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : "Tracking starts with the next visit";

  /* --------------------------------------------------- attention strip ---- */
  const now = Date.now();
  const hrs = (t: string) => (now - new Date(t).getTime()) / 3_600_000;
  const legs = (o: OrderRow, st: string) => (o.sub_orders ?? []).some((x) => x.status === st);

  const chips = [
    { n: allOrders.filter((o) => hrs(o.placed_at) > 2 && legs(o, "pending")).length, label: "unconfirmed", cta: "Chase", href: "/admin/orders?view=needs-action" },
    { n: allOrders.filter((o) => legs(o, "ready")).length, label: "awaiting driver", cta: "Assign", href: "/admin/delivery" },
    { n: (pendingStoresRes.data ?? []).length, label: "stores to approve", cta: "Review", href: "/admin/stores?status=pending" },
    { n: ticketsRes.count ?? 0, label: "messages", cta: "Reply", href: "/admin/support" },
    { n: (oosRes.data ?? []).length, label: "out of stock", cta: "Fix", href: "/admin/stores" },
  ].filter((c) => c.n > 0);

  /* --------------------------------------------------------- finance ------ */
  const payables = payablesRes.data ?? [];
  const owed = payables.filter((p) => p.status === "pending").reduce((n, p) => n + Number(p.net_owed), 0);
  const paidOut = payables.filter((p) => p.status !== "pending").reduce((n, p) => n + Number(p.net_owed), 0);

  const tasks: TaskRow[] = ((tasksRes.data ?? []) as Omit<TaskRow, "author_name">[]).map((t) => ({
    ...t, author_name: null,
  }));

  /* ---------------------------------------------------------- activity ---- */
  const auditRows = auditRes.data ?? [];
  const actorIds = [...new Set(auditRows.map((a) => a.actor).filter(Boolean))] as string[];
  const { data: actorProfiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const actorName = new Map((actorProfiles ?? []).map((p) => [p.id, p.full_name]));
  const activity: ActivityRow[] = auditRows.map((a) => ({
    id: a.id, action: a.action, table_name: a.table_name, created_at: a.created_at,
    actor_name: a.actor ? (actorName.get(a.actor) ?? null) : null,
  }));

  const images = await topProductImages(supabase, top);

  /* ----------------------------------------------------------- summary ---- */
  let summaryLine: string;
  if (!s || Number(s.orders) === 0) {
    summaryLine = `No orders in the last ${RANGE_WORDS[r.key] ?? r.key} yet.`;
  } else if (s.had_previous && Number(s.prev_gmv) > 0) {
    const pct = ((Number(s.gmv) - Number(s.prev_gmv)) / Number(s.prev_gmv)) * 100;
    summaryLine = `Revenue is ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}% on the previous ${RANGE_WORDS[r.key] ?? r.key}.`;
  } else {
    const stores = new Set(allOrders.flatMap((o) => (o.sub_orders ?? []).map((x) => x.partner_name))).size;
    summaryLine = `${s.orders} orders worth ${usd(s.gmv)} in the last ${RANGE_WORDS[r.key] ?? r.key}${stores ? ` across ${stores} stores` : ""}.`;
  }

  const firstName = (user.fullName ?? "").replace(/\[[^\]]*\]/g, "").trim().split(/\s+/)[0] ?? "";
  const delta = (cur?: number, prev?: number) => {
    if (!s?.had_previous || prev === undefined || Number(prev) === 0) return null;
    const d = ((Number(cur) - Number(prev)) / Number(prev)) * 100;
    return { pct: d, up: d >= 0 };
  };

  return (
    <div className="space-y-4">
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
          The headline figures could not be read, so the numbers below are not your totals: {summaryError}
        </p>
      ) : null}

      {/* Row 1 */}
      <div className="grid gap-4 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_360px]">
        <BigKpi tint="coral" icon={<DollarSign size={17} />} label="Revenue" value={usd(s?.gmv)}
          d={delta(s?.gmv, s?.prev_gmv)} spark={days.map((x) => Number(x.gmv))} />
        <BigKpi tint="amber" icon={<ShoppingBag size={17} />} label="Orders" value={String(s?.orders ?? 0)}
          d={delta(s?.orders, s?.prev_orders)} spark={days.map((x) => Number(x.orders))} />
        <BigKpi tint="mint" icon={<Wallet size={17} />} label="CADO earned" value={usd(s?.cado_earned, 2)}
          d={delta(s?.cado_earned, s?.prev_cado_earned)}
          spark={days.map((x) => Number(x.commission) + Number(x.delivery_fees))} />
        <BigKpi tint="sky" icon={<Users size={17} />} label="Customers" value={String(s?.active_customers ?? 0)}
          d={delta(s?.active_customers, s?.prev_active_customers)}
          spark={newCust.map((x) => Number(x.new_customers))} />
        <div className="lg:col-span-4 xl:col-span-1"><AssistantWidget /></div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SmallKpi tint="amber" icon={<Clock size={14} />} label="Pending orders" value={String(pendingCount)} note="Not yet on the road" />
        <SmallKpi tint="mint" icon={<PackageCheck size={14} />} label="Delivered" value={String(deliveredCount)} note="In this range" />
        <SmallKpi tint="violet" icon={<Truck size={14} />} label="Out for delivery" value={String(outNow)} note="Right now" live />
        <SmallKpi tint="sky" icon={<Eye size={14} />} label="Page views" value={String(pageViews)} note={trackingNote} />
        <SmallKpi tint="rose" icon={<Users size={14} />} label="Visitors" value={String(visitors)} note={trackingNote} />
        <SmallKpi tint="coral" icon={<UserPlus size={14} />} label="New users" value={String(newUsers)} note="Signed up in range" />
      </div>

      {/* Attention strip — gone entirely when there is nothing to do */}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
          <span className="text-[12px] font-medium text-muted">Needs you</span>
          {chips.map((c) => (
            <Link key={c.label} href={c.href}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-sunk px-2.5 py-1 text-[12.5px] transition-colors hover:bg-ribbon-tint">
              <span className="font-bold text-ink tnum">{c.n}</span>
              <span className="text-secondary">{c.label}</span>
              <span className="font-semibold text-ribbon">{c.cta}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* One height for the row. Without it the chart (330px) sat beside the
          live list (635px) and left a 300px hole underneath it. */}
      <div className="grid gap-4 xl:h-[420px] xl:grid-cols-12">
        <div className="xl:col-span-8"><OverviewChart points={monthly} /></div>
        <div className="xl:col-span-4"><InMotion initial={motion} /></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8"><UpcomingDeliveries rows={upcoming} /></div>
        <div className="xl:col-span-4">
          <MiniCalendar counts={byDay} occasions={occasions} selected={dayFilter ?? undefined} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="grid gap-4 md:grid-cols-2 xl:col-span-8">
          <TopProducts top={top} images={images} supabaseUrl={publicEnv.NEXT_PUBLIC_SUPABASE_URL} />
          <TopStores rows={topStores} />
        </div>

        <section className="rounded-card border border-line bg-surface xl:col-span-4">
          <div className="flex h-12 items-center justify-between border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Recent orders</h2>
              {monthFilter || dayFilter ? (
                <Link href="/admin"
                  className="inline-flex items-center gap-1 rounded-pill bg-ribbon-tint px-2 py-0.5 text-[11.5px] font-medium text-ribbon">
                  {dayFilter
                    ? new Date(dayFilter).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : new Date(monthFilter!).toLocaleDateString("en-GB", { month: "long" })}
                  <span aria-hidden>×</span>
                </Link>
              ) : null}
            </div>
            <Link href="/admin/orders" className="shrink-0 text-[12.5px] font-medium text-ribbon">View all</Link>
          </div>
          {recentFive.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13.5px] text-secondary">
              {monthFilter || dayFilter ? "No orders then." : "No orders yet."}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recentFive.map((o) => {
                const l = o.sub_orders ?? [];
                return (
                  <li key={o.order_id}>
                    <Link href={`/admin/orders/${o.order_id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunk">
                      <Initials name={o.customer_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-ink">{o.customer_name ?? "Customer"}</p>
                        <p className="truncate text-[12px] text-secondary tnum">
                          {l.length} {l.length === 1 ? "store" : "stores"} · {usd(o.total, 2)}
                        </p>
                      </div>
                      <Pill status={l[0]?.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4"><Satisfaction summary={reviewSummary} recent={recentReviews} /></div>
        <div className="xl:col-span-4">
          <FinanceSnapshot earned={Number(s?.cado_earned ?? 0)} owed={owed} paidOut={paidOut} />
        </div>
        <div className="xl:col-span-4"><TeamAndActivity team={team} activity={activity} /></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4"><Tasks tasks={tasks} /></div>
        <div className="xl:col-span-4"><OrdersByArea areas={areas} /></div>
        <div className="xl:col-span-4"><UpcomingOccasions occasions={occasions} /></div>
      </div>
    </div>
  );
}

/* ============================================================== pieces ==== */

async function topProductImages(supabase: Supa, top: { product_id: string }[]) {
  const ids = top.map((t) => t.product_id).filter(Boolean);
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("product_images")
    .select("product_id, storage_path, is_primary")
    .in("product_id", ids);
  const m = new Map<string, string>();
  for (const im of data ?? []) if (!m.has(im.product_id) || im.is_primary) m.set(im.product_id, im.storage_path);
  return m;
}

function BigKpi({
  tint, icon, label, value, d, spark,
}: {
  tint: Tint; icon: React.ReactNode; label: string; value: string;
  d: { pct: number; up: boolean } | null; spark: number[];
}) {
  return (
    <TintCard tint={tint} className="flex flex-col p-4">
      <div className="mb-3"><TintChip>{icon}</TintChip></div>
      <p className="text-[13px] font-medium text-secondary">{label}</p>
      <p className="mt-0.5 text-[28px] font-bold leading-8 text-ink tnum">{value}</p>
      <div className="mt-1 min-h-[18px]">
        {d ? (
          <span className="inline-flex items-center gap-0.5 text-[12px] font-medium tnum"
            style={{ color: d.up ? "var(--st-delivered)" : "var(--st-cancelled)" }}>
            {d.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(d.pct).toFixed(0)}% vs previous period
          </span>
        ) : (
          <span className="text-[12px] text-muted">No previous period yet</span>
        )}
      </div>
      <div className="mt-2"><Spark points={spark} /></div>
    </TintCard>
  );
}

function SmallKpi({
  tint, icon, label, value, note, live = false,
}: {
  tint: Tint; icon: React.ReactNode; label: string; value: string; note: string; live?: boolean;
}) {
  return (
    <TintCard tint={tint} className="p-3">
      <div className="flex items-center gap-2">
        <span className="tint-chip flex h-7 w-7 items-center justify-center rounded-[9px]">{icon}</span>
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-secondary">{label}</p>
        {live ? <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-status-green" /> : null}
      </div>
      <p className="mt-1.5 text-[22px] font-bold leading-7 text-ink tnum">{value}</p>
      <p className="truncate text-[11px] text-muted">{note}</p>
    </TintCard>
  );
}

function TopProducts({
  top, images, supabaseUrl,
}: {
  top: { product_id: string; title: string; partner_name: string; units: number; revenue: number }[];
  images: Map<string, string>;
  supabaseUrl: string;
}) {
  const url = (p: string) => `${supabaseUrl}/storage/v1/object/public/${p.replace(/^\/+/, "")}`;
  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">Top selling products</h2>
      </div>
      {top.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13.5px] text-secondary">No sales in this range yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {top.map((p, i) => {
            const img = images.get(p.product_id);
            return (
              <li key={p.product_id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-4 shrink-0 text-[12px] font-semibold text-muted tnum">{i + 1}</span>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url(img)} alt="" className="h-10 w-10 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunk text-muted">
                    <Gift size={15} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-ink">{p.title}</p>
                  <p className="truncate text-[12px] text-secondary">{p.partner_name}</p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-semibold text-ink tnum">{p.units} sold</span>
                  <span className="block text-[11px] text-muted tnum">{usd(p.revenue)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function OrdersByArea({ areas }: { areas: { area: string; orders: number }[] }) {
  const total = areas.reduce((n, a) => n + Number(a.orders), 0);
  const tints = ["--tint-coral", "--tint-amber", "--tint-mint", "--tint-sky", "--tint-rose", "--tint-violet"];
  return (
    <section className="h-full rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">Orders by area</h2>
        <span className="text-[12px] text-muted tnum">{total} total</span>
      </div>
      {areas.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13.5px] text-secondary">No orders in this range.</p>
      ) : (
        <ul className="space-y-3 p-4">
          {areas.slice(0, 6).map((a, i) => {
            const pct = total ? (Number(a.orders) / total) * 100 : 0;
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
  );
}

function UpcomingOccasions({ occasions }: { occasions: { id: string; title: string; event_date: string }[] }) {
  return (
    <section className="h-full rounded-card border border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">Upcoming occasions</h2>
        <Link href="/admin/marketing" className="text-[12.5px] font-medium text-ribbon">+ Add</Link>
      </div>
      {occasions.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[13.5px] text-secondary">No dated occasions yet</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[12px] text-muted">
            Add Mother&rsquo;s Day or Valentine&rsquo;s with a date and CADO can push them here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {occasions.slice(0, 3).map((o) => {
            const d = new Date(o.event_date);
            return (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[12px]"
                  style={{ background: "color-mix(in srgb, var(--tint-rose) 16%, transparent)", color: "var(--tint-rose)" }}>
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
  );
}
