"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Support + reviews moderation mutations (§4.11).
 *
 * Three rules hold across every action here:
 *
 *  1. Nothing is ever DELETED. A ticket closes, a review hides. Both are
 *     reversible and both leave the row — moderation history is evidence, and
 *     a deleted review is an unanswerable customer complaint.
 *  2. author_id comes from requireAdmin(), never from the form. The client
 *     posts a body and an id; who wrote it is decided server-side against the
 *     verified session, which is also what the replies_write RLS policy
 *     (`author_id = auth.uid()`) independently enforces.
 *  3. Every write runs on the request-scoped anon client, so RLS applies as
 *     the signed-in admin. requireAdmin() is the fast, friendly gate; the
 *     policy is the real one.
 */

const PATH = "/admin/support";

export type ActionResult = { ok: boolean; message?: string };

/**
 * Post an admin reply and flip the ticket to 'replied'.
 *
 * Deliberately NOT transactional across the two statements: if the status
 * update fails after the insert lands, the reply is still saved and the
 * ticket simply stays 'open' — which is the safe way round. The opposite
 * (ticket marked replied with no reply stored) would hide a customer who is
 * still waiting.
 */
export async function replyToTicket(
  ticketId: string,
  body: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerClient();

  const text = body.trim();
  if (!text) return { ok: false, message: "Write a reply first." };
  // Mirrors the CHECK constraint (char_length <= 2000) so the user gets a
  // sentence instead of a Postgres error.
  if (text.length > 2000) {
    return { ok: false, message: "Replies are limited to 2000 characters." };
  }

  const { error: insertError } = await supabase.from("support_replies").insert({
    ticket_id: ticketId,
    author_id: admin.id,
    body: text,
  });
  if (insertError) return { ok: false, message: insertError.message };

  const { error: statusError } = await supabase
    .from("support_tickets")
    .update({ status: "replied" })
    .eq("id", ticketId)
    // Don't drag a closed ticket back open just because a note was added.
    .neq("status", "closed");
  if (statusError) return { ok: false, message: statusError.message };

  revalidatePath(PATH);
  return { ok: true };
}

/** Close or reopen a ticket. Never deletes. */
export async function setTicketStatus(
  ticketId: string,
  status: "open" | "closed"
): Promise<ActionResult> {
  await requireAdmin();
  if (status !== "open" && status !== "closed") {
    return { ok: false, message: "Unknown status." };
  }
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Hide or show a review. 'hidden' takes it off the storefront; the row, its
 * rating and its text all stay exactly as the customer wrote them.
 */
export async function setReviewStatus(
  reviewId: string,
  status: "visible" | "hidden"
): Promise<ActionResult> {
  await requireAdmin();
  if (status !== "visible" && status !== "hidden") {
    return { ok: false, message: "Unknown status." };
  }
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", reviewId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(PATH);
  return { ok: true };
}
