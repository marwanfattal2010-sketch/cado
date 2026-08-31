"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * §5.6 — a store replies publicly to a review of ITS OWN product.
 *
 * `store_reply` is the ONLY column this action writes. In particular it never
 * touches `reviews.status`: hiding a review is a CADO moderation decision
 * (policy `reviews_store_reply` would in fact let a partner write status too,
 * since it is a row-level policy with no column list — which is exactly why
 * the restriction is enforced here as well as being absent from the UI).
 *
 * The partner is re-derived from the session; the client sends only a review
 * id and some text.
 */

const replySchema = z
  .string()
  .trim()
  .max(1000, "Keep your reply under 1000 characters.");

export async function replyToReview(
  reviewId: string,
  reply: string
): Promise<{ ok: boolean; message: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) {
    return { ok: false, message: "That review couldn't be found." };
  }

  const parsed = replySchema.safeParse(reply);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your reply." };
  }

  // Clearing the box removes the reply rather than storing an empty string.
  const value = parsed.data === "" ? null : parsed.data;

  const { data, error } = await supabase
    .from("reviews")
    .update({ store_reply: value })
    .eq("id", reviewId)
    .eq("partner_id", user.partnerId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) {
    return { ok: false, message: "That review isn't on one of your products." };
  }

  revalidatePath("/store/reviews");
  return { ok: true, message: value ? "Reply posted." : "Reply removed." };
}
