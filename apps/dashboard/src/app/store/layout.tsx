import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDashboardUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

const VIEW_AS_COOKIE = "cado_view_as_partner";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardUser();
  if (!user) redirect("/login");

  /**
   * WHO'S STORE IS THIS PAGE ABOUT?
   *
   * A partner: their own, always — the cookie is ignored for them, so a
   * stray cookie can never point a store owner at someone else's store (and
   * RLS would return them nothing anyway; this just keeps the UI honest).
   *
   * An admin with the view-as cookie: that store, with a loud banner. This
   * is §3.3's store switcher — how an admin edits a store's products without
   * a second login. Reads still run as the ADMIN's own session; "view as" is
   * a lens, not an impersonated JWT.
   */
  let partnerId = user.partnerId;
  let viewingAs = false;
  if (user.role === "admin") {
    const jar = await cookies();
    const target = jar.get(VIEW_AS_COOKIE)?.value;
    if (!target) redirect("/admin/stores");
    partnerId = target;
    viewingAs = true;
  }

  const supabase = await createServerClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("name, status")
    .eq("id", partnerId!)
    .single();

  // A pending or rejected store waits outside; nothing else renders.
  if (!viewingAs && partner && partner.status !== "active") redirect("/pending");

  return (
    <AppShell role="store_owner" storeName={partner?.name}>
      {viewingAs ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-card bg-ribbon px-4 py-2.5 text-sm font-medium text-white">
          <span>Viewing as {partner?.name ?? "store"} — changes here are real.</span>
          <Link href="/admin/stores/exit-view" className="shrink-0 underline underline-offset-4">
            Exit
          </Link>
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
