import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";
import { AdminProductControls, AddProductForm } from "./AdminProductControls";

export const dynamic = "force-dynamic";

/**
 * Every product on CADO, grouped under its store. Admin reads the whole table
 * ("admin full access to products" and the is_admin() branch of the public
 * SELECT policy make inactive rows visible too).
 */
export default async function AdminProductsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const [{ data: products, error }, { data: partners }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, price, stock_quantity, is_active, partner_id, partners(name)")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase.from("partners").select("id, name").order("name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  const rows = (products ?? []) as unknown as Array<{
    id: string;
    title: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    partner_id: string;
    partners: { name: string } | { name: string }[] | null;
  }>;

  const nameOf = (r: (typeof rows)[number]) =>
    Array.isArray(r.partners) ? r.partners[0]?.name : r.partners?.name;

  // Group products by store so the page scans like an inventory, not a dump.
  const groups = new Map<string, { name: string; items: typeof rows }>();
  for (const r of rows) {
    const g = groups.get(r.partner_id) ?? { name: nameOf(r) ?? "Unknown store", items: [] };
    g.items.push(r);
    groups.set(r.partner_id, g);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 text-ink">{t("admin.products.title")}</h1>
        <AddProductForm partners={partners ?? []} categories={categories ?? []} />
      </div>

      {error ? (
        <p className="text-sm text-status-red">{error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No products" body="Products across all stores appear here." />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([partnerId, g]) => (
            <section key={partnerId}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {g.name} · {g.items.length}
              </h2>
              <ul className="space-y-2">
                {g.items.map((p) => (
                  <li key={p.id} className="rounded-card border border-line bg-surface p-3 shadow-rest">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink">
                        {p.title}
                        {!p.is_active ? (
                          <span className="ml-2 rounded-pill bg-status-grey-tint px-2 py-0.5 text-xs text-status-grey">
                            {t("products.hidden")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="mt-2">
                      <AdminProductControls
                        id={p.id}
                        price={Number(p.price)}
                        stock={p.stock_quantity ?? 0}
                        isActive={!!p.is_active}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
