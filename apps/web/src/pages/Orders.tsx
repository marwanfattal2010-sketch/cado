import { useAuth } from "../lib/auth";
import { useOrders } from "../hooks/useOrders";
import { OrdersIcon } from "../components/Icons";
import { Skeleton } from "../components/Skeleton";
import { ButtonLink } from "../components/ui";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Tokens only — the old green-100/red-700 pills were raw Tailwind defaults
 *  and the only two colours on the site that weren't in the design system. */
const STATUS_STYLE: Record<string, string> = {
  out_for_delivery: "bg-today-tint text-today",
  delivered: "bg-today text-inverse",
  cancelled: "bg-alert/10 text-alert",
};

function OrdersSkeleton() {
  return (
    <div className="mt-5 flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-card bg-surface p-4 shadow-rest">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mt-4 h-4 w-2/5" />
          <Skeleton className="mt-2.5 h-4 w-4/5" />
          <Skeleton className="mt-2.5 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function Orders() {
  const { session } = useAuth();
  const orders = useOrders();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <OrdersIcon className="mx-auto h-10 w-10 text-muted" />
        <h1 className="mt-4 font-display text-h1">Your orders</h1>
        <p className="mt-2 text-body text-muted">Log in to follow an order from the store to the door.</p>
        <ButtonLink to="/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const list = orders.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="font-display text-h1">Your orders</h1>

      {orders.isLoading ? (
        <OrdersSkeleton />
      ) : orders.isError ? (
        <div className="mt-16 text-center">
          <p className="text-body text-muted">We couldn't load your orders just now.</p>
          <button
            onClick={() => orders.refetch()}
            className="mt-4 min-h-[44px] px-4 text-body font-medium text-ink underline"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-16 text-center">
          <OrdersIcon className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-body text-muted">No orders yet.</p>
          <ButtonLink to="/" className="mt-6">
            Browse gifts
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-5 flex animate-fade-in flex-col gap-4">
          {list.map((order) => (
            <div key={order.id} className="rounded-card bg-surface p-4 shadow-rest">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium">#{order.order_number}</span>
                <span className="text-caption text-muted">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>

              {(order.sub_orders ?? []).map((sub) => (
                <div key={sub.id} className="mt-3 border-t border-line pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-body font-medium">{sub.partner?.name}</span>
                    <span
                      className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-medium ${
                        STATUS_STYLE[sub.status] ?? "bg-surface-sunk text-muted"
                      }`}
                    >
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {(sub.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex justify-between text-body text-muted">
                        <span className="truncate">
                          {item.quantity} × {item.product_title_snapshot}
                        </span>
                        <span className="shrink-0 pl-3">USD {Number(item.line_total).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="mt-3 flex justify-between border-t border-line pt-3 text-body font-semibold">
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
