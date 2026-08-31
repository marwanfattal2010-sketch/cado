"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Enter / exit "view as store" (§3.3). Admin-only on the server — the cookie
 * itself grants nothing (requireStoreOwner re-checks the role on every
 * request), it only names which store the admin is looking at.
 */
export async function enterViewAs(partnerId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createServerClient();
  const { data: partner } = await supabase.from("partners").select("id").eq("id", partnerId).single();
  if (!partner) redirect("/admin/stores");

  const jar = await cookies();
  jar.set("cado_view_as_partner", partnerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // a working session, not a standing identity
  });
  redirect("/store");
}

export async function exitViewAs(): Promise<void> {
  const jar = await cookies();
  jar.delete("cado_view_as_partner");
  redirect("/admin/stores");
}
