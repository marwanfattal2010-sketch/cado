"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Admin catalogue management, under "admin full access to products".
 *
 * "Remove" is deactivation, never DELETE: order_items reference products, and
 * a store's sales history must survive its catalogue. A deactivated product
 * vanishes from the storefront instantly (the shopper query filters
 * is_active) but every past order still renders.
 */

const priceSchema = z.coerce.number().min(0.5).max(100000);
const stockSchema = z.coerce.number().int().min(0).max(100000);

export async function adminUpdateProduct(
  productId: string,
  input: { price?: number | string; stock_quantity?: number | string }
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = await createServerClient();

  const patch: { price?: number; stock_quantity?: number } = {};
  if (input.price !== undefined && input.price !== "") {
    const parsed = priceSchema.safeParse(input.price);
    if (!parsed.success) return { ok: false, message: "Price must be between $0.50 and $100,000." };
    patch.price = parsed.data;
  }
  if (input.stock_quantity !== undefined && input.stock_quantity !== "") {
    const parsed = stockSchema.safeParse(input.stock_quantity);
    if (!parsed.success) return { ok: false, message: "Stock must be a whole number, 0 or more." };
    patch.stock_quantity = parsed.data;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { data, error } = await supabase.from("products").update(patch).eq("id", productId).select("id");
  if (error || !data || data.length === 0) return { ok: false, message: error?.message ?? "No such product." };
  revalidatePath("/admin/products");
  revalidatePath("/admin/stores", "layout");
  return { ok: true };
}

export async function adminSetProductActive(
  productId: string,
  active: boolean
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: active })
    .eq("id", productId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, message: error?.message ?? "No such product." };
  revalidatePath("/admin/products");
  revalidatePath("/admin/stores", "layout");
  return { ok: true };
}

export async function adminCreateProduct(formData: FormData): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const supabase = await createServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const partnerId = String(formData.get("partner_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const price = priceSchema.safeParse(formData.get("price"));
  const stock = stockSchema.safeParse(formData.get("stock_quantity") || 0);
  const description = String(formData.get("description") ?? "").trim() || null;

  if (title.length < 3 || title.length > 120) return { ok: false, message: "Title must be 3–120 characters." };
  if (!partnerId) return { ok: false, message: "Pick a store." };
  if (!categoryId) return { ok: false, message: "Pick a category." };
  if (!price.success) return { ok: false, message: "Price must be between $0.50 and $100,000." };
  if (!stock.success) return { ok: false, message: "Stock must be a whole number, 0 or more." };

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) + `-${Date.now().toString(36)}`;

  // Created HIDDEN on purpose: a product with no photos yet should not appear
  // on the storefront the moment it is typed in.
  const { error } = await supabase.from("products").insert({
    title,
    slug,
    partner_id: partnerId,
    category_id: categoryId,
    price: price.data,
    stock_quantity: stock.data,
    description,
    is_active: false,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/products");
  revalidatePath("/admin/stores", "layout");
  return { ok: true, message: `Added "${title}" — hidden until you activate it.` };
}
