"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

/**
 * A store edits ITS OWN catalogue: price, stock, sold-out, variant stock.
 * Every update carries an explicit partner_id filter as well as relying on
 * "partner manages own products" — the products page taught us not to lean on
 * RLS alone where the policy is deliberately wider than one store. Changing a
 * price affects FUTURE orders only: placed lines keep their snapshots.
 */

const priceSchema = z.coerce.number().min(0.5).max(100000);
const stockSchema = z.coerce.number().int().min(0).max(100000);

export async function updateProduct(
  productId: string,
  input: { price?: number | string; stock_quantity?: number | string }
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireStoreOwner();
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

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("partner_id", user.partnerId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "Not your product." };
  }
  revalidatePath("/store/products");
  return { ok: true };
}

export async function setProductActive(
  productId: string,
  active: boolean
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: active })
    .eq("id", productId)
    .eq("partner_id", user.partnerId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, message: error?.message ?? "Not your product." };
  }
  revalidatePath("/store/products");
  return { ok: true };
}

export async function updateVariantStock(
  variantId: string,
  stock: number | string
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const parsed = stockSchema.safeParse(stock);
  if (!parsed.success) return { ok: false, message: "Stock must be a whole number, 0 or more." };

  // product_variants has no partner_id — scope through the parent product.
  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, product_id, products!inner(partner_id)")
    .eq("id", variantId)
    .maybeSingle();

  const parent = variant?.products as unknown as { partner_id: string } | null;
  if (!parent || parent.partner_id !== user.partnerId) {
    return { ok: false, message: "Not your product." };
  }

  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: parsed.data })
    .eq("id", variantId);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/store/products");
  return { ok: true };
}
