import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useOrders } from "../hooks/useOrders";
import { OrdersIcon } from "../components/Icons";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  out_for_delivery: "bg-gold/25 text-ink",
};

export function Orders() {
  const { session } = useAuth();
  const orders = useOrders();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <OrdersIcon className="mx-auto h-10 w-10 text-ink/20" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your orders</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to see your past orders.</p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  const list = orders.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Your orders</h1>

      {orders.isLoading ? (
        <p className="mt-8 text-sm text-ink/40">Loading...</p>
      ) : list.length === 0 ? (
        <div className="mt-16 text-center">
          <OrdersIcon className="mx-auto h-10 w-10 text-ink/20" />
          <p className="mt-4 text-sm text-ink/50">You haven't ordered anything yet.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
            Find a gift
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {list.map((order) => (
            <div key={order.id} className="rounded-2xl bg-white p-4 ring-1 ring-ink/5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">#{order.order_number}</span>
                <span className="text-xs text-ink/40">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>

              {(order.sub_orders ?? []).map((sub) => (
                <div key={sub.id} className="mt-3 border-t border-ink/8 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{sub.partner?.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        STATUS_STYLE[sub.status] ?? "bg-ink/8 text-ink/60"
                      }`}
                    >
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {(sub.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex justify-between text-sm text-ink/60">
                        <span className="truncate">
                          {item.quantity} × {item.product_title_snapshot}
                        </span>
                        <span className="shrink-0 pl-3">USD {Number(item.line_total).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="mt-3 flex justify-between border-t border-ink/8 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>USD {Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
