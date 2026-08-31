"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Partner management, admin only. These write the partners table directly
 * under "admin full access to partners" — the same columns a store owner is
 * forbidden from touching by the 0026 trigger.
 *
 * A commission change affects FUTURE orders only: every placed line carries
 * commission_rate_snapshot, so history cannot be rewritten from here.
 */

const rateSchema = z.coerce.number().min(0).max(0.5); // 0–50%, as a fraction

export async function setPartnerCommission(
  partnerId: string,
  ratePercent: number | string
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();

  const asFraction = Number(ratePercent) / 100;
  const parsed = rateSchema.safeParse(asFraction);
  if (!parsed.success) {
    return { ok: false, message: "Commission must be between 0% and 50%." };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({ commission_rate: parsed.data })
    .eq("id", partnerId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "Update did not apply." };
  }
  revalidatePath("/admin/stores");
  return { ok: true };
}

/**
 * The status vocabulary is fixed by the partners_status_check constraint that
 * 0068 installed: pending | active | paused | closed | rejected. This function
 * used to write 'suspended', which that constraint now rejects — so the Suspend
 * button was writing a value the database refuses. 'paused' is the same idea
 * under the name the schema actually uses: hidden from the storefront, all data
 * kept, reversible in one click.
 *
 * 'pending' and 'rejected' are deliberately NOT settable here — those belong to
 * the application review flow, where a rejection reason is recorded with them.
 */
export async function setPartnerStatus(
  partnerId: string,
  status: "active" | "paused" | "closed"
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();

  if (!["active", "paused", "closed"].includes(status)) {
    return { ok: false, message: "Unknown status." };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .update({ status })
    .eq("id", partnerId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "Update did not apply." };
  }
  revalidatePath("/admin/stores");
  return { ok: true };
}
