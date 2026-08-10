import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { InviteForm } from "./InviteForm";
import { t } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: partners }, { data: invites }] = await Promise.all([
    supabase.from("partners").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("store_owner_invites")
      .select("id, email, status, created_at, partner_id, partners(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const inviteRows = (invites ?? []) as Array<{
    id: string;
    email: string;
    status: string;
    created_at: string;
    partners: { name: string } | null;
  }>;

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("admin.invites.title")}</h1>

      <InviteForm partners={partners ?? []} />

      <h2 className="mb-3 mt-8 font-display text-h2 text-ink">{t("admin.invites.list")}</h2>
      {inviteRows.length === 0 ? (
        <p className="text-sm text-muted">No invitations sent yet.</p>
      ) : (
        <ul className="space-y-2">
          {inviteRows.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3 text-sm shadow-rest"
            >
              <div>
                <p className="font-medium text-ink">{inv.email}</p>
                <p className="text-xs text-muted">
                  {inv.partners?.name ?? "—"} · {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${
                  inv.status === "accepted"
                    ? "bg-status-green-tint text-status-green"
                    : inv.status === "revoked"
                      ? "bg-status-red-tint text-status-red"
                      : "bg-status-amber-tint text-status-amber"
                }`}
              >
                {inv.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
