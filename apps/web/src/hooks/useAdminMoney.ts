import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function useAdminMoneySummary() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["admin", "money-summary"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_money_summary");
      if (error) throw error;
      return data;
    },
  });
}

export function useReconcileGiftCards() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["admin", "reconcile"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reconcile_gift_cards");
      if (error) throw error;
      return data;
    },
  });
}
