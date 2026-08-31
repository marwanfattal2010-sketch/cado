import { redirect } from "next/navigation";
import { getDashboardUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

/**
 * Where a pending store waits (§2.2). It shows their own application back to
 * them and nothing else — the store layout bounces them here until an admin
 * approves, and RLS keeps everything else dark regardless of the UI.
 */
export default async function StorePendingPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const supabase = await createServerClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("name, status, created_at")
    .eq("id", user.partnerId!)
    .single();

  // Approved while they were away: straight in.
  if (partner?.status === "active") redirect("/store");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <BrandLogo variant="ink" height={28} />
      <div className="mt-6 w-full rounded-2xl border border-line bg-surface p-6 shadow-card">
        {partner?.status === "rejected" || partner?.status === "closed" ? (
          <>
            <h1 className="font-display text-xl text-ink">Application not approved</h1>
            <p className="mt-2 text-sm text-muted">
              We couldn&apos;t approve {partner?.name ?? "your store"} this time. Check your email for the
              reason, or write to us and we&apos;ll look again.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-status-amber-tint text-xl">
              ⏳
            </span>
            <h1 className="mt-3 font-display text-xl text-ink">
              {partner?.name ?? "Your store"} is waiting for CADO approval
            </h1>
            <p className="mt-2 text-sm text-muted">
              We review every store before it goes live. We&apos;ll email you — usually within a day.
            </p>
          </>
        )}
        <form action="/logout" method="post" className="mt-5">
          <button type="submit" className="text-sm font-medium text-muted underline underline-offset-4">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
