import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  Panel, PageHeading, Kpi, StatusPill, Empty, usd, usdShort,
  RangeBar, resolveRange, type RangeKey, btnGhost,
} from "@/components/v3/primitives";
import { RevenueChart } from "@/components/v3/RevenueChart";
import { LiveOrders } from "@/components/v3/LiveOrders";
import { AssistantPanel } from "@/components/v3/AssistantPanel";
import { callRpc, isMissingFunction } from "@/lib/rpc";

export const dynamic = "force-dynamic";

/**
 * HOME (§4) — the screen that runs the business.
 *
 * Everything here comes from SECURITY DEFINER RPCs. Admins have no read policy
 * on orders / sub_orders / order_items (0020 dropped them on purpose), and
 * PostgREST answers a blocked select with an EMPTY ARRAY rather than an error —
 * which is how the old Overview came to show $0 revenue above a chart of that
 * same range's orders. If a figure here is ever zero, it is because nothing
 * happened, not because something was hidden.
 *
 * Nothing on this page is invented. No sample rows, no placeholder avatars, no
 * "+18% vs last week" where there is no last week: when the previous period has
 * no data the KPI says "No previous data" and the delta is omitted entirely.
 */

type HomeSummary = {
  gmv: number; orders: number; commission: number; delivery_fees: number;
  cado_earned: number; avg_order_value: number; active_customers: number;
  owed_to_stores: number;
  prev_gmv: number; prev_orders: number; prev_commission: number;
  prev_delivery_fees: number; prev_cado_earned: number;
  prev_avg_order_value: number; prev_active_customers: number;
  had_previous: boolean;
};
type DayRow = { day: string; gmv: number; orders: number; commission: number; delivery_fees: number };
type TopProduct = { product_id: string; title: string; partner_name: string; units: number; revenue: number };
type StoreRow = { partner_id: string; name: string; orders: number; sales: number; commission: number; payable: number };

