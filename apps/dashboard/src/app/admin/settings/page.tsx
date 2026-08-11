import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/dictionary";
import { AdminRoleForm } from "./AdminRoleForm";
import { PasswordForm } from "@/app/store/account/PasswordForm";

export const dynamic = "force-dynamic";

/**
 * Settings. Two facts on this page are display-only on purpose:
 *  - default commission (new partners' starting rate; per-store rate is
 *    edited on the Partners page)
 *  - delivery fee, which lives inside place_order() so the money path cannot
 *    drift via a settings knob. The page states that instead of hiding it.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data: admins } = await supabase.rpc("admin_list_admins");
  const adminRows = (admins ?? []) as Array<{
    user_id: string;
    email: string;
    full_name: string | null;
    since: string;
  }>;

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("admin.settings.title")}</h1>

      <section className="mb-7">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("admin.settings.admins")}
        </h2>
        <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
          <ul className="mb-4 space-y-2">
            {adminRows.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium text-ink">{a.email}</span>
                  {a.full_name ? <span className="ml-2 text-muted">{a.full_name}</span> : null}
                </span>
                <span className="text-xs text-muted">
                  since {new Date(a.since).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
          <AdminRoleForm />
          <p className="mt-2 text-xs text-muted">
            The account must already exist (storefront sign-up or invite) before it can be made an
            admin.
          </p>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("admin.settings.commission")}
        </h2>
        <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
          <p className="font-display text-2xl tabular-nums text-ink">15%</p>
          <p className="mt-2 text-sm text-muted">{t("admin.settings.commission.note")}</p>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("admin.settings.delivery")}
        </h2>
        <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
          <p className="font-display text-2xl tabular-nums text-ink">$5.00</p>
          <p className="mt-2 text-sm text-muted">{t("admin.settings.delivery.note")}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("account.password.title")}
        </h2>
        <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
