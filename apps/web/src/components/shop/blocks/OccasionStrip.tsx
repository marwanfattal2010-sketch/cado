import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Img } from "../../Img";
import { SectionHead } from "../../SectionHead";

/**
 * "Flowers for…" — the occasion row on a category tab.
 *
 * This is the difference between a shop and a gift marketplace. A shop asks
 * which department you want; a person arriving at CADO already knows the
 * occasion and is trying to work backwards from it. So every category tab
 * asks their question first: flowers for a wedding, chocolate for visiting
 * someone, jewelry for an anniversary.
 *
 * A tile only appears if this category genuinely has something tagged for
 * that occasion. Sport has birthday gifts and get-well gifts and nothing
 * else, so Sport shows two tiles — not six leading to four empty grids.
 */
const OCCASIONS = [
  { value: "birthday", label: "Birthday", img: "/occasions/birthday-banner.jpg" },
  { value: "wedding", label: "Wedding", img: "/occasions/wedding.jpg" },
  { value: "newborn", label: "New Baby", img: "/occasions/new-baby.jpg" },
  { value: "get-well", label: "Get Well", img: "/occasions/get-well-soon.jpg" },
  { value: "anniversary", label: "Anniversary", img: "/occasions/anniversary.jpg" },
  { value: "graduation", label: "Graduation", img: "/occasions/graduation.jpg" },
];

/** Which of the six this category actually has stock for. */
function useTaggedOccasions(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["occasion-strip", categoryId ?? "none"],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("occasion_tags")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .eq("category_id", categoryId as string)
        .limit(500);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        for (const tag of (row.occasion_tags ?? []) as string[]) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return counts;
    },
  });
}

export function OccasionStrip({
  categoryId,
  categorySlug,
  categoryName,
}: {
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
}) {
  const tagged = useTaggedOccasions(categoryId);
  const counts = tagged.data;
  if (!counts || !categorySlug) return null;

  const shown = OCCASIONS.filter((o) => (counts.get(o.value) ?? 0) > 0);
  // One tile is not a row of choices; below two the section says nothing the
  // grid underneath doesn't already.
  if (shown.length < 2) return null;

  return (
    <section className="pt-5">
      <SectionHead title={`${categoryName ?? "Gifts"} for…`} />
      <div className="scroll-row" style={{ ["--row-gap" as string]: "12px" }}>
        {shown.map((o) => (
          <Link
            key={o.value}
            to={`/category/${categorySlug}?occasion=${o.value}`}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform duration-press ease-out active:scale-[0.96]"
          >
            <span className="h-[68px] w-[68px] overflow-hidden rounded-pill bg-surface-sunk">
              <Img src={o.img} className="h-full w-full object-cover" />
            </span>
            {/* w-full and wrapping, so "Anniversary" is not sliced. */}
            <span className="w-full break-words text-[11px] font-medium leading-tight text-ink">{o.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export { OCCASIONS as STRIP_OCCASIONS };
