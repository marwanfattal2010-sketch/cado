import { createSupabaseClient } from "@cado/shared";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!url || !anonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase = createSupabaseClient(url, anonKey);
