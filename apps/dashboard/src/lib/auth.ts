import "server-only";
/**
 * Server-side identity + role resolution. The rule from CLAUDE.md:
 * "Never accept user_id, role, or store_id from the browser. Identity comes
 * from auth.uid() only." So role is ALWAYS read from the database against the
 * verified session, never from a cookie value, header, or client prop.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

export type DashboardRole = "admin" | "store_owner";

export interface DashboardUser {
  id: string;
  email: string | null;
  role: DashboardRole;
  partnerId: string | null;
  fullName: string | null;
}

/**
 * A store owner, narrowed so partnerId is non-null. getDashboardUser() only
 * ever returns role 'store_owner' when profiles.partner_id is set, so this is
 * a statement of a guarantee that already holds — but expressing it in the
 * type is what lets a page write `.eq("partner_id", user.partnerId)` without
 * a non-null assertion. Scoping a query to the caller's own store is the
 * common case, so it must not be the awkward one.
 */
export interface StoreOwnerUser extends DashboardUser {
  role: "store_owner";
  partnerId: string;
}

/**
 * Resolve the current user and their dashboard role, or null if they have no
 * dashboard access. A "store_owner" is profiles.role='partner' WITH a
 * partner_id — the mapping from the spec's invented 'store_owner' role onto
 * what the live schema actually constrains role to.
 */
export async function getDashboardUser(): Promise<DashboardUser | null> {
  const supabase = await createServerClient();

  // getUser() re-validates the JWT with the auth server — do not trust
  // getSession() alone for authorization.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, partner_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  if (profile.role === "admin") {
    return {
      id: user.id,
      email: user.email ?? null,
      role: "admin",
      partnerId: null,
      fullName: profile.full_name,
    };
  }

  if (profile.role === "partner" && profile.partner_id) {
    return {
      id: user.id,
      email: user.email ?? null,
      role: "store_owner",
      partnerId: profile.partner_id,
      fullName: profile.full_name,
    };
  }

  // A plain customer, or a partner whose partner_id hasn't been assigned yet.
  return null;
}

/** Require any dashboard role; redirect to login otherwise. */
export async function requireDashboardUser(): Promise<DashboardUser> {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  return user;
}

/** Require admin specifically. Store owners get bounced to their own area. */
export async function requireAdmin(): Promise<DashboardUser> {
  const user = await requireDashboardUser();
  if (user.role !== "admin") redirect("/store");
  return user;
}

/** Require a store owner specifically. Admins get bounced to the admin area. */
export async function requireStoreOwner(): Promise<StoreOwnerUser> {
  const user = await requireDashboardUser();
  /*
   * THE STORE SWITCHER (§3.3). An admin carrying the view-as cookie gets a
   * synthetic store context for that partner, banner and all. It is a lens,
   * not an impersonated JWT: every query still runs under the admin's own
   * session and admin RLS. The cookie names WHICH store an admin is looking
   * at — it never grants anything, and it is ignored for real partners,
   * whose scope is always their own partner_id from the database. That keeps
   * the CLAUDE.md rule intact: identity still comes from auth.uid() only.
   */
  if (user.role === "admin") {
    const jar = await cookies();
    const target = jar.get("cado_view_as_partner")?.value;
    if (target && /^[0-9a-f-]{36}$/.test(target)) {
      return { ...user, role: "store_owner", partnerId: target } as StoreOwnerUser;
    }
    redirect("/admin/stores");
  }
  if (user.role !== "store_owner") redirect("/admin/stores");
  // Belt and braces: getDashboardUser() cannot return 'store_owner' without a
  // partner_id, so this only fires if that invariant is ever broken. Bouncing
  // to login beats serving a page whose queries would silently lose their
  // store scope.
  if (!user.partnerId) redirect("/login");
  return user as StoreOwnerUser;
}
