import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, StatusPill, Card, usd } from "@/components/ui";
import { StatusControl } from "../StatusControl";

export const dynamic = "force-dynamic";

/**
 * One order, everything about it (spec 4.2).
 *
 * Admins cannot read orders/addresses directly — RLS there is
 * customer-own-rows, and the dashboard's read path is SECURITY DEFINER
 * functions. This page asks admin_order_detail() (0068); until that is
 * applied it falls back to admin_orders() — same money, fewer fields — and
 * says which mode it is in rather than pretending.
 *
 * Every money figure is a snapshot from purchase time. Nothing here
 * multiplies a price by a quantity.
 */

type DetailItem = {
  id: string;
  title: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  commission: number | null;
  variant: string | null;
};
type DetailSub = { id: string; status: string; partner_name: string | null; items: DetailItem[] };
type Detail = {
  id: string;
  order_number: string;
  created_at: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number | null;
  wallet_amount: number | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  gift_message: string | null;
  hide_price: boolean;
  delivery_slot: string | null;
  customer: { id: string; full_name: string | null; phone: string | null } | null;
  customer_orders: number;
  customer_lifetime: number;
  address: {
    recipient_name?: string;
    phone?: string;
    city?: string;
    area?: string;
    street?: string;
    building?: string;
  } | null;
  sub_orders: DetailSub[];
  events: {
    id: string;
    event_type: string;
    actor_role: string;
    from_status: string | null;
    to_status: string | null;
    message: string | null;
    created_at: string;
  }[];
};

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { id } = await params;

  let d: Detail | null = null;
  let reduced = false;

  const rpc = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
    }
  ).rpc("admin_order_detail", { p_order_id: id });

  if (!rpc.error && rpc.data) {
    d = rpc.data as Detail;
  } else {
    // Pre-0068 fallback: page through admin_orders until this id appears.
    reduced = true;
    for (let offset = 0; offset < 600 && !d; offset += 200) {
      const { data } = await supabase.rpc("admin_orders", { p_limit: 200, p_offset: offset });
      const rows = (data ?? []) as Array<{
        order_id: string;
        order_number: string;
        placed_at: string;
        customer_name: string;
        payment_method: string;
        payment_status: string;
        subtotal: number;
        delivery_fee: number;
        discount: number;
        total: number;
        sub_orders: unknown;
      }>;
      if (rows.length === 0) break;
      const hit = rows.find((r) => r.order_id === id);
      if (hit) {
        const subs = (hit.sub_orders ?? []) as Array<{
          sub_order_id: string;
          partner_name: string;
          status: string;
          items: Array<{ id: string; title: string; quantity: number; line_total: number }>;
        }>;
        d = {
          id: hit.order_id,
          order_number: hit.order_number,
          created_at: hit.placed_at,
          subtotal: hit.subtotal,
          delivery_fee: hit.delivery_fee,
          discount_amount: hit.discount,
          wallet_amount: null,
          total: hit.total,
          payment_method: hit.payment_method,
          payment_status: hit.payment_status,
          recipient_name: hit.customer_name,
          recipient_phone: null,
          gift_message: null,
          hide_price: false,
          delivery_slot: null,
          customer: null,
          customer_orders: 0,
          customer_lifetime: 0,
          address: null,
          sub_orders: subs.map((s) => ({
            id: s.sub_order_id,
            status: s.status,
            partner_name: s.partner_name,
            items: (s.items ?? []).map((i) => ({
              id: i.id,
              title: i.title,
              unit_price: 0,
              quantity: i.quantity,
              line_total: i.line_total,
              commission: null,
              variant: null,
            })),
          })),
          events: [],
        };
      }
    }
  }

  if (!d) notFound();

  const commission = d.sub_orders
    .flatMap((s) => s.items)
    .reduce((sum, i) => sum + Number(i.commission ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={`Order #${d.order_number}`}
        breadcrumb={[
          { label: "Orders", href: "/admin/orders" },
          { label: `#${d.order_number}`, href: `/admin/orders/${id}` },
        ]}
        action={<StatusPill status={d.sub_orders[0]?.status} />}
      />

      {reduced ? (
        <p className="mb-4 rounded-card bg-status-amber-tint px-3 py-2 text-xs text-status-amber">
          Reduced view — gift note, address, commission and timeline unlock when migration 0068 is applied.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {d.sub_orders.map((sub) => (
            <Card
              key={sub.id}
              title={sub.partner_name ?? "Store"}
              action={<StatusControl subOrderId={sub.id} status={sub.status} />}
            >
              <ul className="divide-y divide-line/60">
                {sub.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.title}</p>
                      <p className="text-xs text-muted">
                        {item.variant ? `${item.variant} · ` : ""}
                        {item.quantity}
                        {item.unit_price ? ` × ${usd(item.unit_price)}` : " item(s)"}
                        {item.commission != null ? ` · commission ${usd(item.commission)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{usd(item.line_total)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          <Card title="Timeline">
            <ol className="space-y-2">
              <li className="flex items-baseline gap-2 text-sm">
                <span className="text-xs tabular-nums text-muted">
                  {new Date(d.created_at).toLocaleString("en-GB")}
                </span>
                <span>Placed</span>
              </li>
              {d.events.map((e) => (
                <li key={e.id} className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {new Date(e.created_at).toLocaleString("en-GB")}
                  </span>
                  <span>
                    {e.event_type.replace(/_/g, " ")}
                    {e.to_status ? (
                      <>
                        {" → "}
                        <StatusPill status={e.to_status} />
                      </>
                    ) : null}
                    <span className="ml-1 text-xs text-muted">by {e.actor_role}</span>
                    {e.message ? <span className="ml-1 text-xs text-muted">— {e.message}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Money">
            <dl className="space-y-1.5 text-sm">
              <MoneyRow k="Subtotal" v={usd(d.subtotal)} />
              <MoneyRow k="Delivery fee" v={usd(d.delivery_fee)} />
              {Number(d.discount_amount) > 0 ? <MoneyRow k="Gift card" v={`−${usd(d.discount_amount)}`} /> : null}
              {Number(d.wallet_amount) > 0 ? <MoneyRow k="CADO balance" v={`−${usd(d.wallet_amount)}`} /> : null}
              <div className="border-t border-line pt-1.5">
                <MoneyRow k="Total" v={usd(d.total)} strong />
              </div>
              {commission > 0 ? <MoneyRow k="CADO commission" v={usd(commission)} /> : null}
              <MoneyRow k="Payment" v={`${d.payment_method ?? "—"} · ${d.payment_status ?? "unpaid"}`} />
            </dl>
          </Card>

          <Card title="Delivery">
            <dl className="space-y-1.5 text-sm">
              <MoneyRow k="Recipient" v={d.recipient_name ?? d.address?.recipient_name ?? "the buyer"} />
              <MoneyRow k="Phone" v={d.recipient_phone ?? d.address?.phone ?? "—"} />
              <MoneyRow
                k="Address"
                v={
                  [d.address?.street, d.address?.building, d.address?.area, d.address?.city]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <MoneyRow k="Window" v={d.delivery_slot ?? "—"} />
              {d.gift_message ? <MoneyRow k="Gift note" v={`“${d.gift_message}”`} /> : null}
              {d.hide_price ? <MoneyRow k="Price" v="HIDDEN from recipient" strong /> : null}
            </dl>
          </Card>

          <Card title="Customer">
            {d.customer ? (
              <div className="text-sm">
                <p className="font-medium text-ink">{d.customer.full_name ?? "Customer"}</p>
                <p className="text-xs text-muted">{d.customer.phone ?? ""}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {d.customer_orders} orders · lifetime {usd(d.customer_lifetime)}
                </p>
                <Link
                  href={`/admin/customers?focus=${d.customer.id}`}
                  className="mt-2 inline-block text-xs font-medium text-ribbon"
                >
                  View customer →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">{reduced ? "Unlocks with 0068." : "No account attached."}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MoneyRow({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right tabular-nums ${strong ? "font-semibold text-ink" : ""}`}>{v}</dd>
    </div>
  );
}