const greeting = () => {
  // Marwan runs this from Beirut; the greeting should match his clock, not the
  // server's.
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Beirut" }).format(new Date())
  );
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireAdmin();
  const supabase = await createServerClient();
  const { range } = await searchParams;
  const r = resolveRange(range, "today");
  const iso = (d: Date) => d.toISOString();

  const [summaryRes, dailyRes, topProductsRes, byStoreRes, ordersRes, pendingStoresRes, oosRes, ticketsRes, featuredRes, sowRes] =
    await Promise.all([
      // 0074 — via callRpc until it is applied and the types are regenerated.
      callRpc<HomeSummary[]>(supabase, "admin_home_summary", { p_from: iso(r.from), p_to: iso(r.to) }),
      supabase.rpc("admin_finance_breakdown", {
        p_from: r.from.toISOString().slice(0, 10),
        p_to: r.to.toISOString().slice(0, 10),
      }),
      callRpc<TopProduct[]>(supabase, "admin_top_products", { p_from: iso(r.from), p_to: iso(r.to), p_limit: 5 }),
      supabase.rpc("admin_finance_by_store", {
        p_from: r.from.toISOString().slice(0, 10),
        p_to: r.to.toISOString().slice(0, 10),
      }),
      supabase.rpc("admin_orders", { p_limit: 200, p_offset: 0 }),
      supabase.from("partners").select("id, name").eq("status", "pending").limit(20),
      supabase.from("products").select("id, title").eq("is_active", true).eq("stock_quantity", 0).limit(20),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("partners").select("id, name, tagline").eq("is_featured", true).order("featured_rank").limit(6),
      supabase.from("partners").select("id, name").eq("store_of_week", true).limit(3),
    ]);

  // 0074 may not be applied yet; say so rather than render zeroes.
  const summaryMissing = isMissingFunction(summaryRes.error);
  const s = (summaryRes.data ?? [])[0] ?? null;
  const days = (dailyRes.data ?? []) as DayRow[];
  const topProducts = topProductsRes.data ?? [];
  const topStores = ((byStoreRes.data ?? []) as StoreRow[]).slice(0, 5);

  type Sub = { sub_order_id?: string; status: string; partner_name: string };
  type OrderRow = {
    order_id: string; order_number: string; placed_at: string;
    customer_name: string | null; total: number; sub_orders: Sub[];
  };
  const allOrders = (ordersRes.data ?? []) as unknown as OrderRow[];

  /* --------------------------------------------------- needs attention --- */
  const now = Date.now();
  const hrs = (iso: string) => (now - new Date(iso).getTime()) / 3_600_000;

  const unconfirmed = allOrders.filter(
    (o) => hrs(o.placed_at) > 2 && (o.sub_orders ?? []).some((x) => x.status === "pending")
  );
  const stuckReady = allOrders.filter(
    (o) => hrs(o.placed_at) > 1 && (o.sub_orders ?? []).some((x) => x.status === "ready")
  );
  const pendingStores = pendingStoresRes.data ?? [];
  const outOfStock = oosRes.data ?? [];
  const openTickets = ticketsRes.count ?? 0;

  const attention = [
    { n: unconfirmed.length, label: "orders unconfirmed over 2 hours", href: "/admin/orders?view=needs-action" },
    { n: stuckReady.length, label: "parcels waiting for a driver", href: "/admin/delivery" },
    { n: pendingStores.length, label: "stores waiting for approval", href: "/admin/stores?status=pending" },
    { n: outOfStock.length, label: "products live with no stock", href: "/admin/products?stock=out" },
    { n: openTickets, label: "support messages open", href: "/admin/support" },
  ].filter((x) => x.n > 0);

  /* ------------------------------------------------------- delivery now -- */
  const countStatus = (st: string) =>
    allOrders.reduce((n, o) => n + (o.sub_orders ?? []).filter((x) => x.status === st).length, 0);
  const deliveredToday = allOrders.reduce(
    (n, o) =>
      n +
      (new Date(o.placed_at).toDateString() === new Date().toDateString()
        ? (o.sub_orders ?? []).filter((x) => x.status === "delivered").length
        : 0),
    0
  );

  const featured = featuredRes.data ?? [];
  const storesOfWeek = sowRes.data ?? [];
  const firstName = (user.fullName ?? "").split(" ")[0];

  return (
    <div>
      <PageHeading
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle="Everything that matters, right now."
        right={<RangeBar current={r.key as RangeKey} basePath="/admin" />}
      />

      {summaryMissing ? (
        <p className="mb-4 rounded-card border border-status-amber bg-status-amber-tint px-3 py-2 text-[13px] text-status-amber">
          The headline figures need migration 0074 applied. Everything else on this page is live.
        </p>
      ) : null}

      {/* KPI strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Revenue" value={usdShort(s?.gmv ?? 0)}
          current={s?.gmv} previous={s?.prev_gmv} hadPrevious={s?.had_previous}
          spark={days.map((d) => Number(d.gmv))}
        />
        <Kpi
          label="Orders" value={String(s?.orders ?? 0)} money={false}
          current={s?.orders} previous={s?.prev_orders} hadPrevious={s?.had_previous}
          spark={days.map((d) => Number(d.orders))}
        />
        <Kpi
          label="CADO earned" value={usdShort(s?.cado_earned ?? 0)}
          current={s?.cado_earned} previous={s?.prev_cado_earned} hadPrevious={s?.had_previous}
          hint={s ? `${usd(s.commission)} commission + ${usd(s.delivery_fees)} delivery` : undefined}
          spark={days.map((d) => Number(d.commission) + Number(d.delivery_fees))}
        />
        <Kpi
          label="Owed to stores" value={usdShort(s?.owed_to_stores ?? 0)}
          hint="Unpaid across all stores"
        />
        <Kpi
          label="Average order" value={usdShort(s?.avg_order_value ?? 0)}
          current={s?.avg_order_value} previous={s?.prev_avg_order_value} hadPrevious={s?.had_previous}
        />
        <Kpi
          label="Customers" value={String(s?.active_customers ?? 0)} money={false}
          current={s?.active_customers} previous={s?.prev_active_customers} hadPrevious={s?.had_previous}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Revenue over time" bodyClass="p-3">
            {days.length === 0 ? (
              <Empty title="No orders in this range." hint="Pick a longer range to see history." />
            ) : (
              <RevenueChart
                points={days.map((d) => ({
                  day: d.day,
                  gmv: Number(d.gmv),
                  earned: Number(d.commission) + Number(d.delivery_fees),
                }))}
              />
            )}
          </Panel>

          <Panel
            title="Live orders"
            bodyClass="p-0"
            action={<Link href="/admin/orders" className="text-[12px] font-medium text-ribbon">View all</Link>}
          >
            <LiveOrders initial={allOrders.slice(0, 8)} />
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Top products" bodyClass="p-0">
              {topProducts.length === 0 ? (
                <Empty title="Nothing sold in this range yet." />
              ) : (
                <ul className="divide-y divide-line">
                  {topProducts.map((p) => (
                    <li key={p.product_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">{p.title}</p>
                        <p className="truncate text-[11px] text-muted">{p.partner_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-ink tnum">{usdShort(p.revenue)}</p>
                        <p className="text-[11px] text-muted tnum">{p.units} sold</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Top stores" bodyClass="p-0">
              {topStores.length === 0 ? (
                <Empty title="No store sales in this range." />
              ) : (
                <ul className="divide-y divide-line">
                  {topStores.map((st) => (
                    <li key={st.partner_id}>
                      <Link
                        href={`/admin/stores/${st.partner_id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-sunk"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">{st.name}</p>
                          <p className="text-[11px] text-muted tnum">{st.orders} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-ink tnum">{usdShort(st.sales)}</p>
                          <p className="text-[11px] text-muted tnum">{usdShort(st.commission)} to CADO</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            title="Featured on the storefront"
            action={<Link href="/admin/marketing" className={btnGhost}>Edit</Link>}
          >
            {featured.length === 0 && storesOfWeek.length === 0 ? (
              <Empty
                title="Nothing featured yet."
                hint="Customers see a plain catalogue until you choose which stores to put first."
                action={<Link href="/admin/marketing" className="text-[13px] font-semibold text-ribbon">Choose featured stores →</Link>}
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Featured stores</p>
                  {featured.length === 0 ? (
                    <p className="text-[13px] text-muted">None</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {featured.map((f) => (
                        <span key={f.id} className="rounded-pill border border-line px-2.5 py-1 text-[12px] text-ink">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Store of the week</p>
                  <p className="text-[13px] text-ink">
                    {storesOfWeek.length ? storesOfWeek.map((x) => x.name).join(", ") : "—"}
                  </p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <AssistantPanel />

          <Panel title="Needs attention" bodyClass="p-0">
            {attention.length === 0 ? (
              <Empty title="All clear." />
            ) : (
              <ul className="divide-y divide-line">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-sunk"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-ribbon" />
                      <span className="text-[13px] font-semibold text-ink tnum">{a.n}</span>
                      <span className="text-[13px] text-secondary">{a.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Delivery now" bodyClass="p-0">
            <div className="grid grid-cols-3 divide-x divide-line">
              {[
                { n: countStatus("ready"), label: "Awaiting pickup" },
                { n: countStatus("out_for_delivery"), label: "With driver" },
                { n: deliveredToday, label: "Delivered today" },
              ].map((c) => (
                <Link key={c.label} href="/admin/delivery" className="px-3 py-3 text-center transition-colors hover:bg-surface-sunk">
                  <p className="text-[20px] font-bold text-ink tnum">{c.n}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{c.label}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
