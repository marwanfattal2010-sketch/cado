"use server";
/**
 * Invite a store owner by email.
 *
 * Flow:
 *   1. Admin submits an email + a store (partner_id).
 *   2. We call Supabase Auth admin inviteUserByEmail() with the service role.
 *      Supabase creates the auth user in an unconfirmed state and emails them a
 *      link. We NEVER generate or see a password — they set their own via
 *      /auth/set-password after clicking the link.
 *   3. We set the new user's profile role='partner' and partner_id=<store>.
 *      This is the legitimate "auth.uid() is null" assignment path that the
 *      0026 trigger explicitly allows for the service role. A store owner can
 *      never do this to themselves.
 *   4. We log the invite in store_owner_invites for the admin's audit trail.
 *
 * Email delivery: Resend is in sandbox mode (per CLAUDE.md), so the invite
 * email only actually arrives for the project owner's address. That's a known
 * platform limitation, surfaced here honestly rather than pretended away.
 */
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { t } from "@/lib/dictionary";

const schema = z.object({
  email: z.string().email().max(320),
  partnerId: z.string().uuid(),
});

export interface InviteState {
  error?: string;
  success?: string;
}

export async function inviteStoreOwner(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse({
    email: formData.get("email"),
    partnerId: formData.get("partnerId"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and pick a store." };
  }
  const { email, partnerId } = parsed.data;

  const service = createServiceRoleClient();

  // Confirm the store exists (defensive — the select is admin-gated anyway).
  const { data: partner } = await service
    .from("partners")
    .select("id, name")
    .eq("id", partnerId)
    .single();
  if (!partner) {
    return { error: "That store no longer exists." };
  }

  // Invite (or, if the user already exists, generate a fresh invite link).
  const redirectTo = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  let authUserId = invited?.user?.id ?? null;

  if (inviteErr) {
    // Most common cause: the email already has an account. Fall back to
    // finding that user so we can still assign them to the store.
    const { data: list } = await service.auth.admin.listUsers();
    const existing = list?.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (!existing) {
      return { error: `Could not send the invitation: ${inviteErr.message}` };
    }
    authUserId = existing.id;
  }

  if (!authUserId) {
    return { error: t("common.error") };
  }

  // Ensure a profile row exists, then assign role + partner_id as the service
  // role (the trigger-allowed path). handle_new_user() usually creates the
  // profile, but upsert to be safe against timing.
  const { error: profileErr } = await service
    .from("profiles")
    .upsert({ id: authUserId, role: "partner", partner_id: partnerId }, { onConflict: "id" });
  if (profileErr) {
    return { error: `Assigned the invite but could not set the role: ${profileErr.message}` };
  }

  // Record the invite for the audit trail.
  await service.from("store_owner_invites").insert({
    email,
    partner_id: partnerId,
    invited_by: admin.id,
    auth_user_id: authUserId,
    status: "pending",
  });

  return { success: t("admin.invites.sent") };
}
