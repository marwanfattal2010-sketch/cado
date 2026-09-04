import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/dictionary";
import { PageHeader, Card, StatusPill } from "@/components/ui";
import { PasswordForm } from "./PasswordForm";
import { PayoutForm, type PayoutValues } from "./PayoutForm";
import { PauseToggle } from "./PauseToggle";
import { LogoUpload } from "@/components/LogoUpload";
import { uploadOwnLogo, removeOwnLogo } from "./actions";

export const dynamic = "force-dynamic";

export default async function StoreAccountPage() {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  /*
   * WHO IS ASKING. store_role decides whether the payout form renders at all.
   * It defaults to 'owner' for every profile, so a CADO admin using the store
   * switcher reads as an owner here — which matches policy
   * `payout_details_owner`, whose first branch is is_admin().
   */
  const { data: me } = await supabase
    .from("profiles")
    .select("role, store_role")
    .eq("id", user.id)
    .single();

  const isStaff = me?.role !== "admin" && me?.store_role === "staff";

  const { data: partner } = await supabase
    .from("partners")
    .select("status, name, logo_url")
    .eq("id", user.partnerId)
    .single();

  /*
   * Payout details are only fetched for someone allowed to see them. For staff
   * this select would return zero rows anyway — `payout_details_owner` is FOR
   * ALL, so it gates SELECT too — but not asking is clearer than asking and
   * discarding.
   */
  let payout: PayoutValues | null = null;
  let updatedAt: string | null = null;
  let updatedByMe = false;
  let updatedBySomeone = false;

  if (!isStaff) {
    const { data: row } = await supabase
      .from("partner_payout_details")
      .select("method, account_holder, account_number, updated_at, updated_by")
      .eq("partner_id", user.partnerId)
      .maybeSingle();

    if (row) {
      payout = {
        method: row.method,
        account_holder: row.account_holder,
        account_number: row.account_number,
      };
      updatedAt = row.updated_at;
      updatedByMe = row.updated_by === user.id;
      updatedBySomeone = row.updated_by != null;
    }
  }

  const paused = partner?.status === "paused";

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title={t("account.title")} />

      <Card>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium text-ink">{user.email}</p>
        {partner?.status ? (
          <p className="mt-2">
            <StatusPill status={partner.status} />
          </p>
        ) : null}
      </Card>

      {/* --------------------------------------------------- store logo --- */}
      <Card title="Store logo">
        <LogoUpload
          name={partner?.name ?? "Your store"}
          logoUrl={partner?.logo_url ?? null}
          upload={uploadOwnLogo}
          remove={removeOwnLogo}
        />
      </Card>

      {/* ------------------------------------------------- §5.7 payouts --- */}
      <Card title={t("payout.title")}>
        {isStaff ? (
          <div className="rounded-card bg-surface-sunk p-4">
            <p className="text-sm font-medium text-ink">{t("payout.staffonly.title")}</p>
            <p className="mt-1 text-sm text-muted">{t("payout.staffonly.body")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("payout.subtitle")}</p>

            {payout && updatedAt ? (
              <p className="text-xs text-muted">
                {t("payout.lastupdated")}{" "}
                <time dateTime={updatedAt} suppressHydrationWarning>
                  {new Date(updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                {updatedByMe
                  ? ` ${t("payout.by.you")}`
                  : updatedBySomeone
                    ? ` ${t("payout.by.other")}`
                    : ""}
              </p>
            ) : (
              <p className="rounded-card bg-status-amber-tint px-3 py-2 text-xs font-medium text-status-amber">
                {t("payout.never")}
              </p>
            )}

            <PayoutForm values={payout} />
          </div>
        )}
      </Card>

      {/* -------------------------------------------------- pause store --- */}
      <Card title={t("storepause.title")}>
        {paused ? (
          <div className="mb-3 rounded-card bg-status-amber-tint p-3">
            <p className="text-sm font-semibold text-status-amber">{t("storepause.paused.title")}</p>
            <p className="mt-0.5 text-sm text-muted">{t("storepause.paused.body")}</p>
          </div>
        ) : null}
        <PauseToggle paused={paused} />
      </Card>

      {/* ----------------------------------------------------- password --- */}
      <Card title={t("account.password.title")}>
        <PasswordForm />
      </Card>
    </div>
  );
}
