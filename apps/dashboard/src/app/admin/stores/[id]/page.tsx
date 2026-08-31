import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, StatusPill, STORE_STATUS_LABEL, Card, KpiCard, EmptyStateV2, usd } from "@/components/ui";
import {
  setCommissionRate,
  setStoreStatus,
  markPayoutSent,
  approveApplication,
  rejectApplication,
  saveStoreSettings,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * One store, everything about it (§4.3).
 *
 * Sections are switched by ?tab= and rendered on the server — no client tab
 * state, so every panel is a fresh query against the caller's own admin
 * session and a link to a tab is a shareable URL.
 *
 * Where the numbers come from, and why:
 *
 *  - The four KPIs are admin_partner_totals() rows filtered to this store.
 *    That function is SECURITY DEFINER and sums the SNAPSHOTS on placed lines
 *    (order_items.line_total, commission_amount_snapshot) plus the pending
 *    store_payables ledger. This page never multiplies a live product price by
 *    a quantity, and never adds money up in React to present a total.
 *
 *  - Orders come from admin_orders(), also SECURITY DEFINER. They have to:
 *    migration 0020 deliberately dropped "admin full access to orders" and
 *    "admin full access to sub_orders", so an admin querying those tables
 *    through PostgREST correctly sees nothing. Listing individual rows the
 *    function returns is fine — they are stored snapshots.
 *
 *  - Products, profiles, partners and store_payables ARE readable directly by
 *    an admin ("admin full access to products/profiles/partners",
 *    "admin reads payables"), so those panels query the tables.
 */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "owner", label: "Owner" },
  { key: "finance", label: "Finance" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** The shape admin_orders() embeds in its sub_orders jsonb column. */
type EmbeddedSub = {
  sub_order_id: string;
  partner_id: string;
  partner_name: string;
  status: string;
  total: number;
  items: { id: string; title: string; quantity: number; line_total: number }[];
};
type AdminOrderRow = {
  order_id: string;
  order_number: string;
  placed_at: string;
  customer_name: string;
  payment_status: string;
  total: number;
  sub_orders: EmbeddedSub[];
};

/** This store's slice of every order it appears in, newest first. */
type StoreOrder = {
  subOrderId: string;
  orderId: string;
  orderNumber: string;
  placedAt: string;
  customerName: string;
  status: string;
  subTotal: number;
  itemCount: number;
};

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function AdminStoreDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; msg?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { id } = await params;
  const { tab: tabParam, msg } = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "overview") as TabKey;

  const { data: partner } = await supabase
    .from("partners")
    .select(
      "id, name, slug, status, is_live, city, description, commission_rate, tagline, is_featured, featured_rank, offers_gift_wrap, store_of_week, is_demo, pickup_address, driver_contact, application_text, applied_at, reviewed_at, rejection_reason, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!partner) notFound();

  const tabHref = (k: TabKey) => `/admin/stores/${id}?tab=${k}`;

  return (
    <div>
      <PageHeader
        title={partner.name}
        breadcrumb={[
          { label: "Stores", href: "/admin/stores" },
          { label: partner.name, href: `/admin/stores/${id}` },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={partner.status} label={STORE_STATUS_LABEL[partner.status]} />
            {partner.is_demo ? (
              <span className="rounded-pill bg-status-amber-tint px-2 py-0.5 text-[10px] font-bold tracking-wide text-status-amber">
                DEMO
              </span>
            ) : null}
            {/* §3.3: step into this store's own dashboard rather than keep a
                second login. The cookie names the store; it grants nothing. */}
            <form
              action={async () => {
                "use server";
                const { enterViewAs } = await import("../view-as/actions");
                await enterViewAs(id);
              }}
            >
              <button
                type="submit"
                className="rounded-pill border border-ribbon px-3 py-1.5 text-xs font-semibold text-ribbon transition-colors hover:bg-ribbon-tint"
              >
                View as store →
              </button>
            </form>
          </div>
        }
      />

      {msg ? (
        <p className="mb-4 rounded-card bg-ribbon-tint px-3 py-2 text-xs text-ribbon" role="status">
          {msg}
        </p>
      ) : null}

      {/* Tabs. Horizontally scrollable so all six reach at 375px. */}
      <nav className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.key
                  ? "bg-ribbon text-white"
                  : "border border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "overview" ? <OverviewTab supabase={supabase} id={id} /> : null}
      {tab === "products" ? <ProductsTab supabase={supabase} id={id} /> : null}
      {tab === "orders" ? <OrdersTab supabase={supabase} id={id} /> : null}
      {tab === "owner" ? (
        <OwnerTab
          supabase={supabase}
          id={id}
          status={partner.status}
          applicationText={partner.application_text}
          appliedAt={partner.applied_at}
          reviewedAt={partner.reviewed_at}
          rejectionReason={partner.rejection_reason}
        />
      ) : null}
      {tab === "finance" ? (
        <FinanceTab supabase={supabase} id={id} commissionRate={Number(partner.commission_rate)} />
      ) : null}
      {tab === "settings" ? <SettingsTab partner={partner} /> : null}
    </div>
  );
}

/* ============================================================== helpers === */

type Supa = Awaited<ReturnType<typeof createServerClient>>;

/**
 * This store's orders, from admin_orders().
 *
 * admin_orders() is not filterable by partner, so this pages through recent
 * orders and keeps the sub_orders belonging to this store. With the current
 * order table that is one round trip; the cap is stated on the page rather
 * than hidden, so a truncated list never reads as a complete one. When order
 * volume outgrows it the fix is a p_partner_id argument on the function, not
 * more paging here.
 */
const ORDER_SCAN_PAGE = 200;
const ORDER_SCAN_MAX = 600;

async function loadStoreOrders(
  supabase: Supa,
  partnerId: string
): Promise<{ orders: StoreOrder[]; truncated: boolean; failed: boolean }> {
  const out: StoreOrder[] = [];
  let scanned = 0;
  let exhausted = false;

  for (let offset = 0; offset < ORDER_SCAN_MAX; offset += ORDER_SCAN_PAGE) {
    const { data, error } = await supabase.rpc("admin_orders", {
      p_limit: ORDER_SCAN_PAGE,
      p_offset: offset,
    });
    if (error) return { orders: out, truncated: false, failed: true };

    const rows = (data ?? []) as unknown as AdminOrderRow[];
    scanned += rows.length;
    for (const o of rows) {
      for (const s of o.sub_orders ?? []) {
        if (s.partner_id !== partnerId) continue;
        out.push({
          subOrderId: s.sub_order_id,
          orderId: o.order_id,
          orderNumber: o.order_number,
          placedAt: o.placed_at,
          customerName: o.customer_name,
          status: s.status,
          subTotal: Number(s.total ?? 0),
          itemCount: (s.items ?? []).length,
        });
      }
    }
    if (rows.length < ORDER_SCAN_PAGE) {
      exhausted = true;
      break;
    }
  }

  return { orders: out, truncated: !exhausted && scanned >= ORDER_SCAN_MAX, failed: false };
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 min-h-[44px] w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm text-ink"
      />
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="min-h-[44px] rounded-pill bg-ink px-4 py-2 text-sm font-semibold text-canvas"
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="text-right text-sm text-ink">{v}</dd>
    </div>
  );
}

