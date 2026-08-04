import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export type DeliveryMethod = "digital" | "physical";

export function usePurchaseGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      recipientName: string;
      recipientEmail?: string;
      message?: string;
      deliveryMethod: DeliveryMethod;
    }) => {
      const { data, error } = await supabase.rpc("purchase_gift_card", {
        p_amount: input.amount,
        p_recipient_name: input.recipientName,
        p_recipient_email: input.recipientEmail || null,
        p_message: input.message || null,
        p_delivery_method: input.deliveryMethod,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-cards", "mine"] });
    },
  });
}

export function useMyGiftCards() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["gift-cards", "mine"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_cards")
        .select("id, code, initial_amount, remaining_balance, currency, recipient_name, message, delivery_method, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export async function checkGiftCard(code: string) {
  const { data, error } = await supabase.rpc("check_gift_card", { p_code: code.trim() });
  if (error) throw error;
  return data?.[0] as { valid: boolean; remaining_balance: number; currency: string } | undefined;
}

/**
 * Claims a card for the signed-in account. The server throttles wrong guesses,
 * so surface its message rather than retrying.
 */
export async function redeemGiftCard(code: string) {
  const { data, error } = await supabase.rpc("redeem_gift_card", { p_code: code.trim() });
  if (error) throw error;
  return data?.[0] as { remaining_balance: number; currency: string } | undefined;
}
