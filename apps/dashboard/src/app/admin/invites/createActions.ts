"use server";

/**
 * CREATE ACCESS: make a store with its owner login, add an owner to a store
 * that already exists, or make another CADO admin.
 *
 * WHY THESE EXIST ALONGSIDE inviteStoreOwner().
 *
 * The invite path emails a link and lets the person choose their own password,
 * which is the better mechanism — and it does not work here yet. Resend is in
 * sandbox (only the project owner's address receives anything) and the
 * dashboard's URL is not in Supabase's redirect allow-list, so the link would
 * bounce to the storefront even if it arrived. An invite that silently goes
 * nowhere is worse than no invite.
 *
 * So these actions create the account directly and hand the ONE-TIME PASSWORD
 * back to the admin on screen, to pass to the person however they actually
 * talk — WhatsApp, a phone call. It is shown exactly once, never emailed,
 * never stored by us, and the person is told to change it.
 *
 * Security shape, identical in all three:
 *   - requireAdmin() first. The role written is a constant in this file, never
 *     a value from the form, so no request can ask for a role it wasn't given.
 *   - The service role does the provisioning, which is the one legitimate
 *     "auth.uid() is null" path the 0026 trigger allows. A store owner can
 *     never run any of it against themselves.
 *   - If a later step fails, the earlier ones are undone, so a half-made store
 *     with no owner never survives.
 */

import { z } from "zod";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface AccessState {
  error?: string;
  success?: string;
  /** Shown once, in the UI, then gone. Never persisted, never emailed. */
  password?: string;
  email?: string;
}

/**
 * Readable but not guessable: two words, a number, a symbol. Long enough for
 * the 10-character rule and easy to read down a phone line, which is how these
 * will actually be delivered.
 */
