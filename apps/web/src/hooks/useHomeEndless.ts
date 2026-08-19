import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";

/**
 * Data for the endless lower half of the Home page.
 *
 * TWO PRINCIPLES GOVERN EVERYTHING IN THIS FILE.
 *
 * 1. Honest numbers only. Ranking uses home_product_signals() — an aggregate
 *    the database computes server-side, exposing product_id and counts and
 *    nothing else. Where the real data is too thin to support a claim (three
 *    orders do not make a "Trending" list), the CALLER is told so and shows
 *    the honest label instead. Nothing in this file invents a count.
 *
 * 2. Migration-tolerant. The sections read columns and functions added by
 *    migration 0065. If a query fails because the migration has not been
 *    applied yet (undefined column / table / function), the hook returns
 *    empty and the section silently does not render — the page just gets
 *    shorter, which is the spec's rule for any empty section anyway. That is
 *    the 0046 lesson expressed in code: the site must be correct on BOTH
 *    sides of the migration, whichever lands first.
 */

/**
 * Codes for "the migration is not there yet" — and only those.
 *
 * Both dialects matter: Postgres itself says 42703/42P01/42883 (undefined
 * column / table / function), but PostgREST answers from its schema cache
 * first and says PGRST202 (function not found) or PGRST205 (table not
 * found) instead. The first verification pass missed exactly this: the
 * signals RPC failed with PGRST202, the error was NOT recognised as
 * "pre-migration", and Popular picks silently vanished from the page.
 */
const MISSING = new Set(["42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"]);
const missingMigration = (e: unknown) =>
  !!e && typeof e === "object" && MISSING.has(String((e as { code?: string }).code));

/* ------------------------------------------------------------------ utils */

/** ISO week number, for the deterministic weekly rotations. */
export function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7);
}

/**
 * A shuffle that is random between sessions and stable within one.
 *
 * The seed lives in sessionStorage: scrolling Discover More must never
 * reshuffle under the reader, but tomorrow's visit may open on a different
 * mix. Mulberry32 — tiny, deterministic, good enough for shuffling a shop.
 */
function sessionSeed(): number {
  try {
    const k = "cado-discover-seed";
    const cur = sessionStorage.getItem(k);
    if (cur) return Number(cur);
    const s = Math.floor(Math.random() * 2 ** 31);
    sessionStorage.setItem(k, String(s));
    return s;
  } catch {
    return 42;
  }
}

export function seededShuffle<T>(list: T[], seed = sessionSeed()): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* -------------------------------------------------------------- signals */

export type ProductSignals = Map<string, { recentOrders: number; favorites: number }>;

export function useHomeSignals() {
  return useQuery({
    queryKey: ["home-signals"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductSignals> => {
      const { data, error } = await supabase.rpc("home_product_signals", { p_days: 14 });
      if (error) {
        if (missingMigration(error)) return new Map();
        throw error;
      }
      return new Map(
        (data ?? []).map((r) => [
          r.product_id,
          { recentOrders: Number(r.recent_orders), favorites: Number(r.favorites) },
        ])
      );
    },
  });
}

/**
 * The one ordering rule, shared by Trending/Popular and the Best-of strips:
 * real recent orders first, then favorites, then the editorial flag, then
 * newest. Every input is a real row; the comment in the spec that matters
 * most is "never label curated picks as trending" — that decision is made by
 * the caller from `distinctOrdered`.
 */
export function rankProducts(rows: FeedProduct[], signals: ProductSignals): FeedProduct[] {
  const s = (p: FeedProduct) => signals.get(p.id) ?? { recentOrders: 0, favorites: 0 };
  return rows.slice().sort((a, b) => {
    const sa = s(a);
    const sb = s(b);
    if (sb.recentOrders !== sa.recentOrders) return sb.recentOrders - sa.recentOrders;
    if (sb.favorites !== sa.favorites) return sb.favorites - sa.favorites;
    const ta = (a as { is_trending?: boolean | null }).is_trending ? 1 : 0;
    const tb = (b as { is_trending?: boolean | null }).is_trending ? 1 : 0;
    if (tb !== ta) return tb - ta;
    return String(b.created_at).localeCompare(String(a.created_at));
  });
}

/* ------------------------------------------------------- featured stores */

export type FeaturedStore = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  city: string | null;
  featured_rank: number | null;
};

