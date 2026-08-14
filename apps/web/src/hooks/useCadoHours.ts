import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * Is CADO open, and when does it next open?
 *
 * Both answers come from Postgres (`cado_is_open`, `cado_next_open_at`, added
 * in migration 0045), which reads the one row in `app_settings` and does the
 * arithmetic in Asia/Beirut. The device clock is never consulted: a phone
 * with its timezone set wrong must not be able to book a 3am delivery, and
 * the same two functions back the trigger that rejects one server-side.
 *
 * `known: false` means the question could not be answered — most likely
 * because 0045 has not been applied yet. In that case every screen hides the
 * open/closed strip and offers no preorder wording, rather than guessing.
 * Nothing is lost by guessing wrong in that direction: the server rejects a
 * "Now" order placed while closed whatever the UI believed.
 */
export type CadoHours =
  | { known: false }
  | { known: true; isOpen: boolean; nextOpenAt: string | null };

export function useCadoHours() {
  return useQuery<CadoHours>({
    queryKey: ["cado-hours"],
    // A minute is plenty: the window only matters at the two edges of the
    // day, and this is checked again server-side at the moment of ordering.
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const [open, next] = await Promise.all([
        supabase.rpc("cado_is_open"),
        supabase.rpc("cado_next_open_at"),
      ]);
      if (open.error || next.error) return { known: false };
      return {
        known: true,
        isOpen: Boolean(open.data),
        nextOpenAt: (next.data as string | null) ?? null,
      };
    },
  });
}

/**
 * "Closed · Preorder for today at 9:00 AM", or "for tomorrow" when the next
 * opening is not today. Returns null while open or while unknown, so a
 * caller can render nothing without a special case.
 *
 * Today/tomorrow is decided by comparing calendar dates in Beirut, not by
 * subtracting hours — at 11pm the next opening is ten hours away and is
 * still "tomorrow".
 */
export function closedLabel(hours: CadoHours): string | null {
  if (!hours.known || hours.isOpen || !hours.nextOpenAt) return null;

  const next = new Date(hours.nextOpenAt);
  if (Number.isNaN(next.getTime())) return null;

  const inBeirut = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", dateStyle: "short" }).format(d);
  const day = inBeirut(next) === inBeirut(new Date()) ? "today" : "tomorrow";

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    hour: "numeric",
    minute: "2-digit",
  }).format(next);

  return `Closed · Preorder for ${day} at ${time}`;
}
