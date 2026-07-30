import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createSupabaseClient } from "@cado/shared";

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// expo-secure-store has no web implementation — fall back to AsyncStorage there.
// SecureStore has a ~2KB per-value limit on native, which is fine for the small
// auth session tokens supabase-js stores.
const authStorage = Platform.OS === "web" ? AsyncStorage : SecureStoreAdapter;

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!url || !anonKey) {
  console.warn(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. Copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase = createSupabaseClient(url, anonKey, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