export function useFeaturedStores() {
  return useQuery({
    queryKey: ["home-featured-stores"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeaturedStore[]> => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_image_url, tagline, description, city, featured_rank")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("is_featured", true)
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .limit(4);
      if (error) {
        if (missingMigration(error)) return [];
        throw error;
      }
      return (data ?? []) as FeaturedStore[];
    },
  });
}

/* ------------------------------------------------------- store of the week */

/**
 * STORES of the week — two or three, not one.
 *
 * One card alone read as an accident on the page. The rotation logic is the
 * one that was already here: an admin pick wins if `homepage_config` names
 * one, otherwise the featured stores are ordered by how much stock they
 * actually carry and the ISO week picks the starting point, so the set is
 * deterministic (everyone sees the same stores this week) and changes by
 * itself every Monday. It just takes a slice of three now instead of one.
 *
 * Stores with nothing in stock are dropped rather than padded — a "store of
 * the week" you cannot buy anything from is not one.
 */
export function useStoresOfWeek(count = 3) {
  const featured = useFeaturedStores();
  return useQuery({
    queryKey: ["home-stores-of-week", count, featured.data?.map((f) => f.id).join(",") ?? ""],
    enabled: !!featured.data,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeaturedStore[]> => {
      const { data: cfg, error: cfgErr } = await supabase
        .from("homepage_config")
        .select("store_of_week_partner_id")
        .limit(1);
      if (cfgErr && !missingMigration(cfgErr)) throw cfgErr;
      const pinned: string | null = cfg?.[0]?.store_of_week_partner_id ?? null;

      const poolAll = featured.data ?? [];
      if (poolAll.length === 0) return [];

      // How much each featured store actually has on the shelf right now.
      const counts = await supabase
        .from("products")
        .select("partner_id")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .in("partner_id", poolAll.map((p) => p.id));
      if (counts.error) throw counts.error;
      const byStore = new Map<string, number>();
      for (const r of counts.data ?? []) byStore.set(r.partner_id, (byStore.get(r.partner_id) ?? 0) + 1);

      const stocked = poolAll
        .filter((p) => (byStore.get(p.id) ?? 0) > 0)
        .sort((a, b) => (byStore.get(b.id) ?? 0) - (byStore.get(a.id) ?? 0));
      if (stocked.length === 0) return [];

      const start = isoWeek() % stocked.length;
      const rotated = stocked.map((_, i) => stocked[(start + i) % stocked.length]);
      const picked = pinned ? rotated.filter((s) => s.id !== pinned) : rotated;
      const head = pinned ? stocked.filter((s) => s.id === pinned) : [];
      return [...head, ...picked].slice(0, count);
    },
  });
}

/** The single-store version, still used for the Discover-more exclude set. */
export function useStoreOfWeek() {
  const featured = useFeaturedStores();
  return useQuery({
    queryKey: ["home-store-of-week", featured.data?.map((f) => f.id).join(",") ?? ""],
    enabled: !!featured.data,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ store: FeaturedStore; products: FeedProduct[] } | null> => {
      let partnerId: string | null = null;
      const { data: cfg, error: cfgErr } = await supabase
        .from("homepage_config")
        .select("store_of_week_partner_id")
        .limit(1);
      if (cfgErr && !missingMigration(cfgErr)) throw cfgErr;
      partnerId = cfg?.[0]?.store_of_week_partner_id ?? null;

      const pool = featured.data ?? [];
      if (!partnerId && pool.length > 0) {
        /*
         * Auto-pick: featured store with the most products, rotating by ISO
         * week so it changes weekly with no admin touch. Deterministic — the
         * same week shows the same store to everyone.
         */
        const counts = await supabase
          .from("products")
          .select("partner_id")
          .eq("is_active", true)
          .gt("stock_quantity", 0)
          .in("partner_id", pool.map((p) => p.id));
        if (counts.error) throw counts.error;
        const byStore = new Map<string, number>();
        for (const r of counts.data ?? [])
          byStore.set(r.partner_id, (byStore.get(r.partner_id) ?? 0) + 1);
        const ordered = pool
          .slice()
          .sort((a, b) => (byStore.get(b.id) ?? 0) - (byStore.get(a.id) ?? 0));
        partnerId = ordered[isoWeek() % ordered.length]?.id ?? null;
      }
      if (!partnerId) return null;

      const store =
        pool.find((p) => p.id === partnerId) ??
        ((await supabase
          .from("partners")
          .select("id, name, slug, logo_url, cover_image_url, tagline, description, city, featured_rank")
          .eq("id", partnerId)
          .single()
          .then((r) => r.data)) as FeaturedStore | null);
      if (!store) return null;

      const { data: prods, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      const products = (prods ?? []) as unknown as FeedProduct[];
      return products.length ? { store, products } : null;
    },
  });
}

