import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useArea } from "../../lib/area";
import { storePath } from "../../lib/routes";
import { Img } from "../Img";

/**
 * The Toters-style Home sections (Part 1).
 *
 * Everything here is a real row from the database. In particular there is no
 * delivery time and no rating anywhere: Toters shows both, CADO measures
 * neither, and a "25-35 min" under a shop would be a number we made up. The
 * "-20%" pill appears only where that shop genuinely has a product priced below
 * its compare-at price — the same test the Deals section uses.
 *
 * Every section hides itself entirely when its query comes back empty, rather
 * than rendering a heading over nothing.
 */

type PartnerRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  created_at: string;
};

const CARD_GAP = "gap-3"; // 12px, per the brief

/** Shops that really have something discounted right now. */
function useDiscountedPartners() {
  return useQuery({
    queryKey: ["discounted-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("partner_id, price, compare_at_price")
        .eq("is_active", true)
        .not("compare_at_price", "is", null)
        .limit(1000);
      const set = new Set<string>();
      for (const p of data ?? []) {
        if (p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price)) {
          set.add(p.partner_id);
        }
      }
      return set;
    },
    staleTime: 5 * 60_000,
  });
}

function SectionTitle({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-2.5 pt-5">
      <h2 className="font-display text-h2 text-ink">{title}</h2>
      {to ? (
        <Link
          to={to}
          aria-label="See all"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-persimmon text-white"
        >
          →
        </Link>
      ) : null}
    </div>
  );
}

/* ================================================= 2. Now on CADO 💥 ===== */

/**
 * The newest shops, two to a page, swiped horizontally — Toters' "Now on
 * Toters". The tinted band and its wavy top edge are drawn with an inline SVG
 * rather than an image so it costs nothing and takes the brand colour.
 */
