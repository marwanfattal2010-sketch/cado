import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function useCart() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["cart"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          "id, quantity, customization, product:products(id, title, price, currency, gift_wrap_price, partner:partners(id, name), product_images(storage_path, is_primary))"
        )
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cartItemId: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useAddresses() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["addresses"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      label: string;
      recipient_name: string;
      phone: string;
      city: string;
      area: string;
      street: string;
      building?: string;
    }) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("addresses")
        .insert({ ...input, profile_id: session.user.id, is_default: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deliveryAddressId: string;
      notes?: string;
      giftCardCode?: string;
      giftCardPin?: string;
      paymentMethod: "cod" | "whish";
    }) => {
      const { data, error } = await supabase.rpc("place_order", {
        p_delivery_address_id: input.deliveryAddressId,
        p_notes: input.notes ?? null,
        p_gift_card_code: input.giftCardCode ?? null,
        p_gift_card_pin: input.giftCardPin ?? null,
        p_payment_method: input.paymentMethod,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
