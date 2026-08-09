import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { daysUntil, type OccasionType } from "../lib/occasions";

export type OccasionReminder = {
  id: string;
  person_name: string;
  relationship: string | null;
  occasion_type: OccasionType;
  label: string | null;
  event_date: string;
  remind_days_before: number;
  phone: string | null;
  note: string | null;
};

export type OccasionInput = {
  person_name: string;
  relationship?: string | null;
  occasion_type: OccasionType;
  label?: string | null;
  event_date: string;
  remind_days_before?: number;
  phone?: string | null;
  note?: string | null;
};

/** Sorted by what's closest, because that is the only order anyone wants. */
export function useOccasions() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["occasions"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("occasion_reminders")
        .select(
          "id, person_name, relationship, occasion_type, label, event_date, remind_days_before, phone, note"
        );
      if (error) throw error;
      const rows = (data ?? []) as OccasionReminder[];
      return rows.slice().sort((a, b) => daysUntil(a.event_date) - daysUntil(b.event_date));
    },
  });
}

export function useAddOccasion() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: OccasionInput) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("occasion_reminders")
        .insert({
          profile_id: session.user.id,
          person_name: input.person_name.trim(),
          relationship: input.relationship?.trim() || null,
          occasion_type: input.occasion_type,
          label: input.label?.trim() || null,
          event_date: input.event_date,
          remind_days_before: input.remind_days_before ?? 7,
          phone: input.phone?.trim() || null,
          note: input.note?.trim() || null,
        })
        .select()
        .single();
      // The unique constraint is a feature: adding the same birthday twice
      // is always a mistake, so say so instead of surfacing Postgres.
      if (error) {
        if (error.code === "23505") throw new Error("You've already saved that date for them.");
        throw error;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["occasions"] }),
  });
}

export function useDeleteOccasion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("occasion_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["occasions"] }),
  });
}

export function useUpdateOccasion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<OccasionInput> & { id: string }) => {
      const { error } = await supabase.from("occasion_reminders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["occasions"] }),
  });
}

/**
 * Where the reminder would actually be sent from.
 *
 * Deliberately a stub. Sending needs a scheduled job and a working WhatsApp
 * sender, and neither exists yet — so this logs rather than letting the UI
 * imply a message went out. The UI must not claim otherwise.
 */
export function sendReminderStub(reminder: OccasionReminder) {
  // eslint-disable-next-line no-console
  console.log("[reminder:not-sent] would notify about", reminder.person_name, reminder.event_date);
}
