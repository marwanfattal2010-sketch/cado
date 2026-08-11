import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatCard, money } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

/**
 * Admin landing page. Every figure comes from admin_overview_stats(), which
 * reads the money snapshots place_order() wrote — the page adds and formats,
 * it never computes a price. If the database has no orders, the page shows
 * zeros, not invented demo numbers.
 */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("admin_overview_stats");
  const s = (Array.isArray(data) ? data[0] : data) as {
    orders_today: number;
    orders_this_month: number;
    orders_all_time: number;
    revenue_today: number;
    revenue_this_month: number;
    revenue_all_time: number;
    commission_all_time: number;
    commission_this_month: number;
    delivery_fees_all_time: number;
    sub_orders_by_status: Record<string, number>;
  } | null;

  if (error || !s) {
    return (
      <p className="text-sm text-status-red">
        Could not load stats: {error?.message ?? "no data"}
      </p>
    );
  }

  const statuses = Object.entries(s.sub_orders_by_status ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("admin.overview.title")}</h1>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("admin.overview.orders")}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("admin.overview.today")} value={String(s.orders_today)} />
        <StatCard label={t("admin.overview.month")} value={String(s.orders_this_month)} />
        <StatCard label={t("admin.overview.alltime")} value={String(s.orders_all_time)} />
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("admin.overview.revenue")}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("admin.overview.today")} value={money(s.revenue_today)} />
        <StatCard label={t("admin.overview.month")} value={money(s.revenue_this_month)} />
        <StatCard label={t("admin.overview.alltime")} value={money(s.revenue_all_time)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("admin.overview.commission")}
          value={money(s.commission_all_time)}
          sub={`${money(s.commission_this_month)} ${t("admin.overview.month").toLowerCase()}`}
        />
        <StatCard label={t("admin.overview.deliveryfees")} value={money(s.delivery_fees_all_time)} />
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("admin.overview.bystatus")}
      </h2>
      <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
        {statuses.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {statuses.map(([status, n]) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <StatusBadge status={status} />
                <span className="font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
