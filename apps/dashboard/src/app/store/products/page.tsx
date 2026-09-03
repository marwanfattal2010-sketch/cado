import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/lib/dictionary";
import { ProductEditor } from "./ProductEditor";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage() {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  // Scope to this store EXPLICITLY. RLS will not do it for you here, and an
  // earlier version of this page relied on it and listed the whole
  // marketplace: "public reads active products" is
  // (is_active OR partner_id = my_partner_id() OR is_admin()), which has to
  // stay that permissive because cado-web serves anonymous shoppers from this
  // same table. So an unfiltered select returns every ACTIVE product on CADO,
  // and a store owner saw rival shops' products sitting under "Products".
  //
  // Writes were never at risk — "partner manages own products" still blocks
  // those, and the isolation test proves it — but this read is the store's own
  // inventory screen and must show only their own rows.
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, stock_quantity, is_active, is_pick, is_gift_ready, product_variants(id, name, stock_quantity)")
    .eq("partner_id", user.partnerId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-5 font-display text-h1 text-ink">{t("products.title")}</h1>

      {!products || products.length === 0 ? (
        <EmptyState title={t("products.empty.title")} body={t("products.empty.body")} />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const variants = (p.product_variants ?? []) as Array<{
              id: string;
              name: string;
              stock_quantity: number;
            }>;
            return (
              <li key={p.id} className="rounded-card border border-line bg-surface p-4 shadow-rest">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{p.title}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {p.stock_quantity} {t("products.stock")}
                    </p>
                    {variants.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {variants.map((v) => `${v.name} (${v.stock_quantity})`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">${Number(p.price).toFixed(2)}</p>
                    <span
                      className={`mt-1 inline-block rounded-pill px-2 py-0.5 text-xs font-semibold ${
                        p.is_active
                          ? "bg-status-green-tint text-status-green"
                          : "bg-status-grey-tint text-status-grey"
                      }`}
                    >
                      {p.is_active ? t("products.active") : t("products.hidden")}
                    </span>
                  </div>
                </div>
                <ProductEditor
                  id={p.id}
                  price={Number(p.price)}
                  stock={p.stock_quantity ?? 0}
                  isActive={!!p.is_active}
                  isPick={!!p.is_pick}
                  isGiftReady={!!p.is_gift_ready}
                  variants={variants}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
