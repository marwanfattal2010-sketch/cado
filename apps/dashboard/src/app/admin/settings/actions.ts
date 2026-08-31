"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * The settings table is the one place where a number Marwan types changes how
 * the shop behaves. Two rules keep that honest:
 *
 *  1. Nothing here trusts the form for identity — requireAdmin() runs first and
 *     the settings RLS policy (is_admin()) is the real gate underneath.
 *  2. Every value is validated to the shape the READER expects. delivery_fee_usd
 *     is read by delivery_fee_usd() as `(value)::numeric`, so a stray string
 *     would break order placement itself. Writing "abc" here must fail in this
 *     file, not at checkout.
 */

type Result = { ok: boolean; message?: string };

/* ---------------------------------------------------------- admin role --- */

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

/* ------------------------------------------------------------ settings --- */

async function writeSetting(key: string, value: unknown): Promise<Result> {
  const admin = await requireAdmin();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString(), updated_by: admin.id }, { onConflict: "key" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

/* ------------------------------------------------------- delivery fee ----- */

export async function saveDeliveryFee(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.coerce.number().min(0).max(100).safeParse(formData.get("fee"));
  if (!parsed.success) return { ok: false, message: "Enter a delivery fee between $0 and $100." };
  // Stored as a bare JSON number: delivery_fee_usd() casts value::numeric.
  return writeSetting("delivery_fee_usd", parsed.data);
}

/* ---------------------------------------------------- ordering window ----- */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveOrderingWindow(_prev: Result | null, formData: FormData): Promise<Result> {
  const open = String(formData.get("open") ?? "");
  const close = String(formData.get("close") ?? "");
  if (!TIME.test(open) || !TIME.test(close)) {
    return { ok: false, message: "Use 24-hour times, like 09:00 and 21:00." };
  }
  return writeSetting("ordering_window", { open, close, timezone: "Asia/Beirut" });
}

/* --------------------------------------------------- support contacts ----- */

const Contacts = z.object({
  email: z.string().trim().email().max(200).or(z.literal("")),
  whatsapp: z.string().trim().max(40),
  instagram: z.string().trim().max(80),
});

export async function saveSupportContacts(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = Contacts.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim(),
  });
  if (!parsed.success) return { ok: false, message: "That support email doesn't look right." };
  const v = parsed.data;
  return writeSetting("support_contacts", {
    email: v.email || null,
    whatsapp: v.whatsapp || null,
    instagram: v.instagram || null,
  });
}
