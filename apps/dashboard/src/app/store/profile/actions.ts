"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * §5.5 — a store edits how ITS OWN shopfront reads.
 *
 * The partner_id is re-derived from the session inside the action; the form
 * never carries one. The `.eq("partner_id", ...)` on the update is belt and
 * braces behind "partner updates own row", which is already scoped to
 * my_partner_id() — but the products page taught us not to lean on a policy
 * alone when a filter is one line.
 *
 * DELIBERATELY NOT EDITABLE HERE:
 *   slug, status, commission_rate — 0026_lock_privilege_columns.sql pins all
 *   three with a BEFORE UPDATE trigger. Sending any of them would not just be
 *   ignored, it would raise and fail the whole save. So they are not in the
 *   patch and not in the form.
 *
 * There is no `instagram` column on partners in the live schema (checked
 * against the project's PostgREST definitions, not the spec), so there is no
 * Instagram field. Inventing one would mean a migration nobody asked for.
 */

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

/**
 * Images are URLs, not uploads. The dashboard has no upload helper today
 * (apps/web/src/lib/images.ts only reads public URLs out of an existing
 * bucket), and a file input wired to nothing is worse than an honest text
 * field — so the label says "URL" and means it.
 */
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), {
    message: "Image links must start with http:// or https://",
  })
  .transform((v) => (v === "" ? null : v));

const profileSchema = z.object({
  name: z.string().trim().min(2, "Your store needs a name.").max(120),
  tagline: text(160),
  description: text(2000),
  city: text(120),
  logo_url: imageUrl,
  cover_image_url: imageUrl,
  offers_gift_wrap: z.boolean(),
  pickup_address: text(500),
  driver_contact: text(60),
});

export async function updateStoreProfile(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    city: String(formData.get("city") ?? ""),
    logo_url: String(formData.get("logo_url") ?? ""),
    cover_image_url: String(formData.get("cover_image_url") ?? ""),
    // An unchecked checkbox sends nothing at all, which is exactly `false`.
    offers_gift_wrap: formData.get("offers_gift_wrap") === "on",
    pickup_address: String(formData.get("pickup_address") ?? ""),
    driver_contact: String(formData.get("driver_contact") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { data, error } = await supabase
    .from("partners")
    .update(parsed.data)
    .eq("id", user.partnerId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) {
    return { ok: false, message: "Couldn't save — this store isn't yours to edit." };
  }

  revalidatePath("/store/profile");
  revalidatePath("/store");
  return { ok: true, message: "Store profile saved." };
}
