import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Occasion } from "../components/giftcard/GiftNote";

/**
 * Group gift cards.
 *
 * Every number on the group page comes back from `get_pool_by_slug`, which
 * recalculates the totals in Postgres on every call. Nothing here adds up
 * contributions client-side: a total the browser worked out is a total a
 * browser can be made to lie about, and this one decides when a card worth
 * hundreds of dollars gets issued.
 *
 * The tables themselves are unreadable from the client by design — there is
 * no select policy on either — so these functions are the only way in.
 */

export type PoolStatus = "open" | "funded" | "sent" | "cancelled";

export type PoolContributor = {
  name: string;
  /** null when the contributor asked for their amount to stay hidden. */
  amount_cents: number | null;
  hidden: boolean;
  message: string | null;
  status: "pending" | "confirmed" | "refund_required";
};

export type Pool = {
  slug: string;
  recipient_name: string;
  occasion: Occasion;
  goal_cents: number;
  confirmed_cents: number;
  pending_cents: number;
  contributor_count: number;
  status: PoolStatus;
  deadline: string | null;
  is_organizer: boolean;
  contributors: PoolContributor[];
};

/**
 * A wrong slug returns no rows rather than an error, so `null` here means
 * "no such group" and is rendered as a plain not-found — never as a message
 * that would tell somebody guessing links that they got close.
 */
export function usePool(slug: string | undefined) {
  return useQuery({
    queryKey: ["gift-card-pool", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Pool | null> => {
      const { data, error } = await supabase.rpc("get_pool_by_slug", { p_slug: slug });
      if (error) throw error;
      const row = (data as Pool[] | null)?.[0];
      if (!row) return null;
      return {
        ...row,
        confirmed_cents: Number(row.confirmed_cents),
        pending_cents: Number(row.pending_cents),
        contributors: (row.contributors ?? []) as PoolContributor[],
      };
    },
  });
}

export function useCreatePool() {
  return useMutation({
    mutationFn: async (input: {
      recipientName: string;
      occasion: Occasion;
      goalCents: number;
      deadline?: string | null;
      noteTo?: string | null;
      noteFrom?: string | null;
      noteMessage?: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc("create_gift_card_pool", {
        p_recipient_name: input.recipientName,
        p_occasion: input.occasion,
        p_goal_cents: input.goalCents,
        p_deadline: input.deadline || null,
        p_note_to: input.noteTo || null,
        p_note_from: input.noteFrom || null,
        p_note_message: input.noteMessage || null,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useContribute(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contributorName: string;
      amountCents: number;
      paymentRef?: string;
      message?: string;
      hideAmount: boolean;
    }) => {
      const { data, error } = await supabase.rpc("contribute_to_pool", {
        p_slug: slug,
        p_contributor_name: input.contributorName,
        p_amount_cents: input.amountCents,
        p_payment_ref: input.paymentRef || null,
        p_message: input.message || null,
        p_hide_amount: input.hideAmount,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gift-card-pool", slug] }),
  });
}

export function useCancelPool(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase.rpc("cancel_gift_card_pool", { p_pool_id: poolId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gift-card-pool", slug] }),
  });
}

/**
 * The organizer's own row for this pool, read straight from the table.
 *
 * `cancel` and `issue` are addressed by id, and the public function
 * deliberately does not hand the id out. The organizer can read their own
 * pools directly under the one select policy that exists, so this returns a
 * row for them and nothing for everybody else — which is exactly the same
 * boundary the functions themselves enforce.
 */
export function useMyPoolBySlug(slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["gift-card-pool", "mine", slug],
    enabled: !!slug && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, slug, status, gift_card_id")
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIssuePoolCard(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { poolId: string; deliveryMethod: "digital" | "physical" }) => {
      const { data, error } = await supabase.rpc("issue_pool_gift_card", {
        p_pool_id: input.poolId,
        p_delivery_method: input.deliveryMethod,
      });
      if (error) throw error;
      return data?.[0] as { code: string; id: string; original_amount: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gift-card-pool", slug] }),
  });
}

/** The organizer's own pools, read straight from the table — the one select
 *  policy that exists covers exactly this. */
export function useMyPools(enabled: boolean) {
  return useQuery({
    queryKey: ["gift-card-pools", "mine"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, slug, recipient_name, occasion, goal_cents, status, deadline, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
