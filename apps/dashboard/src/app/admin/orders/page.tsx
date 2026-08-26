import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { money } from "@/components/StatCard";
import { t } from "@/lib/dictionary";
import { StatusControl } from "./StatusControl";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface AdminOrderRow {
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
  sub_orders: Array<{
    sub_order_id: string;
    partner_name: string;
    status: string;
    total: number;
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      line_total: number;
      confirmation_status: string;
    }>;
  }>;
}

const PAGE_SIZE = 25;

/**
 * Every order across every store, via admin_orders() — the named, admin-gated
 * window that replaced blanket table access (0020/0036). Per-store status can
 * be advanced or cancelled; amounts are read-only by design.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { data, error } = await supabase.rpc("admin_orders", {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const orders = (data ?? []) as AdminOrderRow[];

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("admin.orders.title")}</h1>

      {error ? (
        <p className="text-sm text-status-red">{error.message}</p>
      ) : orders.length === 0 && page === 1 ? (
        <EmptyState title="No orders yet" body="Orders from every store will appear here." />
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.order_id} className="rounded-card border border-line bg-surface p-4 shadow-rest">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Link href={`/admin/orders/${o.order_id}`} className="font-semibold text-ribbon hover:underline">{o.order_number}</Link>
                    <span className="ml-2 text-sm text-muted">
                      {new Date(o.placed_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {t("admin.orders.customer")}: <span className="text-ink">{o.customer_name}</span>
                  </p>
                </div>

                <p className="mt-1 text-xs text-muted">
                  {o.payment_method} · {o.payment_status} · {t("overview.revenue")} {money(o.subtotal)}
                  {Number(o.discount) > 0 ? ` − ${money(o.discount)} gift card` : ""} + {money(o.delivery_fee)}{" "}
                  delivery = <span className="font-semibold text-ink">{money(o.total)}</span>
                </p>

                <div className="mt-3 space-y-3">
                  {o.sub_orders.map((so) => (
                    <div key={so.sub_order_id} className="rounded-card bg-surface-sunk p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{so.partner_name}</p>
                        <StatusBadge status={so.status} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {so.items.map((it) => (
                          <li key={it.id} className="flex justify-between text-sm">
                            <span>
                              {it.quantity}× {it.title}
                              {it.confirmation_status === "rejected" ? (
                                <span className="ml-2 text-xs font-semibold text-status-red">
                                  OUT OF STOCK
                                </span>
                              ) : it.confirmation_status === "pending" ? (
                                <span className="ml-2 text-xs text-status-amber">unconfirmed</span>
                              ) : null}
                            </span>
                            <span className="tabular-nums text-muted">{money(it.line_total)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 border-t border-line pt-2">
                        <StatusControl subOrderId={so.sub_order_id} status={so.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={`/admin/orders?page=${page - 1}`} className="font-medium text-ribbon">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            {orders.length === PAGE_SIZE ? (
              <Link href={`/admin/orders?page=${page + 1}`} className="font-medium text-ribbon">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  );
}
