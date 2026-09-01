"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * What the storefront puts first. These write the same `partners` columns the
 * storefront reads (`is_featured`, `featured_rank`, `tagline`,
 * `store_of_week`) — there is no separate publishing step and no copy of the
 * data, so a change here is live on cado-web on the shopper's next load.
 */

type Result = { ok: boolean; message?: string };

const uuid = z.string().uuid();

export async function setFeatured(partnerId: string, featured: boolean): Promise<Result> {
  await requireAdmin();
  if (!uuid.safeParse(partnerId).success) return { ok: false, message: "Unknown store." };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("partners")
    .update({ is_featured: featured })
    .eq("id", partnerId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/marketing");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setFeaturedRank(partnerId: string, rank: string): Promise<Result> {
  await requireAdmin();
  const parsed = z.coerce.number().int().min(1).max(99).safeParse(rank);
  if (!parsed.success) return { ok: false, message: "Order must be a number from 1 to 99." };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("partners")
    .update({ featured_rank: parsed.data })
    .eq("id", partnerId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true };
}

export async function setTagline(partnerId: string, tagline: string): Promise<Result> {
  await requireAdmin();
  const clean = tagline.trim().slice(0, 120);
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("partners")
    .update({ tagline: clean || null })
    .eq("id", partnerId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true };
}

export async function setStoreOfWeek(partnerId: string, on: boolean): Promise<Result> {
  await requireAdmin();
  if (!uuid.safeParse(partnerId).success) return { ok: false, message: "Unknown store." };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("partners")
    .update({ store_of_week: on })
    .eq("id", partnerId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/marketing");
  revalidatePath("/admin");
  return { ok: true };
}
