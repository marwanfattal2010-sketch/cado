"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/untyped";

/**
 * A store APPLIES; only an admin makes it live (§2.3).
 *
 * The service role is used because this is the one legitimate "no session
 * yet" provisioning path: the applicant does not exist until this runs. What
 * it creates is deliberately powerless — a `partner` profile pointing at a
 * partner row whose status is `pending` and whose is_live is false, which
 * the pending-lockout keeps out of everything except /store/pending.
 *
 * Slug collisions get a numeric suffix rather than an error: two shops named
 * "Roses" is the applicant's reality, not their mistake.
 */
const ApplicationSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  storeName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(200),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().max(80).optional().default(""),
  category: z.string().trim().max(200).optional().default(""),
  instagram: z.string().trim().max(120).optional().default(""),
  about: z.string().trim().max(2000).optional().default(""),
  password: z.string().min(10).max(200),
});

export async function submitApplication(
  _prev: { ok: boolean; message?: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message?: string }> {
  const parsed = ApplicationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: `${first.path.join(".")}: ${first.message}` };
  }
  const a = parsed.data;
  const db = createServiceRoleClient();

  // One application per email. A second submit is almost always a retry.
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  if ((existing?.users ?? []).some((u) => u.email?.toLowerCase() === a.email.toLowerCase())) {
    return { ok: false, message: "That email already has an account. Log in instead — or reset the password." };
  }

  const baseSlug = a.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  let slug = baseSlug || "store";
  for (let n = 2; n < 50; n++) {
    const { data: taken } = await db.from("partners").select("id").eq("slug", slug).limit(1);
    if (!taken?.length) break;
    slug = `${baseSlug}-${n}`;
  }

  // The pitch survives in description until 0068's application_text exists.
  const pitch = [
    a.about,
    a.category ? `Category: ${a.category}` : "",
    a.instagram ? `Instagram: ${a.instagram}` : "",
    `Applied: ${new Date().toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join("\n");

  // untypedFrom: is_live postdates the checked-in types (regen kills this).
  const { data: partner, error: pErr } = await untypedFrom(db as never, "partners")
    .insert({
      name: a.storeName,
      slug,
      status: "pending",
      is_live: false,
      city: a.city,
      description: pitch,
    })
    .select("id")
    .single();
  if (pErr) return { ok: false, message: `Could not save the application: ${pErr.message}` };

  const { data: created, error: uErr } = await db.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { full_name: a.ownerName },
  });
  if (uErr || !created?.user) {
    await db.from("partners").delete().eq("id", partner.id);
    return { ok: false, message: uErr?.message ?? "Could not create the account." };
  }

  const { error: profErr } = await db.from("profiles").upsert(
    {
      id: created.user.id,
      role: "partner",
      partner_id: partner.id,
      full_name: a.ownerName,
      phone: a.phone,
    },
    { onConflict: "id" }
  );
  if (profErr) return { ok: false, message: `Account created but not linked: ${profErr.message}` };

  // Tell the admins, in-app. Email rides on top when Resend works.
  await db.from("notifications").insert({
    partner_id: partner.id,
    channel: "in_app",
    template: "store_application",
    subject: `New store application: ${a.storeName}`,
    body: `${a.ownerName} (${a.city}) applied. ${a.about.slice(0, 200)}`,
    status: "sent",
  });

  return { ok: true };
}
