import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { money } from "@/components/StatCard";
import { t } from "@/lib/dictionary";
import { PartnerControls } from "./PartnerControls";

export const dynamic = "force-dynamic";

interface PartnerTotals {
  partner_id: string;
  name: string;
  status: string;
  city: string | null;
  commission_rate: number;
  owner_email: string | null;
  orders_count: number;
  gross_revenue: number;
  commission: number;
  payable_pending: number;
}

/**
 * The Partners page: every store with its lifetime numbers, its owner login,
 * a DEMO badge where the login is a demo account, and inline commission /
 * suspend controls. Numbers come from admin_partner_totals() — snapshots, not
 * recomputation.
 *
 * A partner counts as DEMO by its owner email domain (@cadotest.local from
 * the isolation seed, @cado-demo.local for the five demo stores). That means
 * no schema flag to forget to clear: give a store a real owner login and the
 * badge disappears by itself.
 */
export default async function AdminPartnersPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("admin_partner_totals");
  const partners = (data ?? []) as PartnerTotals[];

  const isDemo = (email: string | null) =>
    !!email && (email.endsWith("@cadotest.local") || email.endsWith("@cado-demo.local"));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-h1 text-ink">{t("admin.partners.title")}</h1>
        <Link
          href="/admin/invites"
          className="min-h-[40px] rounded-pill bg-ink px-4 py-2 text-sm font-semibold text-canvas"
        >
          {t("admin.partners.invite")}
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-status-red">{error.message}</p>
      ) : partners.length === 0 ? (
        <EmptyState title="No stores" body="Partner stores will appear here." />
      ) : (
        <ul className="space-y-3">
          {partners.map((p) => (
            <li key={p.partner_id} className="rounded-card border border-line bg-surface p-4 shadow-rest">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{p.name}</p>
                  {isDemo(p.owner_email) ? (
                    <span className="rounded-pill bg-status-amber-tint px-2 py-0.5 text-[10px] font-bold tracking-wide text-status-amber">
                      {t("admin.partners.demo")}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${
                      p.status === "active"
                        ? "bg-status-green-tint text-status-green"
                        : "bg-status-red-tint text-status-red"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-muted">{p.city ?? ""}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <Metric label={t("admin.partners.orders")} value={String(p.orders_count)} />
                <Metric label={t("admin.partners.revenue")} value={money(p.gross_revenue)} />
                <Metric label={t("admin.partners.commission")} value={money(p.commission)} />
                <Metric label={t("admin.partners.payable")} value={money(p.payable_pending)} strong />
              </div>

              <p className="mt-2 text-xs text-muted">
                {t("admin.partners.owner")}:{" "}
                {p.owner_email ? (
                  <span className="text-ink">{p.owner_email}</span>
                ) : (
                  <span className="italic">{t("admin.partners.noowner")}</span>
                )}
              </p>

              <div className="mt-3 border-t border-line pt-3">
                <PartnerControls
                  partnerId={p.partner_id}
                  commissionPercent={Number(p.commission_rate) * 100}
                  status={p.status}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</p>
    </div>
  );
}
