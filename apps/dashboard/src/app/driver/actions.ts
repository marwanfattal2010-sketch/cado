"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";

/**
 * The driver's two taps.
 *
 * Everything that matters is enforced in driver_set_delivery_status(): it
 * derives the driver from auth.uid(), refuses a parcel that is not theirs,
 * allows only ready -> out_for_delivery -> delivered, and writes an order_event
 * attributing the change. This action passes a sub-order id and gets out of the
 * way — there is nothing here for a client to forge, because the id alone
 * proves nothing without the assignment behind it.
 */
export async function driverAdvance(
  subOrderId: string,
  status: "out_for_delivery" | "delivered"
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createServerClient();
  const { error } = await callRpc<string>(supabase, "driver_set_delivery_status", {
    p_sub_order_id: subOrderId,
    p_status: status,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/driver");
  return { ok: true };
}
