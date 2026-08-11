"use server";

import { revalidatePath } from "next/cache";
import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * The confirm-availability flow. Both actions run as the logged-in owner, so
 * RLS ("partner confirms own order items") plus the 0031 trigger are the real
 * gate — the trigger pins every money column, and confirmed_at is stamped by
 * the trigger, not by us. If either update touches a row the caller doesn't
 * own, it affects 0 rows and we report failure rather than pretending.
 */

export async function confirmItem(itemId: string): Promise<{ ok: boolean; message?: string }> {
  await requireStoreOwner();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ confirmation_status: "confirmed" })
    .eq("id", itemId)
    .eq("confirmation_status", "pending") // never resurrect a rejected line
    .select("sub_order_id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "This line is not yours to confirm." };
  }

  // When every line of the sub-order is confirmed, the order itself moves to
  // accepted so the customer sees progress. Partners may set status (0001
  // trigger allows status/notes only), and we only ever move pending→accepted.
  const subOrderId = data[0].sub_order_id;
  const { data: remaining } = await supabase
    .from("order_items")
    .select("id")
    .eq("sub_order_id", subOrderId)
    .neq("confirmation_status", "confirmed");

  if (remaining && remaining.length === 0) {
    await supabase
      .from("sub_orders")
      .update({ status: "accepted" })
      .eq("id", subOrderId)
      .eq("status", "pending");
  }

  revalidatePath("/store/orders");
  return { ok: true };
}

export async function rejectItem(itemId: string): Promise<{ ok: boolean; message?: string }> {
  await requireStoreOwner();
  const supabase = await createServerClient();

  // Flags the line for CADO; deliberately does NOT cancel the sub-order.
  // Deciding what happens to the rest of the basket is admin's call.
  const { data, error } = await supabase
    .from("order_items")
    .update({ confirmation_status: "rejected", rejection_reason: "Out of stock" })
    .eq("id", itemId)
    .eq("confirmation_status", "pending")
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "This line is not yours to update." };
  }

  revalidatePath("/store/orders");
  return { ok: true };
}