/* ------------------------------------------------ product pools by section */

/** In-stock products, card columns, newest first. One shape for the pools. */
async function pool(extra: (q: ReturnType<typeof base>) => ReturnType<typeof base>, limit = 60) {
  const q = extra(base()).limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FeedProduct[];
}
const base = () =>
  supabase
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false });

export function useTrendingPool() {
  return useQuery({
    queryKey: ["home-trending-pool"],
    staleTime: 5 * 60 * 1000,
    queryFn: () => pool((q) => q, 80),
  });
}

export function useDeals() {
  return useQuery({
    queryKey: ["home-deals"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Column-to-column comparison is not a PostgREST filter, so fetch the
      // ones with any old price and keep the genuinely reduced. Same approach
      // as DealPair, same reason.
      const rows = await pool((q) => q.not("compare_at_price", "is", null), 80);
      return rows.filter((p) => Number(p.compare_at_price) > Number(p.price));
    },
  });
}

export function useNewest(limit = 10) {
  return useQuery({
    queryKey: ["home-newest", limit],
    staleTime: 5 * 60 * 1000,
    queryFn: () => pool((q) => q, limit),
  });
}

/** Categories by in-stock product count, for the Best-of rotation. */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ["home-category-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id, categories(name, slug)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(1000);
      if (error) throw error;
      const byCat = new Map<string, { id: string; name: string; slug: string; count: number }>();
      for (const r of data ?? []) {
        const cat = r.categories as { name: string; slug: string } | null;
        if (!r.category_id || !cat) continue;
        const cur = byCat.get(r.category_id);
        if (cur) cur.count++;
        else byCat.set(r.category_id, { id: r.category_id, name: cat.name, slug: cat.slug, count: 1 });
      }
      return [...byCat.values()].sort((a, b) => b.count - a.count);
    },
  });
}

export function useCategoryProducts(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["home-cat-products", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => pool((q) => q.eq("category_id", categoryId as string), 20),
  });
}

/* ------------------------------------------------------- discover more */

const DISCOVER_PAGE = 10;

/**
 * The endless grid. All remaining in-stock ids are fetched once (id-only —
 * cheap at this catalogue's size), shuffled with the session seed, and paged
 * through ten at a time. `exclude` is every id the sections above already
 * showed, so nothing on the page repeats.
 */
export function useDiscoverMore(exclude: Set<string>, excludeReady: boolean) {
  const ids = useQuery({
    queryKey: ["discover-ids"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r) => r.id as string);
    },
  });

  const remaining =
    ids.data && excludeReady ? seededShuffle(ids.data.filter((id) => !exclude.has(id))) : null;
  const key = remaining ? remaining.length : -1;

  const pages = useInfiniteQuery({
    queryKey: ["discover-pages", key],
    enabled: !!remaining,
    initialPageParam: 0,
    getNextPageParam: (_last: FeedProduct[], all) =>
      remaining && all.length * DISCOVER_PAGE < remaining.length ? all.length * DISCOVER_PAGE : undefined,
    queryFn: async ({ pageParam }) => {
      const slice = (remaining ?? []).slice(pageParam as number, (pageParam as number) + DISCOVER_PAGE);
      if (!slice.length) return [] as FeedProduct[];
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .in("id", slice);
      if (error) throw error;
      const rows = (data ?? []) as unknown as FeedProduct[];
      const byId = new Map(rows.map((r) => [r.id, r]));
      // Keep the shuffled order, not the database's.
      return slice.map((id) => byId.get(id)).filter((r): r is FeedProduct => !!r);
    },
  });

  return { pages, total: remaining?.length ?? 0 };
}
