import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

/**
 * Store owner's order list. Every query here runs as the logged-in user, so
 * RLS ("customer reads own sub_orders" OR partner_id = my_partner_id()) is what
 * scopes it to this store — there is no partner_id filter in the code, and
 * there deliberately isn't one: the isolation is the database's job.
 */
export default async function StoreOrdersPage() {
  await requireStoreOwner();
  const supabase = await createServerClient();

  const { data: subOrders } = await supabase
    .from("sub_orders")
    .select(
      "id, status, created_at, total, delivery_date, order_items(id, product_title_snapshot, quantity, line_total, confirmation_status)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("orders.title")}</h1>

      {!subOrders || subOrders.length === 0 ? (
        <EmptyState title={t("orders.empty.title")} body={t("orders.empty.body")} />
      ) : (
        <ul className="space-y-3">
          {subOrders.map((so) => {
            const items = (so.order_items ?? []) as Array<{
              id: string;
              product_title_snapshot: string;
              quantity: number;
              line_total: number;
              confirmation_status: string;
            }>;
            return (
              <li
                key={so.id}
                className="rounded-card border border-line bg-surface p-4 shadow-rest"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {new Date(so.created_at).toLocaleDateString()}
                  </p>
                  <StatusBadge status={so.status} />
                </div>
                <ul className="mt-3 space-y-1">
                  {items.map((it) => (
                    <li key={it.id} className="flex justify-between text-sm">
                      <span className="text-ink">
                        {it.quantity}× {it.product_title_snapshot}
                        {it.confirmation_status === "pending" && (
                          <span className="ml-2 text-xs text-status-amber">
                            · {t("orders.item.awaiting")}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-muted">
                        ${Number(it.line_total).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">${Number(so.total).toFixed(2)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
