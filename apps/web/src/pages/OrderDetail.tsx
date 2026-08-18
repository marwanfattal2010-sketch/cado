import { useNavigate, useParams } from "react-router-dom";
import { useOrder, useReorder } from "../hooks/useOrders";
import { useAuth } from "../lib/auth";
import { formatMoney } from "../lib/money";
import { paymentLabel, statusView, TIMELINE_STEPS } from "../lib/orderStatus";
import { productImageUrl } from "../lib/images";
import { Button, ButtonLink, useToast } from "../components/ui";
import { Img } from "../components/Img";
import { Skeleton } from "../components/Skeleton";

/**
 * One order, fully told: what, where it is in the world, what it cost, and
 * how it was paid.
 *
 * TIMESTAMPS ARE SHOWN ONLY WHERE THE SCHEMA HOLDS ONE. "Placed" has
 * orders.created_at, so it shows a time. The later steps have NO per-step
 * timestamp columns — sub_orders carries only a status and a generic
 * updated_at that any edit can touch, and presenting that as "confirmed at"
 * would be a guess wearing a clock. So completed steps fill in persimmon
 * with no time attached.
 * TODO: show real per-step times when confirmed_at / picked_up_at /
 * delivered_at columns exist.
 *
 * TODO: driver info when driver system exists. The schema has no driver
 * fields on orders or sub_orders today, so there is no driver section — not
 * a hidden one, none — per the no-placeholder rule.
 */
export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const order = useOrder(id);
  const reorder = useReorder();
  const toast = useToast();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Your order</h1>
        <p className="mt-2 text-body text-muted">Log in to see it.</p>
        <ButtonLink to="/login" variant="accent" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  if (order.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-6">
        <Skeleton className="h-8 w-48 rounded-card" />
        <Skeleton className="mt-4 h-40 w-full rounded-card" />
        <Skeleton className="mt-4 h-64 w-full rounded-card" />
      </div>
    );
  }

  const o = order.data;
  if (!o) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-body text-muted">That order isn't here.</p>
        <ButtonLink to="/orders" className="mt-6">
          Your orders
        </ButtonLink>
      </div>
    );
  }

  const sub = o.sub_orders?.[0];
  const view = statusView(sub?.status);
  const items = sub?.order_items ?? [];
  const placed = new Date(o.created_at);
  const addr = o.address;
  const walletPaid = Number(o.wallet_amount ?? 0);
  const giftCardPaid = Number(o.discount_amount ?? 0);

  const doReorder = async () => {
    try {
      const r = await reorder.mutateAsync(items);
      if (r.added === r.total) {
        toast(`Added ${r.added} item${r.added === 1 ? "" : "s"} to your cart`);
      } else {
        toast(
          `Added ${r.added} of ${r.total} items — ${r.skippedTitles.join(", ")} ${
            r.skippedTitles.length === 1 ? "is" : "are"
          } no longer available.`
        );
      }
      navigate("/cart");
    } catch {
      toast("Couldn't reorder — try again.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-h1 text-store-name">{sub?.partner?.name ?? "CADO"}</h1>
          <p className="mt-1 text-caption text-muted">
            #{o.order_number} · {placed.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </p>
        </div>
        <span className={`mt-1 shrink-0 rounded-[4px] px-2 py-1 text-[11px] font-bold ${view.chip}`}>
          {view.label}
        </span>
      </div>

      {/* Timeline — or the single cancelled state. */}
      {view.cancelled ? (
        <div className="mt-6 rounded-card bg-surface-sunk px-4 py-3">
          <p className="text-body font-medium text-muted">This order was cancelled.</p>
        </div>
      ) : (
        <ol className="mt-6 flex items-start justify-between gap-1">
          {TIMELINE_STEPS.map((label, i) => {
            const done = i <= view.step;
            return (
              <li key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <span className="flex w-full items-center">
                  <span
                    className={`h-[3px] flex-1 ${i === 0 ? "opacity-0" : done ? "bg-persimmon" : "bg-line"}`}
                  />
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-pill ${done ? "bg-persimmon" : "border border-line bg-surface"}`}
                  />
                  <span
                    className={`h-[3px] flex-1 ${
                      i === TIMELINE_STEPS.length - 1 ? "opacity-0" : i < view.step ? "bg-persimmon" : "bg-line"
                    }`}
                  />
                </span>
                <span className={`text-[11px] font-medium ${done ? "text-ink" : "text-muted"}`}>{label}</span>
                {/* Only real timestamps. Placed is the one the schema holds. */}
                {i === 0 ? (
                  <span className="text-[10px] text-muted">
                    {placed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {/* Items */}
      <section className="mt-7">
        <p className="text-body font-medium">Items</p>
        <div className="mt-2 flex flex-col">
          {items.map((it) => {
            const imgs = it.product?.product_images ?? [];
            const primary = imgs.find((im) => im.is_primary) ?? imgs[0];
            return (
              <div key={it.id} className="flex items-center gap-3 border-b border-line py-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-surface-sunk">
                  {primary ? (
                    <Img src={productImageUrl(primary.storage_path)} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body">{it.product_title_snapshot}</p>
                  <p className="mt-0.5 text-caption text-muted">
                    {it.quantity} × {formatMoney(it.unit_price_snapshot)}
                  </p>
                </div>
                <p className="shrink-0 text-body font-semibold">{formatMoney(it.line_total)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment summary */}
      <section className="mt-7 rounded-card border border-line bg-surface p-4">
        <MoneyRow label="Subtotal" value={formatMoney(o.subtotal)} />
        <MoneyRow label="Delivery charge" value={formatMoney(o.delivery_fee)} />
        {giftCardPaid > 0 ? <MoneyRow label="Gift card" value={`-${formatMoney(giftCardPaid)}`} /> : null}
        {walletPaid > 0 ? <MoneyRow label="CADO balance" value={`-${formatMoney(walletPaid)}`} /> : null}
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <p className="text-body font-semibold">Total</p>
          <p className="text-price">{formatMoney(o.total)}</p>
        </div>
        <p className="mt-2 text-caption text-muted">Paid with: {paymentLabel(o.payment_method)}</p>
      </section>

      {/* Delivery */}
      {addr ? (
        <section className="mt-7">
          <p className="text-body font-medium">Delivery</p>
          <p className="mt-1 text-caption leading-relaxed text-muted">
            {[addr.recipient_name, addr.street, addr.building, addr.floor, addr.apartment, addr.area, addr.city]
              .filter(Boolean)
              .join(", ")}
          </p>
          {/* Delivered time: no delivered_at column exists yet, so no claim
              is made about when. TODO when the column arrives. */}
        </section>
      ) : null}

      {/* TODO: driver info when driver system exists. */}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={doReorder} disabled={reorder.isPending} variant="accent" fullWidth>
          {reorder.isPending ? "Adding…" : "Reorder"}
        </Button>
        <ButtonLink to="/help" fullWidth>
          Order support
        </ButtonLink>
      </div>
      {/* Clear of the pinned bottom nav. */}
      <div className="h-24" />
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <p className="text-caption text-muted">{label}</p>
      <p className="text-body">{value}</p>
    </div>
  );
}
