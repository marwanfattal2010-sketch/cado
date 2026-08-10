import { t, type DictKey } from "@/lib/dictionary";

/**
 * Sub-order status pill. Colour mapping from the spec:
 *   amber = awaiting action, green = confirmed, blue = in progress,
 *   grey = completed, red = rejected/cancelled.
 */
const MAP: Record<string, { tone: string; key: DictKey }> = {
  pending: { tone: "bg-status-amber-tint text-status-amber", key: "status.pending" },
  accepted: { tone: "bg-status-green-tint text-status-green", key: "status.accepted" },
  preparing: { tone: "bg-status-blue-tint text-status-blue", key: "status.preparing" },
  ready: { tone: "bg-status-blue-tint text-status-blue", key: "status.ready" },
  out_for_delivery: { tone: "bg-status-blue-tint text-status-blue", key: "status.out_for_delivery" },
  delivered: { tone: "bg-status-grey-tint text-status-grey", key: "status.delivered" },
  cancelled: { tone: "bg-status-red-tint text-status-red", key: "status.cancelled" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[status] ?? { tone: "bg-status-grey-tint text-status-grey", key: undefined };
  const label = cfg.key ? t(cfg.key) : status;
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold ${cfg.tone}`}
    >
      {label}
    </span>
  );
}
