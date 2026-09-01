"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { s } from "./strings";

/**
 * Dispatch mutations. Three things are true of every action here:
 *
 *  1. requireAdmin() first, and the database re-checks. drivers/deliveries are
 *     admin-only by RLS (0068) and status moves go through
 *     admin_set_sub_order_status(), which raises 'admin only' inside the
 *     database. The browser cannot get past either by lying about a role.
 *
 *  2. Nothing here invents a number. A delivery cost is written only when an
 *     admin typed one; a driver is written only when one was picked.
 *
 *  3. Drivers are deactivated, never deleted. deliveries.driver_id is ON
 *     DELETE SET NULL, so deleting a driver would quietly erase who made
 *     every delivery they ever made.
 *
 * Sub-order ids arrive from the client. That is not a trust problem: they are
 * not credentials, and admin_set_sub_order_status() gates on is_admin() and
 * refuses to reopen a delivered or cancelled order regardless of who calls it.
 * It is the same contract /admin/orders already uses.
 */

export type ActionResult = { ok: boolean; message?: string };

const PATH = "/admin/delivery";

/** Postgres unique_violation — the deliveries row was created concurrently. */
const UNIQUE_VIOLATION = "23505";

function refresh() {
  revalidatePath(PATH);
}

/**
 * Parse a cost the admin typed. Empty stays empty — a blank cost field means
 * "not known yet", and turning that into the standard fee would be inventing
 * a figure that later reads as recorded fact.
 */
function parseCost(raw: FormDataEntryValue | null): { ok: true; value: number | null } | { ok: false } {
  const text = String(raw ?? "").trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return { ok: false };
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Assign (or reassign) a driver to an order, optionally recording what the
 * delivery cost. One deliveries row per order — unique(order_id) — so this
 * updates when the row exists and inserts when it does not, and treats a
 * concurrent insert as an update rather than an error.
 */
export async function assignDriver(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const orderId = String(formData.get("orderId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  if (!UUID.test(orderId)) return { ok: false, message: s("delivery.error.generic") };
  if (!UUID.test(driverId)) return { ok: false, message: s("delivery.error.needdriver") };

  const cost = parseCost(formData.get("cost"));
  if (!cost.ok) return { ok: false, message: s("delivery.error.badcost") };

  const { data: existing, error: readErr } = await supabase
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };

  // A blank cost field leaves whatever is already recorded alone; it does not
  // wipe a figure someone entered earlier.
  const patch: { driver_id: string; cost?: number } = { driver_id: driverId };
  if (cost.value !== null) patch.cost = cost.value;

  if (existing) {
    const { error } = await supabase.from("deliveries").update(patch).eq("id", existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from("deliveries")
      .insert({ order_id: orderId, driver_id: driverId, cost: cost.value });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const { error: retry } = await supabase.from("deliveries").update(patch).eq("order_id", orderId);
        if (retry) return { ok: false, message: retry.message };
      } else {
        return { ok: false, message: error.message };
      }
    }
  }

  refresh();
  return { ok: true };
}

/**
 * Advance every one of this order's store portions that is currently `ready`
 * to `out_for_delivery`. Status is per store (sub_orders.status) — orders has
 * no status column — so an order goes on the road one sub-order at a time and
 * the caller passes exactly the ones that are ready.
 */
export async function markOutForDelivery(subOrderIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const ids = subOrderIds.filter((id) => UUID.test(id));
  if (ids.length === 0) return { ok: false, message: s("delivery.error.generic") };

  for (const id of ids) {
    const { error } = await supabase.rpc("admin_set_sub_order_status", {
      p_sub_order_id: id,
      p_status: "out_for_delivery",
    });
    if (error) return { ok: false, message: error.message };
  }

  refresh();
  revalidatePath("/admin/orders");
  return { ok: true };
}

/**
 * Mark the order delivered: every out-for-delivery store portion moves to
 * `delivered`, and the deliveries row gets its delivered_at stamp. If no
 * deliveries row exists (delivered without ever being assigned a driver) one
 * is created with driver_id null — a truthful record of an unassigned
 * delivery beats no record at all, and null is not a guess.
 */
export async function markDelivered(
  orderId: string,
  subOrderIds: string[]
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  if (!UUID.test(orderId)) return { ok: false, message: s("delivery.error.generic") };
  const ids = subOrderIds.filter((id) => UUID.test(id));
  if (ids.length === 0) return { ok: false, message: s("delivery.error.generic") };

  for (const id of ids) {
    const { error } = await supabase.rpc("admin_set_sub_order_status", {
      p_sub_order_id: id,
      p_status: "delivered",
    });
    if (error) return { ok: false, message: error.message };
  }

  const stamp = new Date().toISOString();
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id, delivered_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    // Idempotent: an already-stamped delivery keeps its first stamp. Pressing
    // the button twice must not rewrite when it actually arrived.
    if (!existing.delivered_at) {
      const { error } = await supabase
        .from("deliveries")
        .update({ delivered_at: stamp })
        .eq("id", existing.id);
      if (error) return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase
      .from("deliveries")
      .insert({ order_id: orderId, delivered_at: stamp });
    if (error && error.code !== UNIQUE_VIOLATION) {
      return { ok: false, message: error.message };
    }
  }

  refresh();
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Add a driver. Name and phone are both required; nothing else is guessed. */
export async function addDriver(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { ok: false, message: s("delivery.error.needname") };

  const { error } = await supabase.from("drivers").insert({ name, phone });
  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true };
}

/**
 * Activate or deactivate a driver. There is no delete: a driver who stops
 * working still made the deliveries they made, and deliveries.driver_id is
 * ON DELETE SET NULL, so a delete would silently blank that history.
 */
export async function setDriverActive(driverId: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  if (!UUID.test(driverId)) return { ok: false, message: s("delivery.error.generic") };

  const { error } = await supabase.from("drivers").update({ active }).eq("id", driverId);
  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true };
}

