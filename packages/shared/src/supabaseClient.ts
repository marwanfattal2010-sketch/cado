import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">
) {
  return createClient<Database>(url, anonKey, options);
}

export type { Database };
