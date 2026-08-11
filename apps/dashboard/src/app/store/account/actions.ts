"use server";

import { requireDashboardUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Password change for the logged-in account. Same rules as the invite flow's
 * set-password screen (10+ chars). Runs against the caller's own session —
 * there is no "change someone else's password" here by construction.
 */
export async function changePassword(formData: FormData): Promise<{ ok: boolean; message: string }> {
  await requireDashboardUser();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 10) return { ok: false, message: "Use at least 10 characters." };
  if (password !== confirm) return { ok: false, message: "The two passwords don't match." };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Password changed." };
}
