import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

/**
 * The two real numbers in the header (spec 1.11): points earned and unread
 * notifications.
 *
 * Both are genuinely zero for a new account and both render as zero rather
 * than being hidden or invented — "0 pts" is the truth, and a starting balance
 * nobody earned would be the first lie the app tells.
 */

export function usePoints() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["points", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_points");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

export type NotificationRow = {
  id: string;
  subject: string | null;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["notifications", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      // RLS scopes this to the caller — there is no user filter here on
      // purpose, so a mistake in this file cannot widen it.
      const { data } = await supabase
        .from("notifications")
        .select("id, subject, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useUnreadCount() {
  const notifications = useNotifications();
  return (notifications.data ?? []).filter((n) => !n.read_at).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** The points ledger, for the Points page. */
export function usePointsHistory() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["points-history", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("points_transactions")
        .select("id, delta, reason, created_at, order_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
}
