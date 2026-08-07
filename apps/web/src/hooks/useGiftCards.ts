import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type DeliveryMethod = "digital" | "physical";

export function usePurchaseGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      recipientName?: string;
      message?: string;
      deliveryMethod: DeliveryMethod;
      buyerName?: string;
    }) => {
      const { data, error } = await supabase.rpc("purchase_gift_card", {
        p_amount: input.amount,
        p_recipient_name: input.recipientName || null,
        p_message: input.message || null,
        p_delivery_method: input.deliveryMethod,
        p_buyer_name: input.buyerName || null,
      });
      if (error) throw error;
      return data?.[0] as { code: string; id: string; original_amount: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-cards", "mine"] });
    },
  });
}

/** Checks a code. Same generic failure for every rejection reason. */
export async function checkGiftCardBalance(code: string) {
  const { data, error } = await supabase.rpc("check_gift_card_balance", {
    p_code: code.trim(),
  });
  if (error) throw error;
  return data?.[0] as
    | { remaining_balance: number; currency: string; from_name: string | null; card_message: string | null }
    | undefined;
}
