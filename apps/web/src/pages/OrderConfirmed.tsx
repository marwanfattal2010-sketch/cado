import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatMoney } from "../lib/money";
import { RibbonBow } from "../components/ui";

type ConfirmState = { recipientName?: string; paymentMethod?: string };

const STEPS = ["Order placed", "Store is preparing it", "Out for delivery", "Delivered"];

function useOrder(id?: string) {
  return useQuery({
    queryKey: ["order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, total, payment_method, is_gift, recipient_name, recipient_phone, address_source, delivery_slot"
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function OrderConfirmed() {
  const { id } = useParams();
  const { state } = useLocation() as { state: ConfirmState | null };
  const order = useOrder(id);

  const o = order.data;
  const recipient = o?.recipient_name ?? state?.recipientName ?? "";
  const payment = o?.payment_method ?? state?.paymentMethod ?? "cod";
  const willAskRecipient = o?.address_source === "recipient_whatsapp";

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <RibbonBow className="mx-auto h-16 w-16 text-ink" />
      <h1 className="mt-4 font-display text-h1">
        {recipient ? `On its way to ${recipient}` : "Order placed"}
      </h1>
      {o?.order_number ? <p className="mt-1 text-caption text-muted">#{o.order_number}</p> : null}

      {/* What happens next, in the order it happens — the single most asked
          question after any Lebanese delivery order. */}
      <div className="mt-6 rounded-card bg-surface p-4 text-left shadow-rest">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3 py-1.5">
            <span className={`h-2.5 w-2.5 rounded-pill ${i === 0 ? "bg-primary" : "bg-surface-sunk"}`} />
            <span className={`text-body ${i === 0 ? "font-medium text-ink" : "text-muted"}`}>{step}</span>
          </div>
        ))}
      </div>

      {willAskRecipient ? (
        <p className="mt-4 rounded-card bg-today-tint px-3 py-2 text-caption font-medium text-today">
          We're messaging {recipient || "them"} on WhatsApp for the address. You don't need to do anything.
        </p>
      ) : null}

      <p className="mt-4 text-body text-muted">
        {payment === "cod"
          ? "Pay the driver when it arrives. We'll message you as the store confirms."
          : payment === "card"
            ? "We'll call you with a payment link, or you can pay the driver instead."
            : `Send ${formatMoney(o?.total)} to 81 900 002, then we'll get it moving.`}
      </p>

      {/* Ask once, at the only moment they're actually thinking about this
          person. It's a real reminder, not a marketing opt-in. */}
      {o?.is_gift ? (
        <div className="mt-8 rounded-card bg-ink p-5 text-left text-inverse">
          <p className="font-display text-h2">Want a nudge next year?</p>
          <p className="mt-1.5 text-body opacity-80">
            We'll remind you a week before {recipient ? `${recipient}'s` : "their"} birthday — no other
            messages.
          </p>
          <Link
            to={`/occasions?add=1&type=birthday${recipient ? `&name=${encodeURIComponent(recipient)}` : ""}`}
            className="mt-4 inline-flex h-11 items-center rounded-pill bg-canvas px-5 text-body font-medium text-ink"
          >
            Remind me
          </Link>
        </div>
      ) : null}

      <Link
        to="/orders"
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse"
      >
        Track this order
      </Link>
      <Link to="/" className="mt-3 inline-block text-caption text-muted underline">
        Continue shopping
      </Link>
    </div>
  );
}
