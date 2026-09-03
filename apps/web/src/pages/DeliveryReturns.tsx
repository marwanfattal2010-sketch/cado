import { AREAS, SAME_DAY_OPENS_HOUR } from "../lib/area";
import { cutoffLabel } from "../lib/deliveryPromise";

/** Each note is a fact the customer can hold CADO to, so they're written
 *  from the same constants the rest of the site uses rather than retyped. */
const NOTES = [
  {
    title: "Same-day delivery",
    body: `Order before ${cutoffLabel()} and it arrives the same day. Between ${cutoffLabel()} and ${SAME_DAY_OPENS_HOUR}AM you choose a delivery date instead — the earliest is tomorrow.`,
  },
  {
    title: "Where we deliver",
    body: `${AREAS.join(", ")}. If you're outside these, message us before ordering and we'll tell you honestly whether we can reach you.`,
  },
  {
    title: "Delivery fee",
    body: "A flat $5 per order, however many stores it comes from.",
  },
  {
    title: "Orders from several stores",
    body: "If your order includes items from more than one store, they may arrive as separate deliveries.",
  },
  {
    title: "Returns and exchanges",
    body: "Reach out with your order number and we'll coordinate with the store on your behalf.",
  },
];

export function DeliveryReturns() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">Delivery &amp; Returns</h1>
      <div className="mt-6 flex flex-col gap-3">
        {NOTES.map((n) => (
          <div key={n.title} className="rounded-card bg-surface p-4 shadow-rest">
            <p className="text-body font-medium">{n.title}</p>
            <p className="mt-1 text-body text-muted">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
