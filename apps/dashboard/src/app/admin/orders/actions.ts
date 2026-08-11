"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Status changes go through admin_set_sub_order_status(), which re-checks
 * is_admin() inside the database and refuses to reopen delivered/cancelled
 * orders. Amounts are not editable anywhere in the dashboard — that is a
 * money-path rule, not a missing feature.
 */
export async function setSubOrderStatus(
  subOrderId: string,
  status: string
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase.rpc("admin_set_sub_order_status", {
    p_sub_order_id: subOrderId,
    p_status: status,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
