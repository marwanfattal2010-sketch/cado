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
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .limit(50);
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
      floor?: string;
      apartment?: string;
      notes?: string;
    }) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          ...input,
          // Optional text fields: store null, not "".
          building: input.building?.trim() || null,
          floor: input.floor?.trim() || null,
          apartment: input.apartment?.trim() || null,
          notes: input.notes?.trim() || null,
          profile_id: session.user.id,
          is_default: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

/** Street-level edits to an existing address (header area picker, mostly). */
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      city?: string;
      street?: string;
      building?: string | null;
      floor?: string | null;
      apartment?: string | null;
      notes?: string | null;
    }) => {
      if (!session) throw new Error("Not signed in");
      const { id, ...fields } = input;
      const { data, error } = await supabase.from("addresses").update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export type PaymentMethod = "cod" | "whish" | "omt" | "card";

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deliveryAddressId?: string | null;
      notes?: string;
      giftCardCode?: string;
      paymentMethod: PaymentMethod;
      isGift?: boolean;
      recipientName?: string;
      recipientPhone?: string;
      /** 'recipient_whatsapp' means we'll ask them for the address. */
      addressSource?: "buyer" | "recipient_whatsapp";
      hidePrice?: boolean;
      giftMessage?: string;
      deliverySlot?: string;
    }) => {
      const { data, error } = await supabase.rpc("place_order", {
        p_delivery_address_id: input.deliveryAddressId ?? null,
        p_notes: input.notes ?? null,
        p_gift_card_code: input.giftCardCode ?? null,
        p_payment_method: input.paymentMethod,
        p_is_gift: input.isGift ?? true,
        p_recipient_name: input.recipientName ?? null,
        p_recipient_phone: input.recipientPhone ?? null,
        p_address_source: input.addressSource ?? "buyer",
        p_hide_price: input.hidePrice ?? false,
        p_gift_message: input.giftMessage ?? null,
        p_delivery_time_slot: input.deliverySlot ?? null,
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
