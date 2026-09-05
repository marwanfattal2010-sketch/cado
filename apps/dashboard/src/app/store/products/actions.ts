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
  input: {
    price?: number | string;
    stock_quantity?: number | string;
    /**
     * The "was" price, and the ONLY thing that puts a product on sale.
     *
     * The storefront reads these two numbers and nothing else to decide the
     * discount badge, the struck-through price, and who appears in Super
     * Deals — there is no separate "featured" list to curate. Set it above the
     * price and the product goes on sale; clear it and it comes off.
     */
    compare_at_price?: number | string | null;
  }
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const patch: {
    price?: number;
    stock_quantity?: number;
    compare_at_price?: number | null;
  } = {};
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

  /*
   * Emptying the box is a real action, not a no-op: it is how a shop ENDS a
   * promotion without touching what it charges.
   *
   * A value that is not above the price is refused rather than stored. The
   * storefront ignores such a row, so saving it would leave the owner looking
   * at a field that accepted their number and visibly did nothing — worse than
   * being told why.
   */
  if (input.compare_at_price !== undefined) {
    if (input.compare_at_price === "" || input.compare_at_price === null) {
      patch.compare_at_price = null;
    } else {
      const parsed = priceSchema.safeParse(input.compare_at_price);
      if (!parsed.success) {
        return { ok: false, message: "Was-price must be between $0.50 and $100,000." };
      }
      const { data: current } = await supabase
        .from("products")
        .select("price")
        .eq("id", productId)
        .eq("partner_id", user.partnerId)
        .maybeSingle();
      const priceNow =
        input.price !== undefined && input.price !== ""
          ? Number(input.price)
          : Number(current?.price ?? 0);
      if (parsed.data <= priceNow) {
        return {
          ok: false,
          message: "The was-price has to be higher than the price, or it isn't a discount.",
        };
      }
      patch.compare_at_price = parsed.data;
    }
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

/**
 * The two curation flags the storefront's category tabs read (0085).
 *
 * `is_pick` is what makes the "Store picks" card possible at all: it is the
 * honest stand-in for "Best sellers" on a tab where too few products have
 * been ordered to rank anything. Without a control here nobody could ever set
 * it, and that section could only ever be empty.
 *
 * `is_gift_ready` is the store owner saying this item arrives boxed or
 * wrapped — the "Ready to gift" section, and a claim only they can make.
 */
export async function setProductFlag(
  productId: string,
  flag: "is_pick" | "is_gift_ready",
  value: boolean
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  // Written out rather than `{ [flag]: value }`: a computed key widens to a
  // string index signature, which the generated Update type rejects outright.
  const patch = flag === "is_pick" ? { is_pick: value } : { is_gift_ready: value };

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    // The ownership check is belt-and-braces beside RLS, not instead of it:
    // it turns "someone else's product" into a clear message rather than a
    // silent zero-row update.
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