/**
 * ADMIN OVERRIDE (V3 §8, V4 §7).
 *
 * Marwan's objection stands: "why would I mark as delivered? I'm the admin."
 * The store marks a parcel ready, the driver marks it picked up and delivered.
 * The admin's job is to assign and to watch.
 *
 * But things go wrong — a driver's phone dies, a store forgets. So the admin
 * keeps ONE way to move a status, and it costs a written reason that lands in
 * the audit trail next to who typed it. A free "Mark delivered" button makes
 * the delivery record a guess; this makes an override a deliberate, attributable
 * act.
 */
export async function overrideStatus(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerClient();

  const subOrderId = String(formData.get("subOrderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID.test(subOrderId)) return { ok: false, message: s("delivery.error.generic") };
  if (!["ready", "out_for_delivery", "delivered", "cancelled"].includes(status)) {
    return { ok: false, message: "That is not a status this page can set." };
  }
  if (reason.length < 5) {
    return { ok: false, message: "Say why you are overriding — it goes in the record." };
  }

  const { data: before } = await supabase
    .from("sub_orders")
    .select("status, order_id, partner_id")
    .eq("id", subOrderId)
    .maybeSingle();

  const { error } = await supabase.rpc("admin_set_sub_order_status", {
    p_sub_order_id: subOrderId,
    p_status: status,
  });
  if (error) return { ok: false, message: error.message };

  // The reason is the point of the whole action; if the note fails to save the
  // admin needs to know the trail is incomplete.
  const { error: noteError } = await supabase.from("order_events").insert({
    sub_order_id: subOrderId,
    order_id: before?.order_id ?? null,
    partner_id: before?.partner_id ?? null,
    actor_id: admin.id,
    actor_role: "admin",
    event_type: "admin_override",
    from_status: before?.status ?? null,
    to_status: status,
    message: reason,
  });

  refresh();
  revalidatePath("/admin/orders");
  if (noteError) {
    return { ok: false, message: `Status changed, but the reason was not recorded: ${noteError.message}` };
  }
  return { ok: true };
}

/**
 * Set the delivery fee CADO pays the driver for one run. Empty clears it.
 * Kept separate from assignment so recording a cost never moves a status.
 */
export async function setDeliveryCost(subOrderId: string, cost: string): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(subOrderId)) return { ok: false, message: s("delivery.error.generic") };
  const supabase = await createServerClient();

  const trimmed = cost.trim();
  let value: number | null = null;
  if (trimmed !== "") {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      return { ok: false, message: "Enter a cost between $0 and $1,000, or leave it blank." };
    }
    value = n;
  }

  const { error } = await supabase
    .from("delivery_assignments")
    .update({ cost: value })
    .eq("sub_order_id", subOrderId);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true };
}
