"use server";
/**
 * Sign-in server action. Validates input with Zod, authenticates against
 * Supabase (which sets the httpOnly session cookies via @supabase/ssr), then
 * confirms the account actually has a dashboard role before letting them in.
 * Role is read from the DB, never from the client.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getDashboardUser } from "@/lib/auth";
import { t } from "@/lib/dictionary";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export interface LoginState {
  error?: string;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: t("login.error.generic") };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: t("login.error.generic") };
  }

  const user = await getDashboardUser();
  if (!user) {
    // Authenticated, but a plain customer or an unassigned partner. Don't leave
    // a half-session hanging around.
    await supabase.auth.signOut();
    return { error: t("login.error.norole") };
  }

  // Only follow a same-origin relative path, never an attacker-supplied
  // absolute URL.
  const next = parsed.data.next;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? (user.role === "admin" ? "/admin/stores" : "/store"));
}
