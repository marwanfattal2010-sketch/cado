import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function usePurchaseGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      recipientName: string;
      recipientEmail?: string;
      message?: string;
    }) => {
      const { data, error } = await supabase.rpc("purchase_gift_card", {
        p_amount: input.amount,
        p_recipient_name: input.recipientName,
        p_recipient_email: input.recipientEmail || null,
        p_message: input.message || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-cards", "mine"] });
    },
  });
}

export async function checkGiftCard(code: string) {
  const { data, error } = await supabase.rpc("check_gift_card", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data?.[0] as { valid: boolean; remaining_balance: number; currency: string } | undefined;
}
