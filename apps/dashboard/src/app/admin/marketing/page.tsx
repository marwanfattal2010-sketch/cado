import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeading, Panel, Empty } from "@/components/v3/primitives";
import { MarketingRow } from "./MarketingRow";

export const dynamic = "force-dynamic";

/**
 * Marketing (§11) — what the storefront puts first.
 *
 * These are the real `partners` columns cado-web reads, so anything changed
 * here is what shoppers see. There is no "publish" step to forget.
 *
 * Deals are not here yet: a discount needs a real price rule and an end date,
 * and inventing a Deals UI over columns that do not exist would put a control
 * on screen that changes nothing. Flagged in the report rather than faked.
 */
export default async function MarketingPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: partners }, { data: productCounts }] = await Promise.all([
    supabase
      .from("partners")
      .select("id, name, city, is_featured, featured_rank, tagline, store_of_week, status")
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("featured_rank", { nullsFirst: false })
      .order("name"),
    supabase.from("products").select("partner_id").eq("is_active", true),
  ]);

  const counts = new Map<string, number>();
  for (const p of productCounts ?? []) counts.set(p.partner_id, (counts.get(p.partner_id) ?? 0) + 1);

  const rows = partners ?? [];
  const featuredCount = rows.filter((r) => r.is_featured).length;

  return (
    <div>
      <PageHeading
        title="Marketing"
        subtitle="What customers see first on cado-web. Changes are live immediately."
      />

      <Panel
        title={`Featured stores${featuredCount ? ` · ${featuredCount} showing` : ""}`}
        bodyClass="p-0"
      >
        {rows.length === 0 ? (
          <Empty title="No active stores yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">On the homepage</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Tagline</th>
                  <th className="px-3 py-2 text-center font-medium">Store of the week</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <MarketingRow
                    key={p.id}
                    partnerId={p.id}
                    name={p.name}
                    city={p.city}
                    isFeatured={p.is_featured}
                    featuredRank={p.featured_rank}
                    tagline={p.tagline}
                    storeOfWeek={p.store_of_week}
                    products={counts.get(p.id) ?? 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-3 text-[12px] text-muted">
        Lower order numbers appear first. A store with no order number sorts after the numbered ones.
      </p>
    </div>
  );
}