/* ============================================================= overview === */

async function OverviewTab({ supabase, id }: { supabase: Supa; id: string }) {
  // The RPC is the single source for this store's money. Filtering its rows
  // to one partner is a lookup, not a recomputation.
  const { data: totalsData, error: totalsError } = await supabase.rpc("admin_partner_totals");
  const mine = (totalsData ?? []).find((p) => p.partner_id === id) ?? null;

  const { orders, truncated, failed } = await loadStoreOrders(supabase, id);
  const latest = orders.slice(0, 10);

  return (
    <div className="space-y-4">
      {totalsError || !mine ? (
        <Card title="Lifetime figures">
          <p className="text-sm text-status-red">
            {totalsError
              ? `admin_partner_totals() failed: ${totalsError.message}`
              : "This store has no row in admin_partner_totals()."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Orders" value={String(mine.orders_count)} hint="Lifetime, excluding cancelled" />
          <KpiCard label="Revenue" value={usd(mine.gross_revenue)} hint="Sum of line snapshots" />
          <KpiCard label="CADO commission" value={usd(mine.commission)} hint="Snapshot at purchase" />
          <KpiCard label="Payable to store" value={usd(mine.payable_pending)} hint="Ledger rows not yet paid" />
        </div>
      )}

      <Card
        title="Latest orders"
        action={
          orders.length > 10 ? (
            <Link href={`/admin/stores/${id}?tab=orders`} className="text-xs font-medium text-ribbon">
              All {orders.length} →
            </Link>
          ) : null
        }
      >
        {failed ? (
          <p className="text-sm text-status-red">Orders could not be read for this store.</p>
        ) : latest.length === 0 ? (
          <EmptyStateV2 title="No orders for this store yet." />
        ) : (
          <OrderTable rows={latest} />
        )}
        {truncated ? (
          <p className="mt-3 text-[11px] text-muted">
            Scanned the {ORDER_SCAN_MAX} most recent orders across all stores; older ones are not counted here.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function OrderTable({ rows }: { rows: StoreOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Placed</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3 text-right">Items</th>
            <th className="py-2 text-right">This store</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.subOrderId} className="border-b border-line/60 last:border-0">
              <td className="py-2 pr-3">
                <Link href={`/admin/orders/${o.orderId}`} className="font-medium text-ribbon">
                  #{o.orderNumber}
                </Link>
                <span className="block text-[11px] text-muted">{o.customerName}</span>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">{dt(o.placedAt)}</td>
              <td className="py-2 pr-3">
                <StatusPill status={o.status} />
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted">{o.itemCount}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{usd(o.subTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================= products === */

async function ProductsTab({ supabase, id }: { supabase: Supa; id: string }) {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, price, compare_at_price, is_active, review_status, stock_quantity")
    .eq("partner_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = data ?? [];

  return (
    <Card title={`Products${rows.length ? ` · ${rows.length}` : ""}`}>
      {error ? (
        <p className="text-sm text-status-red">{error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyStateV2 title="This store has no products yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3 text-right">Price</th>
                <th className="py-2 pr-3 text-right">Stock</th>
                <th className="py-2 pr-3">On storefront</th>
                <th className="py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">{p.title}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {usd(p.price)}
                    {p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price) ? (
                      <span className="ml-1 text-[11px] text-muted line-through">
                        {usd(p.compare_at_price)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">{p.stock_quantity}</td>
                  <td className="py-2 pr-3">
                    {/* products has no `status` column — visibility is is_active. */}
                    <span
                      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                        p.is_active
                          ? "bg-status-green-tint text-status-green"
                          : "bg-status-grey-tint text-status-grey"
                      }`}
                    >
                      {p.is_active ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="py-2">
                    <StatusPill status={p.review_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* =============================================================== orders === */

async function OrdersTab({ supabase, id }: { supabase: Supa; id: string }) {
  const { orders, truncated, failed } = await loadStoreOrders(supabase, id);

  return (
    <Card title={`Orders${orders.length ? ` · ${orders.length}` : ""}`}>
      {failed ? (
        <p className="text-sm text-status-red">
          admin_orders() refused this request. Orders are readable only through that function — migration
          0020 removed the admin policies on orders and sub_orders on purpose.
        </p>
      ) : orders.length === 0 ? (
        <EmptyStateV2 title="No orders for this store yet." />
      ) : (
        <OrderTable rows={orders} />
      )}
      {truncated ? (
        <p className="mt-3 text-[11px] text-muted">
          Scanned the {ORDER_SCAN_MAX} most recent orders across all stores; older ones are not listed.
        </p>
      ) : null}
    </Card>
  );
}

/* ================================================================ owner === */

async function OwnerTab({
  supabase,
  id,
  status,
  applicationText,
  appliedAt,
  reviewedAt,
  rejectionReason,
}: {
  supabase: Supa;
  id: string;
  status: string;
  applicationText: string | null;
  appliedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}) {
  const { data: people, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, store_role, created_at")
    .eq("partner_id", id)
    .order("created_at");

  // profiles has no email column — the login address lives in auth.users,
  // which the dashboard cannot read directly. admin_partner_totals() exposes
  // the store's first partner-role login, so that is the honest source.
  const { data: totalsData } = await supabase.rpc("admin_partner_totals");
  const ownerEmail = (totalsData ?? []).find((p) => p.partner_id === id)?.owner_email ?? null;

  const rows = people ?? [];

  return (
    <div className="space-y-4">
      {status === "pending" ? (
        <Card title="Application awaiting your decision">
          <p className="text-xs text-muted">Applied {dt(appliedAt)}</p>
          {applicationText ? (
            <p className="mt-2 whitespace-pre-line rounded-card bg-status-amber-tint p-3 text-sm text-ink">
              {applicationText}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              This store applied without writing a pitch. Nothing was submitted for application_text.
            </p>
          )}

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <form action={approveApplication}>
              <input type="hidden" name="partnerId" value={id} />
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-pill bg-status-green px-4 py-2 text-sm font-semibold text-canvas sm:w-auto"
              >
                Approve — make this store active
              </button>
            </form>

            <form action={rejectApplication} className="space-y-2">
              <input type="hidden" name="partnerId" value={id} />
              <Field
                label="Reason for rejecting"
                name="reason"
                placeholder="Say why, briefly."
                hint="Recorded on the store as rejection_reason, with who decided and when."
              />
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-pill border border-status-red px-4 py-2 text-sm font-semibold text-status-red sm:w-auto"
              >
                Reject
              </button>
            </form>
          </div>
        </Card>
      ) : null}

      {status === "rejected" && rejectionReason ? (
        <Card title="Rejected">
          <p className="text-xs text-muted">Decided {dt(reviewedAt)}</p>
          <p className="mt-2 whitespace-pre-line rounded-card bg-status-red-tint p-3 text-sm text-ink">
            {rejectionReason}
          </p>
        </Card>
      ) : null}

      <Card title="Owner login">
        {ownerEmail ? (
          <p className="text-sm text-ink">{ownerEmail}</p>
        ) : (
          <p className="text-sm text-muted">
            No login is attached to this store yet — invite one from Invitations.
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted">
          The store&rsquo;s first partner-role account. Email addresses live in auth, not in profiles.
        </p>
      </Card>

      <Card title={`People on this store${rows.length ? ` · ${rows.length}` : ""}`}>
        {error ? (
          <p className="text-sm text-status-red">{error.message}</p>
        ) : rows.length === 0 ? (
          <EmptyStateV2 title="No accounts are attached to this store yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">In store</th>
                  <th className="py-2">Account role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-ink">{p.full_name ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted">{p.phone ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{p.store_role}</td>
                    <td className="py-2 capitalize text-muted">{p.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================== finance === */

async function FinanceTab({
  supabase,
  id,
  commissionRate,
}: {
  supabase: Supa;
  id: string;
  commissionRate: number;
}) {
  // store_id, not partner_id — this table is the exception.
  const { data: payablesData, error } = await supabase
    .from("store_payables")
    .select(
      "id, order_id, gross_amount, commission_rate, commission_amount, net_owed, status, paid_at, paid_method, paid_reference, created_at"
    )
    .eq("store_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  const payables = payablesData ?? [];
  const outstanding = payables.filter((p) => p.status === "pending");

  // The figure shown as "outstanding" is the RPC's, not a sum taken here.
  const { data: totalsData } = await supabase.rpc("admin_partner_totals");
  const payablePending = (totalsData ?? []).find((p) => p.partner_id === id)?.payable_pending ?? null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <Card title="Commission">
        <p className="text-sm text-ink">
          CADO currently takes{" "}
          <span className="font-semibold tabular-nums">{(commissionRate * 100).toFixed(1)}%</span> of this
          store&rsquo;s sales.
        </p>
        <form action={setCommissionRate} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="partnerId" value={id} />
          <div className="w-32">
            <Field
              label="New rate (%)"
              name="percent"
              type="number"
              defaultValue={(commissionRate * 100).toFixed(1)}
            />
          </div>
          <SubmitButton>Save rate</SubmitButton>
        </form>
        <p className="mt-2 text-[11px] text-muted">
          Applies to future orders only. Every placed line already carries the rate and commission it was
          bought at, so nothing on a past order moves.
        </p>
      </Card>

      <Card title="Mark payout sent">
        {outstanding.length === 0 ? (
          <p className="text-sm text-muted">Nothing is outstanding for this store right now.</p>
        ) : payablePending == null ? (
          /* Rows are outstanding but the RPC did not return a total. Show the
             count, not a figure — a money amount we could not verify is worse
             than no money amount. */
          <p className="text-sm text-status-red">
            {outstanding.length} ledger row{outstanding.length === 1 ? "" : "s"} outstanding, but
            admin_partner_totals() returned no total for this store. Not offering a payout until that
            figure can be read.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink">
              <span className="font-semibold tabular-nums">{usd(payablePending)}</span> across{" "}
              {outstanding.length} ledger row{outstanding.length === 1 ? "" : "s"} is owed to this store.
            </p>
            <form action={markPayoutSent} className="mt-3 space-y-3">
              <input type="hidden" name="partnerId" value={id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Date sent" name="paidOn" type="date" defaultValue={today} />
                <label className="block">
                  <span className="text-xs font-medium text-muted">Method</span>
                  <select
                    name="method"
                    defaultValue="cash"
                    className="mt-1 min-h-[44px] w-full rounded-card border border-line bg-canvas px-3 py-2 text-sm text-ink"
                  >
                    <option value="cash">Cash</option>
                    <option value="whish">Whish</option>
                    <option value="bank">Bank</option>
                  </select>
                </label>
                <Field label="Reference" name="reference" placeholder="Optional" />
              </div>
              <SubmitButton>Mark {usd(payablePending)} as sent</SubmitButton>
            </form>
            <p className="mt-2 text-[11px] text-muted">
              The amount is not typed in — it is the sum the ledger already holds. This marks the
              outstanding rows paid and is recorded in the audit log. Nothing is deleted, and running it
              twice changes nothing the second time.
            </p>
          </>
        )}
      </Card>

      <Card title={`Payout history${payables.length ? ` · ${payables.length}` : ""}`}>
        {error ? (
          <p className="text-sm text-status-red">{error.message}</p>
        ) : payables.length === 0 ? (
          <EmptyStateV2 title="No payouts recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3 text-right">Gross</th>
                  <th className="py-2 pr-3 text-right">Commission</th>
                  <th className="py-2 pr-3 text-right">Net owed</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2">Sent</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      {p.order_id ? (
                        <Link href={`/admin/orders/${p.order_id}`} className="text-ribbon">
                          View order
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      <span className="block text-[11px] text-muted">{dt(p.created_at)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{usd(p.gross_amount)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ribbon">
                      {usd(p.commission_amount)}
                      <span className="block text-[11px] text-muted">
                        {(Number(p.commission_rate) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{usd(p.net_owed)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                          p.status === "paid"
                            ? "bg-status-green-tint text-status-green"
                            : "bg-status-amber-tint text-status-amber"
                        }`}
                      >
                        {p.status === "paid" ? "Sent" : "Outstanding"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted">
                      {p.paid_at ? (
                        <>
                          {dt(p.paid_at)}
                          <span className="block">
                            {p.paid_method ?? "—"}
                            {p.paid_reference ? ` · ${p.paid_reference}` : ""}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================= settings === */

function SettingsTab({
  partner,
}: {
  partner: {
    id: string;
    status: string;
    is_live: boolean;
    tagline: string | null;
    is_featured: boolean;
    featured_rank: number | null;
    store_of_week: boolean;
    pickup_address: string | null;
    driver_contact: string | null;
    offers_gift_wrap: boolean;
    slug: string;
    city: string | null;
  };
}) {
  const lifecycle: { key: "active" | "paused" | "closed"; label: string; note: string }[] = [
    { key: "active", label: "Active", note: "Listed and shoppable." },
    {
      key: "paused",
      label: "Paused",
      note: "Hides the store and its products from the storefront. Nothing is deleted — products, orders and payouts stay exactly as they are, and reactivating brings the catalogue back unchanged.",
    },
    {
      key: "closed",
      label: "Closed",
      note: "Same as paused, but says the store is gone for good. Still reversible; still nothing deleted.",
    },
  ];

  return (
    <div className="space-y-4">
      <Card title="Store status">
        <div className="space-y-2">
          {lifecycle.map((s) => (
            <form
              key={s.key}
              action={setStoreStatus}
              className={`flex flex-wrap items-center gap-3 rounded-card border p-3 ${
                partner.status === s.key ? "border-ribbon bg-ribbon-tint" : "border-line bg-surface-sunk"
              }`}
            >
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="status" value={s.key} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{s.label}</p>
                <p className="text-[11px] text-muted">{s.note}</p>
              </div>
              {partner.status === s.key ? (
                <span className="text-xs font-semibold text-ribbon">Current</span>
              ) : (
                <button
                  type="submit"
                  className="min-h-[40px] shrink-0 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Set {s.label.toLowerCase()}
                </button>
              )}
            </form>
          ))}
        </div>
      </Card>

      <form action={saveStoreSettings} className="space-y-4">
        <input type="hidden" name="partnerId" value={partner.id} />

        <Card title="Storefront placement">
          <div className="space-y-3">
            <Field
              label="Tagline"
              name="tagline"
              defaultValue={partner.tagline ?? ""}
              placeholder="One line shown under the store name."
            />
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={partner.is_featured}
                className="h-5 w-5 rounded border-line"
              />
              <span className="text-sm text-ink">Featured on the homepage</span>
            </label>
            <div className="w-40">
              <Field
                label="Featured rank"
                name="featured_rank"
                type="number"
                defaultValue={partner.featured_rank == null ? "" : String(partner.featured_rank)}
                hint="Lower sorts first. Blank to clear."
              />
            </div>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="store_of_week"
                defaultChecked={partner.store_of_week}
                className="h-5 w-5 rounded border-line"
              />
              <span className="text-sm text-ink">Store of the week</span>
            </label>
          </div>
        </Card>

        <Card title="Pickup and driver">
          <div className="space-y-3">
            <Field
              label="Pickup address"
              name="pickup_address"
              defaultValue={partner.pickup_address ?? ""}
              placeholder="Where a driver collects from."
            />
            <Field
              label="Driver contact"
              name="driver_contact"
              defaultValue={partner.driver_contact ?? ""}
              placeholder="Phone the driver calls."
            />
          </div>
        </Card>

        <SubmitButton>Save settings</SubmitButton>
      </form>

      <Card title="Read-only">
        <dl className="divide-y divide-line/60">
          <Row k="Slug" v={<code className="text-xs">{partner.slug}</code>} />
          <Row k="City" v={partner.city ?? "—"} />
          <Row k="Shoppable (is_live)" v={partner.is_live ? "Yes" : "No"} />
          <Row k="Offers gift wrap" v={partner.offers_gift_wrap ? "Yes" : "No"} />
        </dl>
        <p className="mt-2 text-[11px] text-muted">
          Slug is locked by the 0026 trigger and changing it would break existing storefront links. Gift
          wrap and is_live are owned by other screens.
        </p>
      </Card>
    </div>
  );
}
