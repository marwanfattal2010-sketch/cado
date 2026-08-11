"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/** Grant or revoke admin. The database re-checks everything (0037). */
export async function setAdminRole(formData: FormData): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const makeAdmin = String(formData.get("mode")) === "grant";
  if (!email.includes("@")) return { ok: false, message: "Enter an email address." };

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("admin_set_role_admin", {
    p_email: email,
    p_make_admin: makeAdmin,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: data === "granted" ? `${email} is now an admin.` : `${email} is no longer an admin.`,
  };
}
