import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Escape hatch for tables NEWER than the checked-in database.types.ts.
 *
 * The types were generated before migrations 0063+ (wallets, pools) and
 * cannot be regenerated without the management token, which this build asks
 * for exactly once at migration time. Every call site of this helper is a
 * TODO that dies the day `supabase gen types` runs again — grep for
 * untypedFrom and replace with plain .from() then.
 *
 * It bypasses TypeScript only. RLS neither knows nor cares about the types.
 */
export function untypedFrom(client: SupabaseClient<never>, table: string) {
  return (client as unknown as SupabaseClient).from(table);
}
