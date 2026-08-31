import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/dictionary";
import { PageHeader, Card, EmptyStateV2, KpiCard } from "@/components/ui";
import { ReplyForm } from "./ReplyForm";

export const dynamic = "force-dynamic";

/**
 * §5.6 REVIEWS — this store's products only.
 *
 * The RLS policy `reviews_read` is `using (true)`: reviews are public, because
 * they render on the storefront for anonymous shoppers. So the partner scope
 * here is doing ALL of the work — without .eq("partner_id", …) this page would
 * list every review on CADO. That is the same trap the products page fell into.
 *
 * Nothing on this page can change `reviews.status`. Hiding a review is CADO's
 * call, so the control simply does not exist; a hidden review is shown to the
 * owner with a plain explanation instead.
 */
export default async function StoreReviewsPage() {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const { data: rows } = await supabase
    .from("reviews")
    .select("id, rating, text, status, store_reply, created_at, product_id, products(title)")
    .eq("partner_id", user.partnerId)
    .order("created_at", { ascending: false })
    .limit(200);

  const reviews = rows ?? [];

  if (reviews.length === 0) {
    return (
      <div>
        <PageHeader title={t("reviews.title")} />
        <EmptyStateV2 icon="☆" title={t("reviews.empty.title")} />
        <p className="mx-auto mt-3 max-w-sm text-center text-sm text-muted">
          {t("reviews.empty.body")}
        </p>
      </div>
    );
  }

  const average = reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / reviews.length;

  return (
    <div className="pb-4">
      <PageHeader title={t("reviews.title")} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <KpiCard label={t("reviews.average")} value={`${average.toFixed(1)} ★`} />
        <KpiCard label={t("reviews.count")} value={String(reviews.length)} />
      </div>

      <ul className="space-y-3">
        {reviews.map((r) => {
          // A to-one embed: supabase-js types it as an object, but older
          // generated types have shipped it as an array. Handle both rather
          // than render "undefined" at a customer-facing name.
          const product = (Array.isArray(r.products) ? r.products[0] : r.products) as
            | { title: string | null }
            | null
            | undefined;

          return (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Stars rating={Number(r.rating ?? 0)} />
                    <p className="mt-1 truncate text-sm font-medium text-ink">
                      {product?.title ?? "—"}
                    </p>
                  </div>
                  <time
                    dateTime={r.created_at}
                    className="shrink-0 text-xs text-muted"
                    suppressHydrationWarning
                  >
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>

                {r.text ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {r.text}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted">Rating only — no written review.</p>
                )}

                {r.status !== "visible" ? (
                  <div className="mt-3 rounded-card bg-status-grey-tint p-3">
                    <p className="text-xs font-semibold text-status-grey">{t("reviews.hidden")}</p>
                    <p className="mt-0.5 text-xs text-muted">{t("reviews.hidden.hint")}</p>
                  </div>
                ) : null}

                <ReplyForm reviewId={r.id} existingReply={r.store_reply} />
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Five stars, filled to the rating. Text stars keep this dependency-free and
 *  legible at 375px; the aria-label is what a screen reader actually gets. */
function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="text-base leading-none tracking-[0.1em] text-gold"
      role="img"
      aria-label={`${filled} out of 5 stars`}
    >
      {"★".repeat(filled)}
      <span className="text-line">{"★".repeat(5 - filled)}</span>
    </span>
  );
}
