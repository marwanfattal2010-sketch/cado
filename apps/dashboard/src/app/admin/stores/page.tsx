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
  /** The pitch, for pending applications. */
  application_text: string | null;
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
  const totals = (data ?? []) as Omit<PartnerTotals, "application_text">[];

  // The application pitch lives on partners.description (until 0068 gives
  // it a column of its own). Only pending stores need it here.
  const pendingIds = totals.filter((p) => p.status === "pending").map((p) => p.partner_id);
  const { data: pitches } = pendingIds.length
    ? await supabase.from("partners").select("id, description").in("id", pendingIds)
    : { data: [] as { id: string; description: string | null }[] };
  const pitchOf = new Map((pitches ?? []).map((x) => [x.id, x.description]));
  const partners: PartnerTotals[] = totals.map((p) => ({
    ...p,
    application_text: pitchOf.get(p.partner_id) ?? null,
  }));

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

              {p.status === "pending" && p.application_text ? (
                /* The application, shown where the decision is made. */
                <p className="mt-2 whitespace-pre-line rounded-card bg-status-amber-tint p-2.5 text-xs text-ink">
                  {p.application_text}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-muted">
                {t("admin.partners.owner")}:{" "}
                {p.owner_email ? (
                  <span className="text-ink">{p.owner_email}</span>
                ) : (
                  <span className="italic">{t("admin.partners.noowner")}</span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <PartnerControls
                  partnerId={p.partner_id}
                  commissionPercent={Number(p.commission_rate) * 100}
                  status={p.status}
                />
                {/* §3.3: the admin edits this store's products and orders by
                    stepping into its dashboard — no second login. */}
                <form
                  action={async () => {
                    "use server";
                    const { enterViewAs } = await import("./view-as/actions");
                    await enterViewAs(p.partner_id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-pill border border-ribbon px-3 py-1.5 text-xs font-semibold text-ribbon transition-colors hover:bg-ribbon-tint"
                  >
                    View as store →
                  </button>
                </form>
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
