import { useMemo } from "react";
import { useStockedStoreDirectory, useStoreDirectory } from "../../hooks/useCatalogue";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useArea } from "../../lib/area";
import { storePath } from "../../lib/routes";
import { Img } from "../Img";

/**
 * The Toters-shaped Home sections (spec 1.4, 1.5, 1.3, 1.7).
 *
 * Everything is a real row. No delivery times and no ratings anywhere: Toters
 * shows both, CADO measures neither, and "25-35 min" under a shop would be a
 * number we made up. A "-20%" pill appears only where that shop genuinely has
 * a product priced below its compare-at price — the same test Deals uses.
 *
 * Every section hides itself when its query comes back empty rather than
 * printing a heading over nothing.
 */

type PartnerRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  created_at: string;
  is_featured?: boolean | null;
};

/** Shops with something genuinely discounted right now. */
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

/** One category name per store, for the "Chocolate" line under a name. */
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
        .limit(600);
      const m = new Map<string, string>();
      for (const row of data ?? []) {
        const name = (row.category as { name?: string } | null)?.name;
        if (name && !m.has(row.partner_id)) m.set(row.partner_id, name);
      }
      return m;
    },
  });
}

/**
 * A store's mark. Real logo where the shop has uploaded one; otherwise its
 * initials on a tinted tile.
 *
 * 25 of 27 shops have no logo file. The alternative to initials would be
 * drawing something — and inventing a mark for a real business is exactly the
 * brand-imitation rule. Initials are legibly CADO's own placeholder, not a
 * pretend logo, and they disappear the moment a shop uploads the real thing.
 */
/**
 * A shop's own PHOTOGRAPH, every time.
 *
 * This used to prefer `logo_url` and fall back to two initials in a circle.
 * Two shops have a real logo file; the rest showed letters, which is what
 * made these rows look like a wireframe rather than a shop. The photo comes
 * first now and there is no lettered fallback at all — a store with no
 * picture gets a plain tinted panel, and it belongs on a list to be
 * photographed rather than papered over with a monogram.
 *
 * The logo is still used when a shop has a real one, because a proper mark
 * beats a stock interior shot — but it is second, not first.
 */
function StoreMark({ store }: { store: PartnerRow; size?: number }) {
  const art = store.cover_image_url ?? store.logo_url;
  if (!art) return <span aria-hidden className="block h-full w-full bg-surface-sunk" />;
  const isLogo = !store.cover_image_url && store.logo_url;
  return (
    <Img
      src={art}
      className={isLogo ? "h-full w-full object-contain p-1.5" : "h-full w-full object-cover"}
    />
  );
}

/* =========================================== 1.4  Popular brands ========= */

/**
 * Toters' "Popular Brands", literally: a static 5x2 grid of rounded logo
 * tiles, no carousel and no arrow button, with the discount pill hanging over
 * the bottom edge of the tile.
 *
 * Rows are 40px apart so the hanging pill never touches the row below.
 */
