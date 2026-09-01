import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { primaryImage } from "../../../lib/images";
import { Img } from "../../Img";
import { accentColor, parseFilterValue, type BrowseTile } from "../../../lib/browse";

const MIN_ITEMS = 3;

type Candidate = {
  price: number;
  same_day: boolean | null;
  created_at: string;
  /** So an occasion tile can show something actually tagged for it. */
  occasion_tags: string[] | null;
  product_images: { storage_path: string; is_primary: boolean }[] | null;
};

/**
 * A pool of real products from this tab, used to give each shortcut a photo.
 *
 * Each tile shows a product that genuinely satisfies it: "Under $25" shows
 * something actually under $25, "Same-day" shows something actually
 * deliverable today. Nothing is stock photography and nothing is a product
 * that would not appear behind the tap.
 */
function useEntryPhotos(categoryId?: string) {
  return useQuery({
    queryKey: ["shop-entry-photos", categoryId ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("price, same_day, created_at, occasion_tags, product_images(storage_path, is_primary)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(80);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as Candidate[]).filter((p) => (p.product_images?.length ?? 0) > 0);
    },
  });
}

/** Logos of shops that are actually live, for the Stores shortcut. */
function useStoreLogos() {
  return useQuery({
    queryKey: ["shop-entry-store-logos"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("logo_url, cover_image_url")
        .eq("status", "active")
        .eq("is_live", true)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((p) => p.logo_url ?? p.cover_image_url).filter(Boolean) as string[];
    },
  });
}

/**
 * The row of tall rectangular shortcuts under the banner.
 *
 * `minItems: 3` — fewer real tiles than that and the whole row is hidden
 * rather than padded out. A tile with no matching product keeps the flat
 * accent panel rather than borrowing a photo that does not belong to it.
 */
export function EntryCards({
  tiles,
  accentToken,
  categoryId,
  onTile,
}: {
  tiles: BrowseTile[];
  accentToken: string;
  categoryId?: string;
  onTile: (tile: BrowseTile) => void;
}) {
  const pool = useEntryPhotos(categoryId);

  const storeLogos = useStoreLogos();

  /**
   * Pick a photo that genuinely belongs to this tile.
   *
   * Filter tiles get a product that actually satisfies the filter. The
   * Stores tile gets a real partner logo. Anything else takes a different
   * product per position — five copies of the same photo in one row reads as
   * a bug, and there is no reason to repeat when the catalogue has more.
   */
  const photoFor = (tile: BrowseTile, used: Set<string>) => {
    if (tile.image_url) return tile.image_url;
    const rows = pool.data ?? [];
    const f = tile.link_type === "filter" ? parseFilterValue(tile.link_value) : {};

    /**
     * Take the first product that satisfies the tile AND is not already on
     * another tile in this row. Two tiles wearing the same picture reads as a
     * bug — and it also makes one of the two labels a lie about that item,
     * which is how Flowers ended up with "Anniversary" and "Under $100" both
     * showing the same box of candles.
     */
    const pick = (match: (p: Candidate) => boolean) => {
      const rowsWithPhoto = rows.filter((p) => (p.product_images?.length ?? 0) > 0);
      const fresh = rowsWithPhoto.find((p) => match(p) && !used.has(primaryImage(p.product_images) as string));
      const any = fresh ?? rowsWithPhoto.find(match);
      const src = any ? primaryImage(any.product_images) : null;
      if (src) used.add(src);
      return src;
    };

    if (f.max_price != null) return pick((p) => Number(p.price) <= f.max_price!);
    if (f.same_day) return pick((p) => p.same_day === true);
    if (f.sort === "new") return pick(() => true);

    // An occasion tile shows something genuinely tagged for that occasion.
    // Products carry `occasion_tags`, so this is a real match rather than
    // whatever happened to be at that position in the list.
    const occasion = tile.link_value.match(/[?&]occasion=([\w-]+)/);
    if (occasion) {
      const value = occasion[1];
      const tagged = pick((p) => (p.occasion_tags ?? []).includes(value));
      // Nothing tagged for it: leave the tile on its flat accent panel rather
      // than illustrate an occasion with something that has nothing to do
      // with it.
      return tagged;
    }

    // A budget band handed to the results grid still gets a product that sits
    // inside it, so "Under $50" is never illustrated by a $200 gift.
    const band = tile.link_value.match(/[?&]budget=under-(\d+)/);
    if (band) {
      const ceiling = Number(band[1]);
      return pick((p) => Number(p.price) < ceiling);
    }

    const logos = storeLogos.data ?? [];
    if (tile.link_value === "/browse" && logos.length > 0) return logos[0];
    return pick(() => true);
  };

  if (tiles.length < MIN_ITEMS) return null;

  // One photo per tile across the whole row — see the note in `pick`.
  const used = new Set<string>();

  return (
    <div className="scroll-row pt-4" style={{ ["--row-gap" as string]: "12px" }}>
      {tiles.map((tile) => {
        const photo = photoFor(tile, used);
        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: accentColor(accentToken, 0.12) }}
            />
            {photo ? (
              <Img src={photo} className="absolute inset-x-0 top-0 h-[96px] w-full object-cover" />
            ) : (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[96px]"
                style={{
                  background: `linear-gradient(160deg, ${accentColor(accentToken, 0.22)}, ${accentColor(
                    accentToken,
                    0.04
                  )})`,
                }}
              />
            )}
            <span
              className="absolute inset-x-0 bottom-0 flex h-[32px] items-center justify-center px-1.5 text-[14px] font-bold leading-none text-inverse"
              style={{ background: accentColor(accentToken) }}
            >
              {tile.label}
            </span>
          </>
        );

        const shell =
          "relative block h-[128px] w-[112px] shrink-0 overflow-hidden rounded-[8px] transition-transform duration-press ease-out active:scale-[0.97]";

        return tile.link_type === "url" ? (
          <Link key={tile.id} to={tile.link_value} className={shell}>
            {inner}
          </Link>
        ) : (
          <button key={tile.id} type="button" onClick={() => onTile(tile)} className={shell}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
