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

  /*
   * A pending, rejected or closed store waits outside; nothing else renders.
   *
   * 'paused' is explicitly LET THROUGH, and that is the whole point. A paused
   * store is hidden from the storefront but still has orders in flight,
   * payouts owed, and an owner who needs to be able to press Resume. The
   * previous `status !== 'active'` test locked a paused owner out of the very
   * screen that unpauses them — pausing would have been a one-way door.
   *
   * Allow-list rather than deny-list: any status nobody has thought about yet
   * keeps the owner outside, which is the safe direction to fail.
   */
  const OWNER_MAY_ENTER = new Set(["active", "paused"]);
  if (!viewingAs && partner && !OWNER_MAY_ENTER.has(partner.status)) redirect("/pending");

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
