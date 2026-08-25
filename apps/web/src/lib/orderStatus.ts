/**
 * One place that knows what an order status means, for the list chips and
 * the detail timeline both — so the chip and the timeline can never disagree
 * about the same order.
 *
 * The database vocabulary is richer than the screens' one:
 *
 *   pending                      -> Pending      (step 0 done: it was placed)
 *   accepted, preparing, ready   -> Confirmed    (the store said yes)
 *   out_for_delivery             -> On the way
 *   delivered                    -> Delivered
 *   cancelled                    -> Cancelled    (no timeline at all)
 *
 * Collapsing accepted/preparing/ready into "Confirmed" is deliberate: a
 * shopper cares that the store is on it, not which counter the box is on.
 * The dashboard keeps the fine-grained words; this file is customer language.
 */

export type OrderStep = 0 | 1 | 2 | 3;

export type StatusView = {
  label: string;
  /** Which timeline step this status completes (Placed=0 … Delivered=3). */
  step: OrderStep;
  cancelled: boolean;
  /** Chip classes, per the redesign: no gray Pending pill anywhere. */
  chip: string;
  /** An order that is neither delivered nor cancelled is "current". */
  active: boolean;
};

const CHIP = {
  pending: "bg-persimmon/10 text-persimmon",
  confirmed: "bg-persimmon/20 text-persimmon",
  onTheWay: "bg-persimmon text-white",
  delivered: "bg-tint-sage text-deep-sage",
  cancelled: "bg-surface-sunk text-muted",
} as const;

/**
 * The status, in words, and — where we know it — about WHOM.
 *
 * "Delivered" is what a shop says, because a shop delivers to the person who
 * paid. A gift has two people in it, and which one is holding it is the
 * entire question: "Delivered to Rana" is the sentence the buyer actually
 * wants, and "Delivered to you" is the honest version when the buyer chose to
 * hand it over themselves.
 *
 * `recipient` is the recipient's name when the order goes straight to them,
 * and null when it comes to the buyer — which is exactly what `orders`
 * already stores, so nothing here is guessed.
 */
export function statusView(status: string | null | undefined, recipient?: string | null): StatusView {
  const who = recipient?.trim();
  const to = who ? ` to ${who}` : " to you";
  switch (status) {
    case "accepted":
    case "preparing":
    case "ready":
      return { label: "Confirmed", step: 1, cancelled: false, chip: CHIP.confirmed, active: true };
    case "out_for_delivery":
      return {
        label: who ? `On the way to ${who}` : "On the way to you",
        step: 2,
        cancelled: false,
        chip: CHIP.onTheWay,
        active: true,
      };
    case "delivered":
      return { label: `Delivered${to}`, step: 3, cancelled: false, chip: CHIP.delivered, active: false };
    case "cancelled":
      return { label: "Cancelled", step: 0, cancelled: true, chip: CHIP.cancelled, active: false };
    case "pending":
    default:
      return { label: "Pending", step: 0, cancelled: false, chip: CHIP.pending, active: true };
  }
}

export const TIMELINE_STEPS = ["Placed", "Confirmed", "On the way", "Delivered"] as const;

/** Customer words for how an order was paid. */
export function paymentLabel(method: string | null | undefined): string {
  switch (method) {
    case "cod":
      return "Cash on delivery";
    case "whish":
      return "Whish";
    case "omt":
      return "OMT";
    case "card":
      return "Card";
    default:
      return method ?? "—";
  }
}
