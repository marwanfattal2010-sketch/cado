import { Link, useNavigate } from "react-router-dom";
import { useOrders, useReorder } from "../hooks/useOrders";
import { useAuth } from "../lib/auth";
import { formatMoney } from "../lib/money";
import { statusView } from "../lib/orderStatus";
import { productImageUrl } from "../lib/images";
import { ButtonLink, useToast } from "../components/ui";
import { Img } from "../components/Img";
import { Skeleton } from "../components/Skeleton";

/**
 * Order history, one card per order. One order = one store (trigger-enforced
 * since 0046), so a card is a store's card without any grouping gymnastics.
 *
 * Current orders float to the top under their own label with a persimmon
 * left accent — the ones a person actually opens this page for. The past is
 * below, newest first, quiet.
 */
export function Orders() {
  const { session } = useAuth();
  const orders = useOrders();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Your orders</h1>
        <p className="mt-2 text-body text-muted">Log in to see your orders.</p>
        <ButtonLink to="/login" variant="accent" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const list = orders.data ?? [];
  const current = list.filter((o) => statusView(o.sub_orders?.[0]?.status, o.recipient_name).active);
  const past = list.filter((o) => !statusView(o.sub_orders?.[0]?.status, o.recipient_name).active);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">Your orders</h1>

      {orders.isLoading ? (
        <div className="mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[130px] w-full rounded-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-body text-muted">No orders yet.</p>
          <ButtonLink to="/" variant="accent" className="mt-6">
            Start shopping
          </ButtonLink>
        </div>
      ) : (
        <>
          {current.length > 0 ? (
            <section className="mt-6">
              <p className="text-eyebrow uppercase text-muted">Current</p>
              <div className="mt-2 flex flex-col gap-3">
                {current.map((o) => (
                  <OrderCard key={o.id} order={o} prominent />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="mt-7">
              <p className="text-eyebrow uppercase text-muted">Past orders</p>
              <div className="mt-2 flex flex-col gap-3">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
      {/* Clear of the pinned bottom nav. */}
      <div className="h-24" />
    </div>
  );
}

type OrderRow = NonNullable<ReturnType<typeof useOrders>["data"]>[number];

const THUMBS_SHOWN = 4;

function OrderCard({ order, prominent = false }: { order: OrderRow; prominent?: boolean }) {
  const navigate = useNavigate();
  const reorder = useReorder();
  const toast = useToast();

  const sub = order.sub_orders?.[0];
  const view = statusView(sub?.status, order.recipient_name);
  const items = sub?.order_items ?? [];
  const extra = Math.max(0, items.length - THUMBS_SHOWN);
  const when = new Date(order.created_at);

  const doReorder = async (e: React.MouseEvent) => {
    // The whole card navigates; this button must not.
    e.stopPropagation();
    try {
      const r = await reorder.mutateAsync(items);
      if (r.added === r.total) {
        toast(`Added ${r.added} item${r.added === 1 ? "" : "s"} to your cart`, {
          label: "View cart",
          to: "/cart",
        });
      } else {
        toast(
          `Added ${r.added} of ${r.total} items — ${r.skippedTitles.join(", ")} ${
            r.skippedTitles.length === 1 ? "is" : "are"
          } no longer available.`,
          { label: "View cart", to: "/cart" }
        );
      }
      navigate("/cart");
    } catch {
      toast("Couldn't reorder — try again.");
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/orders/${order.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/orders/${order.id}`);
      }}
      className={`cursor-pointer rounded-card border border-line bg-surface p-4 transition-transform duration-press ease-out active:scale-[0.98] ${
        prominent ? "border-l-4 border-l-persimmon" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-store-name">{sub?.partner?.name ?? "CADO"}</p>
          <p className="mt-0.5 text-caption text-muted">
            #{order.order_number} ·{" "}
            {when.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
            {when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`shrink-0 rounded-[4px] px-2 py-1 text-[11px] font-bold ${view.chip}`}>
          {view.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {items.slice(0, THUMBS_SHOWN).map((it) => {
            const imgs = it.product?.product_images ?? [];
            const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
            return (
              <span key={it.id} className="h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-surface-sunk">
                {primary ? (
                  <Img src={productImageUrl(primary.storage_path)} className="h-full w-full object-cover" />
                ) : null}
              </span>
            );
          })}
          {extra > 0 ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-surface-sunk text-caption font-semibold text-muted">
              +{extra}
            </span>
          ) : null}
        </div>
        <p className="shrink-0 text-price">{formatMoney(order.total)}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={doReorder}
          disabled={reorder.isPending}
          className="tap-44 inline-flex h-10 items-center rounded-[4px] border border-persimmon px-4 text-caption font-semibold text-persimmon transition active:scale-[0.97] disabled:opacity-50"
        >
          {reorder.isPending ? "Adding…" : "Reorder"}
        </button>
        <Link
          to={`/orders/${order.id}`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Order details"
          className="text-muted"
        >
          ›
        </Link>
      </div>
    </div>
  );
}
