import { useSyncExternalStore } from "react";

/**
 * Favourited stores, on this device.
 *
 * Deliberately localStorage-only, unlike product favourites which are
 * DB-backed once you sign in. There is no `favorite_stores` table, and adding
 * one means a migration plus RLS policies for a heart that today only decides
 * whether an icon is filled. When following a store means something — a feed,
 * a restock alert — that is the moment to give it a table.
 *
 * Same shape as the product favourites store so the two behave identically:
 * a snapshot cached between changes (useSyncExternalStore requires a stable
 * reference), a custom event for this tab and `storage` for the others.
 */

const KEY = "cado-favorite-stores";
const EVENT = "cado-favorite-stores-change";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    // localStorage is user-editable, so only well-formed ids get back in.
    return parsed.filter((x): x is string => typeof x === "string" && UUID_RE.test(x));
  } catch {
    return [];
  }
}

let cache: string[] = [];
let initialized = false;

function snapshot(): string[] {
  if (!initialized) {
    cache = read();
    initialized = true;
  }
  return cache;
}

function subscribe(onChange: () => void) {
  const sync = () => {
    cache = read();
    onChange();
  };
  window.addEventListener(EVENT, sync);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}

/** Server snapshot: no localStorage during SSR or the first hydrate tick. */
const EMPTY: string[] = [];

export function useFavoriteStores() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useIsFavoriteStore(storeId: string | undefined) {
  const ids = useFavoriteStores();
  return !!storeId && ids.includes(storeId);
}

export function toggleFavoriteStore(storeId: string) {
  if (!UUID_RE.test(storeId)) return;
  const next = snapshot().includes(storeId)
    ? snapshot().filter((id) => id !== storeId)
    : [...snapshot(), storeId];
  localStorage.setItem(KEY, JSON.stringify(next));
  cache = next;
  window.dispatchEvent(new CustomEvent(EVENT));
}
