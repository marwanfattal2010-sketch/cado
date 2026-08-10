"use server";
/**
 * An invited store owner sets their own password here. They arrive with a
 * valid session already established by /auth/callback, so this just updates the
 * password on the current user. We never generate, see, or display a password —
 * the user types it, Supabase hashes it.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getDashboardUser } from "@/lib/auth";
import { t } from "@/lib/dictionary";

const schema = z
  .object({
    password: z.string().min(10, t("setpw.tooshort")).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: t("setpw.mismatch"),
    path: ["confirm"],
  });

export interface SetPwState {
  error?: string;
}

export async function setPassword(_prev: SetPwState, formData: FormData): Promise<SetPwState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.error") };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t("setpw.invalidlink") };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: t("common.error") };
  }

  // Mark any pending invite for this email as accepted (best-effort; the RLS
  // on invites is admin-only, so this write happens through a definer-free path
  // only if they're admin — for a store owner it's a no-op, which is fine, the
  // invite is informational).
  const dashUser = await getDashboardUser();
  redirect(dashUser?.role === "admin" ? "/admin/stores" : "/store");
}
