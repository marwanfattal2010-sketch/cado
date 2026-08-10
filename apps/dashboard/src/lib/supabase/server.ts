/**
 * Server-side Supabase clients. Two of them, deliberately separate:
 *
 *  - createServerClient(): the request-scoped anon client. It reads the user's
 *    session from httpOnly cookies (via @supabase/ssr) and every query it runs
 *    is subject to RLS as that user. This is what almost everything uses.
 *
 *  - createServiceRoleClient(): bypasses RLS. Used for exactly one thing in
 *    Stage 1 — provisioning an invited store owner's account and assigning
 *    their partner_id, which is the legitimate "auth.uid() is null" path the
 *    0026 triggers allow. It is never handed a cookie and never returned to a
 *    client component.
 *
 * "server-only" makes the build fail loudly if this module is ever pulled into
 * a client bundle.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * The explicit `Promise<SupabaseClient<Database>>` is load-bearing, not decoration.
 *
 * @supabase/ssr@0.5.2 declares createServerClient's return type against an older
 * supabase-js generic arity than the 2.111 it actually resolves to here. TS fills
 * the missing generics with defaults, which silently degrades inference the moment
 * a builder is chained: `.from(t).select(c)` types correctly, but
 * `.from(t).select(c).order(...)` or `.eq(...).single()` collapses the row type to
 * `never`. That produced ~35 "Property 'x' does not exist on type 'never'" errors
 * across the app and made the type layer useless exactly where it mattered.
 *
 * The runtime object genuinely is a supabase-js 2.111 SupabaseClient (pnpm resolves
 * ssr's peer to 2.111.0), so this annotation states the truth rather than papering
 * over it. Remove it once @supabase/ssr is upgraded to a version built against 2.111.
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  return createSSRClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  );
}

let _service: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("service role client must never run in the browser");
  }
  if (!_service) {
    _service = createClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv().SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _service;
}
