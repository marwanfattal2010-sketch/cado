import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";
import { useAuth } from "../lib/auth";

/**
 * Favorites work signed out too: hearting shouldn't demand an account.
 * Signed-out hearts live in localStorage on this device; signed-in hearts are
 * DB-backed exactly as before. If someone hearts locally and then signs in,
 * the DB simply wins — no merge flow. Deliberate: a merge would silently
 * write device state into their account, and the simple rule ("your account
 * list is your account list") is predictable and easy to reason about.
 */

const LOCAL_KEY = "cado-favorites";
const LOCAL_EVENT = "cado-favorites-change";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readLocalIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    // Only well-formed uuids: these ids end up in a PostgREST .in() filter,
    // and localStorage is user-editable.
    return parsed.filter((x): x is string => typeof x === "string" && UUID_RE.test(x));
  } catch {
    return [];
  }
}

function writeLocalIds(ids: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
  localIdsCache = ids;
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

// useSyncExternalStore needs a stable snapshot reference between changes.
let localIdsCache: string[] = [];
let localIdsCacheInitialized = false;

function localIdsSnapshot(): string[] {
  if (!localIdsCacheInitialized) {
    localIdsCache = readLocalIds();
    localIdsCacheInitialized = true;
  }
  return localIdsCache;
}

function subscribeLocalIds(onChange: () => void) {
  const sync = () => {
    localIdsCache = readLocalIds();
    onChange();
  };
  window.addEventListener(LOCAL_EVENT, sync);
  window.addEventListener("storage", sync); // other tabs
  return () => {
    window.removeEventListener(LOCAL_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}

function useLocalFavoriteIds(): string[] {
  return useSyncExternalStore(subscribeLocalIds, localIdsSnapshot);
}

type FavoriteEntry = {
  id: string;
  product_id: string;
  /** The full card contract — the favorites page renders the same
   *  ProductCard as the shop, so it needs the same fields. */
  product: FeedProduct | null;
};

async function fetchDbFavorites(): Promise<FavoriteEntry[]> {
  const { data, error } = await supabase
    .from("favorites")
    // The FULL card contract, so this page renders the exact same card as
    // the shop — store name, tags, badges and all.
    .select(`id, product_id, product:products(${PRODUCT_CARD_COLUMNS})`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as FavoriteEntry[];
}

/** The full list with product data — what the Favorites page renders. */
export function useFavorites() {
  const { session } = useAuth();
  const localIds = useLocalFavoriteIds();
  return useQuery({
    // The local key carries the ids, so a heart/unheart refetches by itself.
    queryKey: session ? ["favorites"] : ["favorites", "local", localIds],
    queryFn: async (): Promise<FavoriteEntry[]> => {
      if (session) return fetchDbFavorites();
      if (localIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .in("id", localIds);
      if (error) throw error;
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      // Keep the local order (newest heart first); drop ids that no longer
      // resolve to a live product.
      return localIds
        .filter((id) => byId.has(id))
        .map((id) => ({
          id,
          product_id: id,
          product: byId.get(id) as unknown as FavoriteEntry["product"],
        }));
    },
  });
}

/** Just the hearted ids, for the heart buttons. Signed out this is pure
 *  localStorage — no network round-trip per product card. */
export function useFavoriteIds() {
  const { session } = useAuth();
  const localIds = useLocalFavoriteIds();
  const db = useQuery({
    queryKey: ["favorites"],
    enabled: !!session,
    queryFn: fetchDbFavorites,
  });
  return session ? new Set((db.data ?? []).map((f) => f.product_id)) : new Set(localIds);
}

export function useToggleFavorite() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) => {
      if (!session) {
        const ids = readLocalIds();
        writeLocalIds(isFavorite ? ids.filter((x) => x !== productId) : [productId, ...ids]);
        return;
      }
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("profile_id", session.user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ profile_id: session.user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
