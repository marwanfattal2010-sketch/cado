import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/dictionary";
import { PageHeader, Card } from "@/components/ui";
import { AdminRoleForm } from "./AdminRoleForm";
import { PasswordForm } from "@/app/store/account/PasswordForm";
import { DeliveryFeeForm, OrderingWindowForm, SupportContactsForm } from "./SettingForms";

export const dynamic = "force-dynamic";

/**
 * Settings, reading and writing the real `settings` table.
 *
 * This page used to print "$5.00" as static text with a note explaining that
 * the fee was welded inside place_order(). Migration 0069 moved that constant
 * into settings.delivery_fee_usd and pointed place_order at it, so the number
 * below is now the number checkout charges — read from the same row the order
 * function reads. Nothing on this page is a hard-coded figure any more.
 *
 * Default commission stays display-only on purpose: the per-store rate lives on
 * each store's Finance tab, and every placed line already carries its own
 * commission_rate_snapshot, so there is no single knob that could rewrite it.
 */

type Contacts = { email?: string | null; whatsapp?: string | null; instagram?: string | null };
type Window = { open?: string; close?: string; timezone?: string };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: admins }, { data: settingRows }] = await Promise.all([
    supabase.rpc("admin_list_admins"),
    supabase.from("settings").select("key, value, updated_at"),
  ]);

  const adminRows = (admins ?? []) as Array<{
    user_id: string;
    email: string;
    full_name: string | null;
    since: string;
  }>;

  const settings = new Map((settingRows ?? []).map((r) => [r.key, r.value]));
  // Same fallbacks the database uses, so the form never shows a value that
  // disagrees with what delivery_fee_usd() would return.
  const fee = Number(settings.get("delivery_fee_usd") ?? 5);
  const win = (settings.get("ordering_window") ?? {}) as Window;
  const contacts = (settings.get("support_contacts") ?? {}) as Contacts;

  return (
    <div>
      <PageHeader title={t("admin.settings.title")} />

      <div className="space-y-5">
        <Card title="Delivery fee">
          <DeliveryFeeForm fee={fee} />
          <p className="mt-2 text-xs text-muted">
            Charged once per order at checkout. Orders already placed keep the fee they were
            charged — changing this never rewrites history.
          </p>
        </Card>

        <Card title="Ordering hours">
          <OrderingWindowForm open={win.open ?? "09:00"} close={win.close ?? "21:00"} />
          <p className="mt-2 text-xs text-muted">
            Times are {win.timezone ?? "Asia/Beirut"}. These hours are stored and shown to stores;
            the storefront does not enforce a cut-off yet.
          </p>
        </Card>

        <Card title="Support contacts">
          <SupportContactsForm
            email={contacts.email ?? ""}
            whatsapp={contacts.whatsapp ?? ""}
            instagram={contacts.instagram ?? ""}
          />
        </Card>

        <Card title={t("admin.settings.commission")}>
          <p className="font-display text-2xl tabular-nums text-ink">15%</p>
          <p className="mt-2 text-sm text-muted">{t("admin.settings.commission.note")}</p>
        </Card>

        <Card title={t("admin.settings.admins")}>
          <ul className="mb-4 space-y-2">
            {adminRows.map((a) => (
              <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium text-ink">{a.email}</span>
                  {a.full_name ? <span className="ml-2 text-muted">{a.full_name}</span> : null}
                </span>
                <span className="text-xs text-muted">since {new Date(a.since).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <AdminRoleForm />
          <p className="mt-2 text-xs text-muted">
            The account must already exist (storefront sign-up or invite) before it can be made an
            admin.
          </p>
        </Card>

        <Card title={t("account.password.title")}>
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
