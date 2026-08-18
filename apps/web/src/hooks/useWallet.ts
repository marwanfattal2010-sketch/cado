import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

/**
 * The CADO wallet.
 *
 * Everything here goes through SECURITY DEFINER functions — `my_wallet` and
 * `redeem_gift_card_to_wallet` — never a table read or write. That is not
 * ceremony: `wallets` has a SELECT policy and deliberately no UPDATE policy
 * at all, so a balance simply cannot be written from a browser, by this code
 * or by anyone's console.
 */

export type Wallet = {
  card_number: string;
  balance: number;
  currency: string;
};

export function useWallet() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["wallet", session?.user.id ?? "anon"],
    enabled: !!session,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Wallet | null> => {
      const { data, error } = await supabase.rpc("my_wallet");
      if (error) throw error;
      // The function returns a one-row table.
      const row = Array.isArray(data) ? data[0] : data;
      return row ? { ...row, balance: Number(row.balance) } : null;
    },
  });
}

/**
 * A card number is stored as twelve characters and shown in threes.
 * Formatting lives here so the card face and any future receipt agree.
 */
export function formatCardNumber(raw: string | null | undefined): string {
  if (!raw) return "XXXX-XXXX-XXXX";
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}

/**
 * What a person types, turned into what the server wants.
 *
 * New codes are twelve digits shown as XXXX-XXXX-XXXX. Cards sold before
 * the change carry twenty alphanumeric characters. Both are accepted, so
 * this only strips punctuation — deciding which format a code is belongs
 * to the database, the only place that knows what codes exist.
 */
export function normaliseCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** Live formatting for the redeem input: XXXX-XXXX-XXXX as you type. */
export function formatCodeInput(input: string): string {
  const raw = input.replace(/[\s-]/g, "").toUpperCase();
  // Only group while it still looks like a new-style numeric code. An old
  // twenty-character code would be mangled by regrouping, so it passes
  // through untouched — pasted or typed, with or without dashes.
  if (/^\d{1,12}$/.test(raw)) {
    return raw.replace(/(\d{4})(?=\d)/g, "$1-");
  }
  return raw;
}

export function useRedeemToWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, pin }: { code: string; pin?: string }) => {
      const { data, error } = await supabase.rpc("redeem_gift_card_to_wallet", {
        p_code: normaliseCode(code),
        p_pin: pin?.trim() || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        redeemed: Number(row?.redeemed ?? 0),
        newBalance: Number(row?.new_balance ?? 0),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["gift-cards"] });
    },
  });
}
