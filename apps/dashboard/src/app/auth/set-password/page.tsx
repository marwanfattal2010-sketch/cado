import { SetPasswordForm } from "./SetPasswordForm";
import { t } from "@/lib/dictionary";

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl tracking-tight text-ink">
            CADO <span className="text-gold">Partners</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t("setpw.subtitle")}</p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  );
}