export function NowOnCado() {
  const stores = useQuery({
    queryKey: ["now-on-cado"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, city, logo_url, cover_image_url, created_at")
        .eq("status", "active")
        .eq("is_live", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as PartnerRow[];
    },
  });

  const categories = useStoreCategories((stores.data ?? []).map((s) => s.id));
  const rows = stores.data ?? [];
  if (rows.length === 0) return null;

  // Two stacked rows per swipe page.
  const pages: PartnerRow[][] = [];
  for (let i = 0; i < rows.length; i += 2) pages.push(rows.slice(i, i + 2));

  return (
    <section className="relative mt-5">
      {/* Wavy top edge, then the tint behind the content. */}
      <svg viewBox="0 0 375 16" preserveAspectRatio="none" aria-hidden className="block h-4 w-full">
        <path d="M0 16 C 60 0, 120 16, 187 8 C 250 0, 315 16, 375 6 L375 16 Z" fill="var(--persimmon)" fillOpacity="0.07" />
      </svg>
      <div className="bg-persimmon/[0.07] pb-5">
        <SectionTitle title="Now on CADO 💥" to="/stores" />
        <div className={`-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 ${CARD_GAP} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          {pages.map((page, i) => (
            <div key={i} className="flex w-[86%] shrink-0 snap-start flex-col gap-3 sm:w-[46%]">
              {page.map((s) => (
                <Link
                  key={s.id}
                  to={storePath(s)}
                  className="flex items-center gap-3 rounded-card bg-surface p-2 shadow-rest"
                >
                  <span className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[10px] bg-surface-sunk">
                    {s.cover_image_url || s.logo_url ? (
                      <Img src={(s.cover_image_url ?? s.logo_url) as string} className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-bold text-ink">{s.name}</span>
                    {/* Real info only: what they sell and where they are. */}
                    <span className="mt-0.5 block truncate text-caption text-muted">
                      {[categories.data?.get(s.id), s.city].filter(Boolean).join(" · ") || "New on CADO"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** One category name per store, for the "Jewelry · Beirut" line. */
function useStoreCategories(partnerIds: string[]) {
  return useQuery({
    queryKey: ["store-categories", partnerIds.join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("partner_id, category:categories(name)")
        .in("partner_id", partnerIds)
        .eq("is_active", true)
        .limit(500);
      const m = new Map<string, string>();
      for (const row of data ?? []) {
        const name = (row.category as { name?: string } | null)?.name;
        if (name && !m.has(row.partner_id)) m.set(row.partner_id, name);
      }
      return m;
    },
  });
}

/* ============================================ 4/6. small logo grids ====== */

function LogoGrid({ stores, discounted }: { stores: PartnerRow[]; discounted?: Set<string> }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-5 gap-2.5 px-4">
      {stores.map((s) => (
        <Link key={s.id} to={storePath(s)} className="flex flex-col items-center">
          <span className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-[14px] border border-line bg-surface">
            {s.logo_url || s.cover_image_url ? (
              <Img src={(s.logo_url ?? s.cover_image_url) as string} className="h-full w-full object-cover" />
            ) : (
              <span className="text-caption font-bold text-muted">{s.name.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          {discounted?.has(s.id) ? (
            <span className="mt-1 rounded-pill bg-persimmon px-1.5 py-px text-[10px] font-bold text-white">
              -20%
            </span>
          ) : (
            <span className="mt-1 line-clamp-1 text-[10px] leading-tight text-muted">{s.name}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function PopularBrands() {
  const discounted = useDiscountedPartners();
  const stores = useQuery({
    queryKey: ["popular-brands"],
    queryFn: async () => {
      // Ordered by featured then newest. Ordering by orders in the last 30 days
      // would be better, but the storefront cannot read orders under RLS and
      // this section is not worth a new SECURITY DEFINER function — the
      // fallback the brief names is exactly this.
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, city, logo_url, cover_image_url, created_at")
        .eq("status", "active")
        .eq("is_live", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as PartnerRow[];
    },
  });

  const rows = stores.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section>
      <SectionTitle title="Popular Brands" to="/stores" />
      <LogoGrid stores={rows} discounted={discounted.data} />
    </section>
  );
}

export function NewOnCado() {
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const stores = useQuery({
    queryKey: ["new-on-cado", since.slice(0, 10)],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, city, logo_url, cover_image_url, created_at")
        .eq("status", "active")
        .eq("is_live", true)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as PartnerRow[];
    },
  });

  const rows = stores.data ?? [];
  // Fewer than five still renders; zero hides the section entirely.
  if (rows.length === 0) return null;

  return (
    <section>
      <SectionTitle title="New on CADO ✨" to="/stores" />
      <LogoGrid stores={rows} />
    </section>
  );
}

/* ================================== 8. Top stores in {city} 📍 =========== */

export function TopStoresInCity() {
  const [area] = useArea();

  const stores = useQuery({
    queryKey: ["top-stores-city", area],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, city, logo_url, cover_image_url, created_at")
        .eq("status", "active")
        .eq("is_live", true)
        .eq("city", area)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []) as PartnerRow[];
    },
  });

  const rows = stores.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section>
      <SectionTitle title={`Top stores in ${area} 📍`} to="/stores" />
      <div className={`-mx-4 flex overflow-x-auto px-4 pb-1 ${CARD_GAP} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {rows.map((s) => (
          <div key={s.id} className="w-[200px] shrink-0">
            <Link to={storePath(s)} className="block">
              {/*
                NO HEART HERE, deliberately. The brief asks for one "using the
                existing favorites logic" — but that logic favourites PRODUCTS:
                the table stores product ids and Favourites renders product
                cards. Putting a store id through it would write a row that
                every other screen would read as a product and fail on. A
                store-favourites feature is a real feature, not a heart icon,
                so this card links to the shop and leaves it at that.
              */}
              <span className="relative block h-[130px] w-full overflow-hidden rounded-card bg-surface-sunk">
                {s.cover_image_url || s.logo_url ? (
                  <Img src={(s.cover_image_url ?? s.logo_url) as string} className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-body font-medium text-ink">{s.name}</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
