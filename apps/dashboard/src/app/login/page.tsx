import { Suspense } from "react";
import { getDashboardUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { t } from "@/lib/dictionary";

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const user = await getDashboardUser();
  if (user) redirect(user.role === "admin" ? "/admin/stores" : "/store");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl tracking-tight text-ink">
            CADO <span className="text-gold">Partners</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
