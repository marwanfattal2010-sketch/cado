"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDashboardUser, requireStoreOwner } from "@/lib/auth";
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

/* ===================================================== §5.7 payout details === */

/**
 * Who, at this store, is allowed to touch the bank details.
 *
 * `partner_payout_details` is the strictest table in the schema: policy
 * `payout_details_owner` (0068) is FOR ALL — including SELECT — gated on
 * profiles.store_role = 'owner'. So RLS already blocks staff outright and this
 * check is not what makes it safe; it is what makes the UI tell the truth
 * instead of showing a form that silently fails.
 *
 * store_role defaults to 'owner' for every profile, so a CADO admin (who has
 * their own is_admin() branch in the policy) is never mistaken for staff.
 */
type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

async function assertPayoutEditor(
  supabase: ServerClient,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: me } = await supabase
    .from("profiles")
    .select("role, store_role")
    .eq("id", userId)
    .single();

  if (!me) return { ok: false, message: "Couldn't confirm your account." };
  if (me.role === "admin") return { ok: true };
  if (me.store_role !== "owner") {
    return { ok: false, message: "Only the store owner can change payout details." };
  }
  return { ok: true };
}

const payoutSchema = z.object({
  method: z.enum(["cash", "whish", "bank"], {
    message: "Choose Cash, Whish, or Bank transfer.",
  }),
  account_holder: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v === "" ? null : v)),
  account_number: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v)),
});

export async function savePayoutDetails(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const gate = await assertPayoutEditor(supabase, user.id);
  if (!gate.ok) return { ok: false, message: gate.message };

  const parsed = payoutSchema.safeParse({
    method: String(formData.get("method") ?? ""),
    account_holder: String(formData.get("account_holder") ?? ""),
    account_number: String(formData.get("account_number") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // Whish and bank both need somewhere to send the money. Cash doesn't.
  if (parsed.data.method !== "cash" && !parsed.data.account_number) {
    return { ok: false, message: "Add the account number CADO should pay into." };
  }

  const { error } = await supabase.from("partner_payout_details").upsert(
    {
      // From the session, never from the form.
      partner_id: user.partnerId,
      method: parsed.data.method,
      account_holder: parsed.data.account_holder,
      account_number: parsed.data.account_number,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "partner_id" }
  );

  if (error) return { ok: false, message: error.message };

  revalidatePath("/store/account");
  return { ok: true, message: "Payout details saved." };
}

/* ======================================================== pause my store === */

/**
 * PAUSE / RESUME.
 *
 * This CANNOT be a plain UPDATE on partners.status. 0026_lock_privilege_columns
 * installs a BEFORE UPDATE trigger that raises 'store status can only be
 * changed by CADO' for any non-admin, non-service caller — deliberately, since
 * status is also how a store self-approves out of 'pending' or un-suspends
 * itself. That lock stays.
 *
 * So the write goes through `store_set_own_pause(boolean)`, a narrow
 * SECURITY DEFINER function added in 0071 that will only ever move a store
 * between 'active' and 'paused' and refuses every other status. 'closed' is
 * never reachable from here, and neither is 'pending' or 'rejected'.
 *
 * Until 0071 is applied, the function does not exist and Postgres returns
 * 42883. That is reported as a plain sentence rather than a raw error — the
 * store owner can't do anything about a missing migration except call CADO.
 */
export async function setStorePaused(
  paused: boolean
): Promise<{ ok: boolean; message: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("status")
    .eq("id", user.partnerId)
    .single();

  // Refuse before writing if the store isn't in a state a shop owner controls.
  if (!partner || (partner.status !== "active" && partner.status !== "paused")) {
    return { ok: false, message: "Only CADO can change your store's status right now." };
  }

  // The RPC isn't in the generated Database["public"]["Functions"] until the
  // types are regenerated after 0071 — same cast the admin overview uses for
  // admin_finance_breakdown.
  const { error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
    }
  ).rpc("store_set_own_pause", { p_paused: paused });

  if (error) {
    if (error.code === "42883" || /store_set_own_pause/.test(error.message)) {
      return {
        ok: false,
        message: "Pausing isn't switched on for your account yet. Ask CADO to pause your store for you.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/store/account");
  revalidatePath("/store");
  return {
    ok: true,
    message: paused ? "Your store is paused." : "Your store is live again.",
  };
}
