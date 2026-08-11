import { requireStoreOwner } from "@/lib/auth";
import { t } from "@/lib/dictionary";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function StoreAccountPage() {
  const user = await requireStoreOwner();

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("account.title")}</h1>

      <div className="mb-6 rounded-card border border-line bg-surface p-4 shadow-rest">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium text-ink">{user.email}</p>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("account.password.title")}
      </h2>
      <PasswordForm />
    </div>
  );
}
