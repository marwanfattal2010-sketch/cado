import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

/**
 * Admin sees every store. "admin full access to partners" grants the read;
 * commission_rate and status are visible here but the dashboard never lets a
 * store owner reach this page (requireAdmin), and even the DB forbids a store
 * owner writing those columns (0026 trigger).
 */
export default async function AdminStoresPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, slug, status, commission_rate, city")
    .order("name");

  const rows = partners ?? [];

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("admin.stores.title")}</h1>

      {rows.length === 0 ? (
        <EmptyState title="No stores" body="Partner stores will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-rest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">{t("admin.stores.status")}</th>
                <th className="px-4 py-3 text-right">{t("admin.stores.commission")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.city ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${
                        p.status === "active"
                          ? "bg-status-green-tint text-status-green"
                          : p.status === "suspended"
                            ? "bg-status-red-tint text-status-red"
                            : "bg-status-amber-tint text-status-amber"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(Number(p.commission_rate) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
