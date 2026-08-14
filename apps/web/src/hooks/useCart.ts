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
          // gift_wrap_price is deliberately NOT selected. CADO does not offer
          // wrapping, so no screen has a total to add it to. The column still
          // exists and place_order still reads it, but only when
          // customization.gift_wrap is true — and nothing sets that flag.
          // The partner's slug and logo are here for the "Your carts" screen,
          // which shows one card per store with its real logo.
          //
          // gift_card_amount_cents is null on every store line and set on
          // every gift card line — that one column is what separates the two
          // kinds of cart. A gift card line has no product and no store, by
          // design: there is no shop that sells it.
          "id, quantity, customization, gift_card_amount_cents, product:products(id, title, price, currency, partner:partners(id, name, slug, logo_url), product_images(storage_path, is_primary))"
        )
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Put a gift card in the cart.
 *
 * The amount is written as cents into its own column, not into the free-text
 * customization blob, because the database enforces a range on it and a
 * CHECK guarantees a line is either a product or a gift card — never both.
 * The note travels in `customization` exactly like a product's gift message
 * does, and `place_gift_card_order` reads it back out when it mints the card.
 *
 * Nothing here creates a card or touches a balance. This only records what
 * the shopper wants; the card itself is minted server-side at checkout.
 */
export function useAddGiftCardToCart() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      quantity?: number;
      deliveryMethod: "digital" | "physical";
      noteTo?: string;
      noteFrom?: string;
      noteMessage?: string;
    }) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("cart_items")
        .insert({
          profile_id: session.user.id,
          product_id: null,
          gift_card_amount_cents: Math.round(input.amount * 100),
          quantity: input.quantity ?? 1,
          customization: {
            delivery_method: input.deliveryMethod,
            note_to: input.noteTo?.trim() || null,
            note_from: input.noteFrom?.trim() || null,
            note_message: input.noteMessage?.trim() || null,
          },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}

/** Checkout for the gift card cart. Store carts go through place_order. */
export function usePlaceGiftCardOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deliveryAddressId?: string | null;
      notes?: string;
      paymentMethod: PaymentMethod;
      isGift?: boolean;
      recipientName?: string;
      recipientPhone?: string;
      addressSource?: "buyer" | "recipient_whatsapp";
      deliverySlot?: string;
    }) => {
      const { data, error } = await supabase.rpc("place_gift_card_order", {
        p_delivery_address_id: input.deliveryAddressId ?? null,
        p_notes: input.notes ?? null,
        p_payment_method: input.paymentMethod,
        p_is_gift: input.isGift ?? false,
        p_recipient_name: input.recipientName ?? null,
        p_recipient_phone: input.recipientPhone ?? null,
        p_address_source: input.addressSource ?? "buyer",
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
      /**
       * Which store's cart is being checked out. Omitted, the server orders
       * the whole cart exactly as it always did; set, it orders and empties
       * only that store — see p_partner_id in migration 0047. One order is
       * one store because one delivery is one trip.
       */
      partnerId?: string | null;
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
        p_partner_id: input.partnerId ?? null,
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
