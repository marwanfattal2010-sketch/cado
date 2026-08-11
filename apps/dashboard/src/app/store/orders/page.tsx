import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";
import { ItemDecision } from "./ItemDecision";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

interface Item {
  id: string;
  product_title_snapshot: string;
  quantity: number;
  line_total: number;
  confirmation_status: string;
}

interface SubOrder {
  id: string;
  status: string;
  created_at: string;
  total: number;
  order_items: Item[];
}

interface DeliveryContext {
  order_number: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  address_city: string | null;
  address_area: string | null;
  address_street: string | null;
  address_building: string | null;
  address_notes: string | null;
  is_gift: boolean;
  gift_message: string | null;
  delivery_slot: string | null;
}

/**
 * The live feed. Orders needing a decision float to the top with Yes/No per
 * line; everything else is history below. RLS scopes the sub_orders read to
 * this store (the isolation test proves that claim); delivery details come
 * through partner_order_context(), which returns the delivery fields only —
 * a store never reads the orders table.
 */
export default async function StoreOrdersPage() {
  await requireStoreOwner();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("sub_orders")
    .select(
      "id, status, created_at, total, order_items(id, product_title_snapshot, quantity, line_total, confirmation_status)"
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const subOrders = (data ?? []) as unknown as SubOrder[];
  const needsAction = subOrders.filter((so) =>
    so.order_items.some((it) => it.confirmation_status === "pending") && so.status !== "cancelled"
  );
  const history = subOrders.filter((so) => !needsAction.includes(so));

  // Delivery context for actionable orders only — one RPC per card, capped by
  // the needsAction count, not the whole history.
  const contexts = new Map<string, DeliveryContext>();
  for (const so of needsAction.slice(0, 10)) {
    const { data: ctx } = await supabase.rpc("partner_order_context", { p_sub_order_id: so.id });
    const row = Array.isArray(ctx) ? ctx[0] : ctx;
    if (row) contexts.set(so.id, row as DeliveryContext);
  }

  return (
    <div>
      <AutoRefresh />
      <h1 className="mb-5 font-display text-h1 text-ink">{t("feed.title")}</h1>

      {subOrders.length === 0 ? (
        <EmptyState title={t("orders.empty.title")} body={t("orders.empty.body")} />
      ) : (
        <>
          {needsAction.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-status-amber">
                {t("feed.needsaction")} · {needsAction.length}
              </h2>
              <ul className="space-y-3">
                {needsAction.map((so) => (
                  <OrderCard key={so.id} so={so} ctx={contexts.get(so.id)} actionable />
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t("feed.history")}
              </h2>
              <ul className="space-y-3">
                {history.map((so) => (
                  <OrderCard key={so.id} so={so} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({
  so,
  ctx,
  actionable = false,
}: {
  so: SubOrder;
  ctx?: DeliveryContext;
  actionable?: boolean;
}) {
  return (
    <li
      className={`rounded-card border bg-surface p-4 shadow-rest ${
        actionable ? "border-status-amber" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {ctx?.order_number ? <span className="mr-2 font-medium text-ink">{ctx.order_number}</span> : null}
          {new Date(so.created_at).toLocaleString()}
        </p>
        <StatusBadge status={so.status} />
      </div>

      {ctx ? (
        <div className="mt-3 rounded-card bg-surface-sunk p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("feed.deliverto")}</p>
          <p className="mt-1 text-ink">
            {ctx.recipient_name ?? "—"}
            {ctx.recipient_phone ? ` · ${ctx.recipient_phone}` : ""}
          </p>
          <p className="text-muted">
            {[ctx.address_city, ctx.address_area, ctx.address_street, ctx.address_building]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          {ctx.delivery_slot ? <p className="text-muted">{ctx.delivery_slot}</p> : null}
          {ctx.address_notes ? <p className="mt-1 text-xs text-muted">“{ctx.address_notes}”</p> : null}
        </div>
      ) : null}

      <ul className="mt-3 space-y-3">
        {so.order_items.map((it) => (
          <li key={it.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
            <div className="flex justify-between text-sm">
              <span className="text-ink">
                {it.quantity}× {it.product_title_snapshot}
              </span>
              <span className="tabular-nums text-muted">${Number(it.line_total).toFixed(2)}</span>
            </div>
            {it.confirmation_status === "pending" && actionable ? (
              <ItemDecision itemId={it.id} />
            ) : it.confirmation_status === "confirmed" ? (
              <p className="mt-0.5 text-xs text-status-green">✓ {t("feed.confirmed")}</p>
            ) : it.confirmation_status === "rejected" ? (
              <p className="mt-0.5 text-xs text-status-red">✗ {t("feed.rejected")}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">${Number(so.total).toFixed(2)}</span>
      </div>
    </li>
  );
}
