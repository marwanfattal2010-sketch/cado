"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Store detail mutations (§4.3), admin only.
 *
 * Every one of these re-checks the role on the server with requireAdmin()
 * before it touches a row — the partner id arrives in a hidden form field and
 * is treated as untrusted input, never as authorisation.
 *
 * These write `partners` and `store_payables` under the existing admin
 * policies ("admin full access to partners", "admin updates payables"). The
 * 0026 BEFORE UPDATE trigger enforce_partner_privilege_columns() lets an admin
 * through (`is_admin()` returns NEW unchanged) and keeps blocking store owners
 * from status / commission_rate / slug — nothing here weakens that.
 *
 * A commission change affects FUTURE orders only. Every placed line carries
 * commission_amount_snapshot and the rate it was placed with, so no figure on
 * a past order moves when this changes.
 */

const uuid = z.string().uuid();

/** Where to land afterwards, with a message the page renders as a banner. */
function backTo(partnerId: string, tab: string, msg: string): never {
  revalidatePath(`/admin/stores/${partnerId}`);
  revalidatePath("/admin/stores");
  redirect(`/admin/stores/${partnerId}?tab=${tab}&msg=${encodeURIComponent(msg)}`);
}

/* -------------------------------------------------------------- finance --- */

/** Commission, entered as a percentage, stored as the 0–1 fraction. */
export async function setCommissionRate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  const parsed = z.coerce
    .number()
    .min(0)
    .max(50)
    .safeParse(formData.get("percent"));
  if (!parsed.success) backTo(id.data, "finance", "Commission must be between 0% and 50%.");

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({ commission_rate: parsed.data / 100 })
    .eq("id", id.data)
    .select("id");

  if (error || !data?.length) {
    backTo(id.data, "finance", error?.message ?? "Commission did not change.");
  }
  backTo(id.data, "finance", `Commission set to ${parsed.data}% for future orders.`);
}

/**
 * Mark this store's outstanding payables as sent.
 *
 * There is no free-text "amount" here on purpose. store_payables has no
 * `amount` column and no INSERT policy — rows are written by place_order()
 * alone, one per order, each carrying the gross / commission / net_owed
 * snapshot from purchase time. So "payout sent" is a status transition on the
 * rows that are already outstanding, not a new invented figure: the amount
 * settled is exactly the sum the database already holds, and the operator
 * confirms it rather than typing it.
 *
 * Idempotent by construction — the WHERE clause only matches status='pending',
 * so running it twice settles nothing the second time. Nothing is deleted; the
 * 0030 AFTER UPDATE trigger writes an audit_log row for every status change.
 */
export async function markPayoutSent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  const schema = z.object({
    method: z.enum(["cash", "whish", "bank"]),
    paidOn: z.string().min(1),
    reference: z.string().trim().max(100).optional(),
  });
  const parsed = schema.safeParse({
    method: formData.get("method"),
    paidOn: formData.get("paidOn"),
    reference: (formData.get("reference") as string | null) ?? undefined,
  });
  if (!parsed.success) {
    backTo(id.data, "finance", "Pick a payment method and a date.");
  }

  const paidAt = new Date(parsed.data.paidOn);
  if (Number.isNaN(paidAt.getTime())) {
    backTo(id.data, "finance", "That date could not be read.");
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("store_payables")
    .update({
      status: "paid",
      paid_at: paidAt.toISOString(),
      paid_method: parsed.data.method,
      paid_reference: parsed.data.reference || null,
    })
    .eq("store_id", id.data)
    .eq("status", "pending")
    .select("id, net_owed");

  if (error) backTo(id.data, "finance", error.message);
  if (!data?.length) backTo(id.data, "finance", "Nothing was outstanding — no rows changed.");

  backTo(
    id.data,
    "finance",
    `${data.length} payable row${data.length === 1 ? "" : "s"} marked sent.`
  );
}

/* ------------------------------------------------------------- lifecycle -- */

const LIFECYCLE = ["active", "paused", "closed"] as const;

/**
 * Soft state only. 'paused' and 'closed' both drop the store out of
 * "public reads active partners" (status = 'active'), which is what takes its
 * products off the storefront — the product rows themselves are untouched, so
 * reactivating brings the catalogue back exactly as it was.
 */
export async function setStoreStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  const parsed = z.enum(LIFECYCLE).safeParse(formData.get("status"));
  if (!parsed.success) backTo(id.data, "settings", "Unknown status.");

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({ status: parsed.data })
    .eq("id", id.data)
    .select("id");

  if (error || !data?.length) {
    backTo(id.data, "settings", error?.message ?? "Status did not change.");
  }
  backTo(id.data, "settings", `Store is now ${parsed.data}.`);
}

/* ----------------------------------------------------------- application -- */

/** Approve a pending application: the pending partner row becomes the store. */
export async function approveApplication(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({
      status: "active",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id.data)
    .eq("status", "pending") // idempotent: an already-decided application is not re-decided
    .select("id");

  if (error) backTo(id.data, "owner", error.message);
  if (!data?.length) backTo(id.data, "owner", "This application was already decided.");
  backTo(id.data, "owner", "Approved — the store is active.");
}

export async function rejectApplication(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  const reason = z
    .string()
    .trim()
    .min(3, "Say why, briefly — the store sees this.")
    .max(500)
    .safeParse(formData.get("reason"));
  if (!reason.success) {
    backTo(id.data, "owner", "Give a reason before rejecting — the store is told what it says.");
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({
      status: "rejected",
      rejection_reason: reason.data,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .eq("status", "pending")
    .select("id");

  if (error) backTo(id.data, "owner", error.message);
  if (!data?.length) backTo(id.data, "owner", "This application was already decided.");
  backTo(id.data, "owner", "Rejected, with the reason recorded.");
}

/* -------------------------------------------------------------- settings -- */

/**
 * Storefront placement and pickup logistics. Everything here is presentation
 * or operations — nothing that changes what the store earns.
 */
export async function saveStoreSettings(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("partnerId"));
  if (!id.success) redirect("/admin/stores");

  // Blank clears the rank; anything else must be a whole number.
  const rankRaw = (formData.get("featured_rank") as string | null)?.trim() ?? "";
  let rank: number | null = null;
  if (rankRaw !== "") {
    const parsedRank = z.coerce.number().int().min(0).max(999).safeParse(rankRaw);
    if (!parsedRank.success) {
      backTo(id.data, "settings", "Featured rank must be a whole number (0–999), or blank.");
    }
    rank = parsedRank.data;
  }

  const text = (key: string) => {
    const v = (formData.get(key) as string | null)?.trim() ?? "";
    return v === "" ? null : v.slice(0, 500);
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({
      is_featured: formData.get("is_featured") === "on",
      featured_rank: rank,
      store_of_week: formData.get("store_of_week") === "on",
      tagline: text("tagline"),
      pickup_address: text("pickup_address"),
      driver_contact: text("driver_contact"),
    })
    .eq("id", id.data)
    .select("id");

  if (error || !data?.length) {
    backTo(id.data, "settings", error?.message ?? "Settings did not save.");
  }
  backTo(id.data, "settings", "Settings saved.");
}
