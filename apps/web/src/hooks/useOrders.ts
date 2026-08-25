import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

/**
 * Order reads for the customer's own screens. RLS scopes every query to the
 * logged-in customer; nothing here can see anyone else's orders.
 *
 * One order = one store is enforced by trigger (0046), so screens may treat
 * sub_orders[0] as THE store without a loop.
 */

/** The list: enough for the card — store, status, thumbnails, total. */
export function useOrders() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["orders"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        // ONE unbroken literal. Split across `+` it widens to `string` and
        // the typed client returns GenericStringError instead of rows — the
        // same trap PRODUCT_CARD_COLUMNS documents.
        .select(
          "id, order_number, total, created_at, payment_method, recipient_name, sub_orders(id, status, total, partner:partners(id, name, slug), order_items(id, product_title_snapshot, quantity, line_total, product:products(id, is_active, stock_quantity, product_images(storage_path, is_primary))))"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

/** The detail page: everything the money block and the timeline need. */
export function useOrder(orderId: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["order", orderId ?? "none"],
    enabled: !!session && !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        // ONE unbroken literal — same reason as the list query above.
        .select(
          "id, order_number, total, subtotal, delivery_fee, discount_amount, wallet_amount, payment_method, payment_status, created_at, delivery_slot, is_gift, recipient_name, address:addresses(recipient_name, city, area, street, building, floor, apartment), sub_orders(id, status, created_at, updated_at, partner:partners(id, name, slug), order_items(id, product_title_snapshot, unit_price_snapshot, quantity, line_total, product:products(id, is_active, stock_quantity, product_images(storage_path, is_primary))))"
        )
        .eq("id", orderId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

type ReorderItem = {
  quantity: number;
  product: { id: string; is_active: boolean; stock_quantity: number | null } | null;
};

/**
 * Reorder: every line of a past order goes back into the cart, except what
 * can no longer be sold. The caller gets the honest tally for the toast —
 * "Added X of Y items" is a claim, so it is computed, not assumed.
 *
 * Lines are re-added at today's price by design: the cart reads live product
 * rows, and quietly charging last month's price would be wrong in the other
 * direction.
 */
export function useReorder() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      if (!session) throw new Error("Log in to reorder.");
      const sellable = items.filter(
        (i) => i.product && i.product.is_active && (i.product.stock_quantity ?? 0) > 0
      );
      const skipped = items.filter((i) => !sellable.includes(i));

      for (const line of sellable) {
        const stock = line.product?.stock_quantity ?? line.quantity;
        await supabase.from("cart_items").insert({
          profile_id: session.user.id,
          product_id: line.product!.id,
          // Never promise more than the shelf holds today.
          quantity: Math.min(line.quantity, Math.max(1, stock)),
        });
      }

      return {
        added: sellable.length,
        total: items.length,
        skippedTitles: skipped.map(
          (i) => (i as ReorderItem & { product_title_snapshot?: string }).product_title_snapshot ?? "an item"
        ),
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}