const WORDS = [
  "cedar", "olive", "jasmine", "harbour", "lantern", "saffron", "almond",
  "marble", "cypress", "coral", "amber", "walnut", "mint", "fig",
];
function makePassword(): string {
  const w = () => WORDS[randomInt(WORDS.length)];
  return `${w()}-${w()}-${randomInt(1000, 9999)}`;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "store";

async function freeSlug(service: ReturnType<typeof createServiceRoleClient>, base: string) {
  let slug = base;
  for (let n = 2; n < 60; n++) {
    const { data } = await service.from("partners").select("id").eq("slug", slug).limit(1);
    if (!data?.length) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${randomInt(1000, 9999)}`;
}

/** True when some account already uses this address. */
async function emailTaken(service: ReturnType<typeof createServiceRoleClient>, email: string) {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
}

/* ------------------------------------------- 1. new store + its owner ----- */

const newStoreSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional().default(""),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(30).optional().default(""),
});

export async function createStoreWithOwner(
  _prev: AccessState,
  formData: FormData
): Promise<AccessState> {
  const admin = await requireAdmin();
  const parsed = newStoreSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Fill in the store name, the owner's name and a valid email." };
  }
  const a = parsed.data;
  const service = createServiceRoleClient();

  if (await emailTaken(service, a.email)) {
    return { error: "That email already has an account. Use “Add someone to an existing store” instead." };
  }

  const slug = await freeSlug(service, slugify(a.storeName));
  const { data: partner, error: pErr } = await service
    .from("partners")
    .insert({
      name: a.storeName,
      slug,
      status: "active",
      is_live: true,
      city: a.city || null,
    })
    .select("id, name")
    .single();
  if (pErr || !partner) return { error: `Could not create the store: ${pErr?.message ?? "unknown error"}` };

  const password = makePassword();
  const { data: created, error: uErr } = await service.auth.admin.createUser({
    email: a.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: a.ownerName },
  });
  if (uErr || !created?.user) {
    // Don't leave a store nobody can log into.
    await service.from("partners").delete().eq("id", partner.id);
    return { error: `Could not create the login: ${uErr?.message ?? "unknown error"}` };
  }

  const { error: profErr } = await service.from("profiles").upsert(
    {
      id: created.user.id,
      role: "partner",
      partner_id: partner.id,
      store_role: "owner",
      full_name: a.ownerName,
      phone: a.phone || null,
    },
    { onConflict: "id" }
  );
  if (profErr) {
    await service.auth.admin.deleteUser(created.user.id);
    await service.from("partners").delete().eq("id", partner.id);
    return { error: `Could not finish setting up the account: ${profErr.message}` };
  }

  await service.from("store_owner_invites").insert({
    email: a.email,
    partner_id: partner.id,
    invited_by: admin.id,
    auth_user_id: created.user.id,
    status: "pending",
    note: "Created directly by an admin with a one-time password.",
  });

  revalidatePath("/admin/invites");
  revalidatePath("/admin/stores");
  return {
    success: `${partner.name} is live, and ${a.ownerName} can sign in now.`,
    password,
    email: a.email,
  };
}

/* --------------------------------- 2. another login for an existing store - */

const addOwnerSchema = z.object({
  partnerId: z.string().uuid(),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(30).optional().default(""),
  storeRole: z.enum(["owner", "staff"]),
});

export async function addOwnerToStore(
  _prev: AccessState,
  formData: FormData
): Promise<AccessState> {
  const admin = await requireAdmin();
  const parsed = addOwnerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Pick a store and fill in a name and valid email." };
  const a = parsed.data;
  const service = createServiceRoleClient();

  const { data: partner } = await service.from("partners").select("id, name").eq("id", a.partnerId).single();
  if (!partner) return { error: "That store no longer exists." };

  if (await emailTaken(service, a.email)) {
    return { error: "That email already has an account. One person, one login — use a different address." };
  }

  const password = makePassword();
  const { data: created, error: uErr } = await service.auth.admin.createUser({
    email: a.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: a.ownerName },
  });
  if (uErr || !created?.user) return { error: `Could not create the login: ${uErr?.message ?? "unknown"}` };

  const { error: profErr } = await service.from("profiles").upsert(
    {
      id: created.user.id,
      role: "partner",
      partner_id: a.partnerId,
      store_role: a.storeRole,
      full_name: a.ownerName,
      phone: a.phone || null,
    },
    { onConflict: "id" }
  );
  if (profErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return { error: `Could not finish setting up the account: ${profErr.message}` };
  }

  await service.from("store_owner_invites").insert({
    email: a.email,
    partner_id: a.partnerId,
    invited_by: admin.id,
    auth_user_id: created.user.id,
    status: "pending",
    note: `Created directly by an admin as ${a.storeRole}.`,
  });

  revalidatePath("/admin/invites");
  return {
    success: `${a.ownerName} can now sign in for ${partner.name}${a.storeRole === "staff" ? " as staff" : ""}.`,
    password,
    email: a.email,
  };
}

/* ----------------------------------------------- 3. another CADO admin ---- */

const adminSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
});

export async function createAdminAccount(
  _prev: AccessState,
  formData: FormData
): Promise<AccessState> {
  await requireAdmin();
  const parsed = adminSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Enter a name and a valid email." };
  const a = parsed.data;
  const service = createServiceRoleClient();

  if (await emailTaken(service, a.email)) {
    return {
      error:
        "That email already has an account. Use “Make admin” on the Settings page to promote it instead.",
    };
  }

  const password = makePassword();
  const { data: created, error: uErr } = await service.auth.admin.createUser({
    email: a.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: a.fullName },
  });
  if (uErr || !created?.user) return { error: `Could not create the account: ${uErr?.message ?? "unknown"}` };

  // 'admin' is a literal here, never a form value.
  const { error: profErr } = await service
    .from("profiles")
    .upsert({ id: created.user.id, role: "admin", partner_id: null, full_name: a.fullName }, { onConflict: "id" });
  if (profErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return { error: `Could not grant admin: ${profErr.message}` };
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin/settings");
  return {
    success: `${a.fullName} is now a CADO admin and can see everything.`,
    password,
    email: a.email,
  };
}
