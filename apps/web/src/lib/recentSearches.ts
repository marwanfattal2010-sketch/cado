/**
 * The shopper's OWN recent searches, kept in their browser and nowhere else.
 *
 * Not a server table on purpose: what someone typed into a search box is theirs,
 * it is worth nothing to CADO, and storing it would mean explaining why we kept
 * it. Clearing the browser clears it, which is the behaviour people expect.
 *
 * Nothing is ever pre-seeded — an empty list renders no section at all, rather
 * than suggested searches dressed up as history.
 */

const KEY = "cado-recent-searches";
const MAX = 10;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Only called when a search is actually SUBMITTED, never on a keystroke. */
export function addRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (clean.length < 2) return getRecentSearches();
  try {
    const existing = getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
    const next = [clean, ...existing].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}
