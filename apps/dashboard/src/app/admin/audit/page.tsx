import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatusPill, EmptyStateV2 } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The audit log (§4.12): order_events (what 0031's triggers write on every
 * status and confirmation change) and audit_log (privileged actions from
 * 0030). Read-only by construction — there is no action on this page.
 */
export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: events }, auditRes] = await Promise.all([
    supabase
      .from("order_events")
      .select("id, event_type, actor_role, from_status, to_status, message, created_at, order_id, partner:partners(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div>
      <PageHeader title="Audit log" />

      <Card title="Order events (latest 100)">
        {(events ?? []).length === 0 ? (
          <EmptyStateV2 title="No events recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Store</th>
                  <th className="py-2 pr-3">Change</th>
                  <th className="py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {(events ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs tabular-nums text-muted">
                      {new Date(e.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 pr-3 font-medium">{e.event_type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-3">{(e.partner as { name?: string } | null)?.name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {e.to_status ? (
                        <span className="flex items-center gap-1">
                          {e.from_status ? <StatusPill status={e.from_status} /> : null}
                          <span aria-hidden>→</span>
                          <StatusPill status={e.to_status} />
                        </span>
                      ) : (
                        <span className="text-xs text-muted">{e.message ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-2 text-muted">{e.actor_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Privileged actions" className="mt-4">
        {auditRes.error ? (
          <p className="py-4 text-center text-sm text-muted">
            audit_log is not readable from here ({auditRes.error.code}) — it may be service-role only, which is
            itself the safe configuration.
          </p>
        ) : (auditRes.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No privileged actions recorded.</p>
        ) : (
          <ul className="divide-y divide-line/60 text-sm">
            {(auditRes.data ?? []).map((a: Record<string, unknown>, i: number) => (
              <li key={i} className="py-2">
                <p className="font-medium">{String(a.action ?? a.event ?? "action")}</p>
                <p className="text-xs text-muted">
                  {a.created_at ? new Date(String(a.created_at)).toLocaleString("en-GB") : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
