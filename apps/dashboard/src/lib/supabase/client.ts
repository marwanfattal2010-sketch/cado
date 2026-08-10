"use client";
/**
 * Browser Supabase client. Anon key only — this is the same key the public
 * storefront ships. It talks to the same session cookies @supabase/ssr writes,
 * so a component that needs to read live data does so as the logged-in user,
 * under RLS. The service role key is never available here.
 */
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