export function PopularBrands() {
  const discounted = useDiscountedPartners();
  /* All four store rows on this page slice ONE request (useStoreDirectory).
     They were four separate queries for the same table with four different
     sort orders — the sorting is a line of JavaScript, and the round trips
     were not.

     STOCKED only here: "Popular brands" is a recommendation, and since 0096 a
     live store may have an empty shelf — it would render as a blank tile that
     leads nowhere. The two directory rows further down still list everyone. */
  const directory = useStockedStoreDirectory();
  const stores = {
    data: useMemo(
      () =>
        (directory.data ?? [])
          .slice()
          .sort(
            (a, b) =>
              Number(!!b.is_featured) - Number(!!a.is_featured) ||
              String(b.created_at).localeCompare(String(a.created_at))
          )
          .slice(0, 10) as unknown as PartnerRow[],
      [directory.data]
    ),
  };

  const rows = stores.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="px-4 pb-3 font-hero text-[17px] font-extrabold text-ink">Popular brands</h2>
      <div className="grid grid-cols-5 gap-x-2.5 gap-y-10 px-4">
        {rows.map((s) => (
          <Link key={s.id} to={storePath(s)} className="relative flex flex-col items-center">
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] bg-surface shadow-rest">
              <StoreMark store={s} size={60} />
            </span>
            {discounted.data?.has(s.id) ? (
              // Overlaps the bottom edge, exactly like Toters' red pill.
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-persimmon px-1.5 py-[3px] text-[10px] font-bold text-white">
                -20%
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ============================================ 1.5  New on CADO ✨ ======== */

/**
 * Toters' "Now on Toters", literally: a full-width tinted band with a wavy top
 * edge, the title in a darker shade of the accent, a small white round arrow
 * on the right, and TWO independently swipeable rows of wide cards — photo on
 * the left about 40% of the card, white panel on the right.
 */
export function NewOnCado() {
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  // STOCKED only. This row is "new AND worth opening": a store created today
  // with nothing listed is the newest thing on CADO and the worst card on the
  // page. It joins the row the day its first product goes live.
  const directory = useStockedStoreDirectory();
  const stores = {
    data: useMemo(
      () =>
        (directory.data ?? [])
          .filter((s) => String(s.created_at) >= since)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .slice(0, 12) as unknown as PartnerRow[],
      [directory.data, since]
    ),
  };

  const rows = stores.data ?? [];
  const categories = useStoreCategories(rows.map((s) => s.id));
  if (rows.length === 0) return null;

  // Two rows, dealt alternately so both fill evenly.
  const rowA = rows.filter((_, i) => i % 2 === 0);
  const rowB = rows.filter((_, i) => i % 2 === 1);

  const Card = ({ s }: { s: PartnerRow }) => (
    <Link
      to={storePath(s)}
      className="flex w-[65%] shrink-0 snap-start overflow-hidden rounded-card bg-surface shadow-rest sm:w-[42%]"
    >
      <span className="aspect-square w-[40%] shrink-0 overflow-hidden bg-surface-sunk">
        {s.cover_image_url || s.logo_url ? (
          <Img src={(s.cover_image_url ?? s.logo_url) as string} className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
        <span className="truncate text-body font-bold text-ink">{s.name}</span>
        <span className="mt-0.5 truncate text-caption text-muted">
          {categories.data?.get(s.id) ?? "New shop"}
        </span>
        <span className="mt-0.5 text-[11px] font-medium text-persimmon">Added this week</span>
      </span>
    </Link>
  );

  const Row = ({ items }: { items: PartnerRow[] }) =>
    items.length === 0 ? null : (
      <div
        className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((s) => (
          <Card key={s.id} s={s} />
        ))}
      </div>
    );

  return (
    <section className="mt-6">
      {/* The wavy top edge, drawn rather than an image so it takes the brand
          colour and costs nothing. */}
      <svg viewBox="0 0 375 18" preserveAspectRatio="none" aria-hidden className="block h-[18px] w-full">
        <path
          d="M0 18 C 62 2, 124 18, 188 9 C 252 0, 314 17, 375 6 L375 18 Z"
          fill="var(--persimmon)"
          fillOpacity="0.08"
        />
      </svg>
      <div className="bg-persimmon/[0.08] pb-5">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
          <h2 className="font-hero text-[17px] font-extrabold" style={{ color: "#B8321C" }}>
            New on CADO ✨
          </h2>
          <Link
            to="/stores"
            aria-label="See all stores"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface text-ink shadow-rest"
          >
            →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <Row items={rowA} />
          <Row items={rowB} />
        </div>
      </div>
    </section>
  );
}

/* ==================================== 1.3  Top stores near you =========== */

export function TopStoresNearYou() {
  const [area] = useArea();
  const directory = useStoreDirectory();
  const stores = {
    data: useMemo(
      () =>
        (directory.data ?? [])
          .filter((s) => s.city === area)
          .sort(
            (a, b) =>
              Number(!!b.is_featured) - Number(!!a.is_featured) ||
              String(b.created_at).localeCompare(String(a.created_at))
          )
          .slice(0, 12) as unknown as PartnerRow[],
      [directory.data, area]
    ),
  };

  const rows = stores.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      {/* 1.3: the title no longer names the city — "near you" reads right
          whichever city is selected. */}
      <h2 className="px-4 pb-3 font-hero text-[17px] font-extrabold text-ink">Top stores near you</h2>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((s) => (
          <Link key={s.id} to={storePath(s)} className="w-[200px] shrink-0">
            <span className="block h-[130px] w-full overflow-hidden rounded-card bg-surface-sunk">
              {s.cover_image_url || s.logo_url ? (
                <Img src={(s.cover_image_url ?? s.logo_url) as string} className="h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="mt-1.5 block truncate text-body font-medium text-ink">{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ============================================== 1.7  All stores ========== */

/**
 * Every shop, one full-width card each, stacked. Featured first then
 * alphabetical.
 *
 * PLACEMENT: above "Discover more", because Discover more is an infinite
 * scroll — anything after it is unreachable.
 */
export function AllStores() {
  const directory = useStoreDirectory();
  const stores = {
    data: useMemo(
      () =>
        (directory.data ?? [])
          .slice()
          .sort(
            (a, b) =>
              Number(!!b.is_featured) - Number(!!a.is_featured) || a.name.localeCompare(b.name)
          ) as unknown as PartnerRow[],
      [directory.data]
    ),
  };

  const rows = stores.data ?? [];
  const categories = useStoreCategories(rows.map((s) => s.id));
  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="px-4 pb-3 font-hero text-[17px] font-extrabold text-ink">All stores</h2>
      <div className="flex flex-col gap-3 px-4">
        {rows.map((s) => (
          <Link key={s.id} to={storePath(s)} className="overflow-hidden rounded-card bg-surface shadow-rest">
            {/* 5:4 rather than square: a full-width square card is most of a
                phone screen per shop, so scrolling the list was a chore. */}
            <span className="relative block aspect-[5/4] w-full overflow-hidden bg-surface-sunk">
              {s.cover_image_url ? (
                <Img src={s.cover_image_url} className="h-full w-full object-cover" />
              ) : null}
              {/* The logo circle sits on the photo; the NAME never does — text
                  over a photograph is unreadable often enough that it is not
                  worth the look. */}
              <span className="absolute bottom-2 left-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-pill border-2 border-surface bg-surface">
                <StoreMark store={s} size={48} />
              </span>
            </span>
            <span className="flex items-center gap-3 bg-canvas px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-bold text-ink">{s.name}</span>
                <span className="block truncate text-caption text-muted">
                  {[categories.data?.get(s.id), s.city].filter(Boolean).join(" · ") || "Shop"}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-body font-bold text-persimmon">Shop →</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
