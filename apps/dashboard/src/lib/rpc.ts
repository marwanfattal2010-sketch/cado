/**
 * Call a Postgres function whose signature is not in the generated types yet.
 *
 * `database.types.ts` is regenerated FROM the live database, so a function
 * added by a migration that has not been applied cannot appear in it — and
 * until it does, `supabase.rpc("new_function")` is a type error. The choice is
 * a cast at every call site or one honest helper; this is the helper.
 *
 * It returns the PostgREST error too, so callers can spot `PGRST202`
 * ("function does not exist") and tell the user the migration is pending
 * instead of rendering zeroes as though they were real.
 *
 * Delete a usage as soon as the matching migration is applied and the types are
 * regenerated — `supabase.rpc` then knows the function for real.
 */

export interface RpcError {
  code?: string;
  message: string;
}

type RpcCapable = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

export async function callRpc<T>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown>
): Promise<{ data: T | null; error: RpcError | null }> {
  const { data, error } = await (client as RpcCapable).rpc(fn, args);
  return { data: (data ?? null) as T | null, error };
}

/** True when PostgREST says the function is not in the database yet. */
export const isMissingFunction = (e: RpcError | null) => e?.code === "PGRST202";
