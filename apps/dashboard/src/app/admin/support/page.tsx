import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyStateV2, KpiCard } from "@/components/ui";
import { t } from "@/lib/dictionary";
import { TicketReply } from "./TicketReply";
import { ReviewModeration } from "./ReviewModeration";

export const dynamic = "force-dynamic";

/**
 * Support desk + review moderation (§4.11).
 *
 * Both halves of this page read tables that nothing writes to yet — the
 * storefront has no "contact support" flow and no review form. That is not a
 * reason to fake a queue: the empty states below say what will appear and
 * why nothing is there, and every count on the page is computed from rows the
 * query actually returned.
 *
 * Support is CADO's desk, not the store's — the RLS on support_tickets gives
 * stores no read at all — so this page is admin-only and there is no store
 * equivalent.
 */

const TICKET_FILTERS = [
  { key: "open", label: "admin.support.filter.open" },
  { key: "replied", label: "admin.support.filter.replied" },
  { key: "closed", label: "admin.support.filter.closed" },
  { key: "all", label: "admin.support.filter.all" },
] as const;

const REVIEW_STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
] as const;

const RATINGS = ["all", "5", "4", "3", "2", "1"] as const;

const LIMIT = 200;

/* ------------------------------------------------------------- helpers --- */

/** PostgREST returns a to-one embed as an object; older shapes hand back a
 *  one-element array. Normalise both rather than betting on one. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** First name only for reviews — a public-facing review shouldn't put a
 *  customer's full name on an admin screen next to their purchase history. */
function firstName(full: string | null | undefined): string {
  const n = (full ?? "").trim();
  if (!n) return "Customer";
  return n.split(/\s+/)[0];
}

function href(base: Record<string, string | undefined>, patch: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v && v !== "") params.set(k, v);
  }
  const q = params.toString();
  return `/admin/support${q ? `?${q}` : ""}`;
}

function Pill({ href: to, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`inline-flex min-h-[36px] items-center whitespace-nowrap rounded-pill px-3 text-xs font-semibold transition-colors ${
        active ? "bg-ribbon text-white" : "border border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Ticket and review status, in this page's own words.
 *
 * StatusPill is the shared component and is used everywhere it fits, but its
 * vocabulary is the ORDER lifecycle: it has no entry for 'replied' or
 * 'hidden', so routing them through it renders a replied ticket as
 * "Confirmed" and a hidden review as "Closed". A pill that says the wrong
 * word is worse than a pill that isn't shared, so this one keeps StatusPill's
 * exact shape and colour grammar (amber awaiting, blue in progress, grey
 * done, green live) and only supplies honest labels.
 */
const TAGS: Record<string, { bg: string; fg: string; label: string }> = {
  open: { bg: "bg-status-amber-tint", fg: "text-status-amber", label: "Open" },
  replied: { bg: "bg-status-blue-tint", fg: "text-status-blue", label: "Replied" },
  closed: { bg: "bg-status-grey-tint", fg: "text-status-grey", label: "Closed" },
  visible: { bg: "bg-status-green-tint", fg: "text-status-green", label: "Live" },
  hidden: { bg: "bg-status-grey-tint", fg: "text-status-grey", label: "Hidden" },
};

function Tag({ status }: { status: string }) {
  const s = TAGS[status] ?? { bg: "bg-status-grey-tint", fg: "text-status-grey", label: status };
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="whitespace-nowrap text-sm tracking-[0.08em]" role="img" aria-label={`${r} out of 5`}>
      <span className="text-gold">{"★".repeat(r)}</span>
      <span className="text-line">{"☆".repeat(5 - r)}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- page --- */

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; rating?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;

  const tab = sp.tab === "reviews" ? "reviews" : "tickets";
  const base = { tab, status: sp.status, rating: sp.rating };

  return (
    <div>
      <PageHeader title={t("admin.support.title")} />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <Pill href={href({ tab: "tickets" }, {})} active={tab === "tickets"}>
          {t("admin.support.tab.tickets")}
        </Pill>
        <Pill href={href({ tab: "reviews" }, {})} active={tab === "reviews"}>
          {t("admin.support.tab.reviews")}
        </Pill>
      </div>

      {tab === "tickets" ? (
        <TicketsTab status={sp.status} base={base} />
      ) : (
        <ReviewsTab status={sp.status} rating={sp.rating} base={base} />
      )}
    </div>
  );

  /* ------------------------------------------------------------ tickets -- */

  async function TicketsTab({
    status,
    base,
  }: {
    status?: string;
    base: Record<string, string | undefined>;
  }) {
    const active = TICKET_FILTERS.some((f) => f.key === status) ? (status as string) : "open";

    let query = supabase
      .from("support_tickets")
      .select(
        "id, order_id, subject, message, status, created_at, customer:profiles!support_tickets_customer_id_fkey(full_name, phone)"
      )
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (active !== "all") query = query.eq("status", active);

    // The unfiltered head count exists only so the empty state can tell the
    // truth: "nothing has ever come in" is a different sentence from "nothing
    // is open right now".
    const [{ data: ticketRows }, { count: totalTickets }] = await Promise.all([
      query,
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
    ]);

    const tickets = ticketRows ?? [];
    const ids = tickets.map((tk) => tk.id);

    /* Explicit row type rather than `typeof` off the query: the "no tickets,
       so skip the query" branch would otherwise widen the result to never[]
       and poison the Map. */
    type ReplyRow = {
      id: string;
      ticket_id: string;
      body: string;
      created_at: string;
      author: { full_name: string | null; role: string } | { full_name: string | null; role: string }[] | null;
    };

    const replyRows: ReplyRow[] = ids.length
      ? ((
          await supabase
            .from("support_replies")
            .select(
              "id, ticket_id, body, created_at, author:profiles!support_replies_author_id_fkey(full_name, role)"
            )
            .in("ticket_id", ids)
            .order("created_at", { ascending: true })
        ).data ?? [])
      : [];

    const byTicket = new Map<string, ReplyRow[]>();
    for (const r of replyRows) {
      const list = byTicket.get(r.ticket_id) ?? [];
      list.push(r);
      byTicket.set(r.ticket_id, list);
    }

    return (
      <div>
        {/* Delivery honesty. This banner is load-bearing: an admin who thinks
            a reply was emailed will not pick up the phone. */}
        <div className="mb-4 rounded-card border border-line bg-status-amber-tint px-3 py-2.5">
          <p className="text-xs font-semibold text-status-amber">{t("admin.support.delivery.title")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink">{t("admin.support.delivery.body")}</p>
        </div>

        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {TICKET_FILTERS.map((f) => (
            <Pill key={f.key} href={href(base, { status: f.key })} active={active === f.key}>
              {t(f.label)}
            </Pill>
          ))}
        </div>

        {tickets.length === 0 ? (
          <EmptyStateV2
            icon="✉"
            title={
              (totalTickets ?? 0) > 0
                ? `No ${active} tickets right now.`
                : t("admin.support.tickets.empty.title")
            }
            action={
              <p className="max-w-md px-6 text-xs leading-relaxed text-muted">
                {(totalTickets ?? 0) > 0
                  ? `${totalTickets} ticket${totalTickets === 1 ? "" : "s"} in total — switch the filter above to see them.`
                  : t("admin.support.tickets.empty.body")}
              </p>
            }
          />
        ) : (
          <div className="space-y-3">
            {tickets.map((tk) => {
              const customer = one(tk.customer);
              const replies = byTicket.get(tk.id) ?? [];
              return (
                <Card key={tk.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {customer?.full_name ?? "Customer"}
                      </p>
                      {customer?.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                        >
                          {customer.phone}
                        </a>
                      ) : (
                        <p className="text-xs text-muted">No phone on file</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Tag status={tk.status} />
                      <span className="whitespace-nowrap text-[11px] text-muted">{when(tk.created_at)}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-medium text-ink">{tk.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">{tk.message}</p>

                  {tk.order_id ? (
                    <Link
                      href={`/admin/orders/${tk.order_id}`}
                      className="mt-2 inline-flex items-center gap-1 rounded-pill bg-ribbon-tint px-2.5 py-1 text-xs font-semibold text-ribbon"
                    >
                      {t("admin.support.vieworder")} →
                    </Link>
                  ) : null}

                  <div className="mt-3 rounded-card bg-surface-sunk p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("admin.support.thread")}
                    </p>
                    {replies.length === 0 ? (
                      <p className="mt-1 text-xs text-muted">{t("admin.support.noreplies")}</p>
                    ) : (
                      <ul className="mt-2 space-y-2.5">
                        {replies.map((r) => {
                          const author = one(r.author);
                          return (
                            <li key={r.id} className="border-l-2 border-line pl-2.5">
                              <p className="text-xs font-semibold text-ink">
                                {author?.role === "admin"
                                  ? t("admin.support.you")
                                  : (author?.full_name ?? "Customer")}
                                <span className="ml-2 font-normal text-muted">{when(r.created_at)}</span>
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
                                {r.body}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <TicketReply ticketId={tk.id} status={tk.status} />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------ reviews -- */

  async function ReviewsTab({
    status,
    rating,
    base,
  }: {
    status?: string;
    rating?: string;
    base: Record<string, string | undefined>;
  }) {
    const activeStatus = REVIEW_STATUS_FILTERS.some((f) => f.key === status) ? (status as string) : "all";
    const activeRating = RATINGS.includes((rating ?? "all") as (typeof RATINGS)[number])
      ? (rating ?? "all")
      : "all";

    let query = supabase
      .from("reviews")
      .select(
        "id, rating, text, status, store_reply, created_at, product:products!reviews_product_id_fkey(title), partner:partners!reviews_partner_id_fkey(name), customer:profiles!reviews_customer_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (activeStatus !== "all") query = query.eq("status", activeStatus);
    if (activeRating !== "all") query = query.eq("rating", Number(activeRating));

    const [{ data: reviewRows }, { count: totalReviews }] = await Promise.all([
      query,
      supabase.from("reviews").select("id", { count: "exact", head: true }),
    ]);

    const reviews = reviewRows ?? [];

    /*
     * The two figures in the header are computed from exactly these rows and
     * are labelled as such. An "average rating" that quietly excluded the
     * hidden reviews, or that averaged 200 of 900 rows while calling itself
     * the site average, would be a lie with a decimal point on it.
     */
    const shown = reviews.length;
    const avg = shown ? reviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / shown : null;
    const filtered = activeStatus !== "all" || activeRating !== "all";
    const capped = shown === LIMIT;

    return (
      <div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <KpiCard tint="violet"
            label={t("admin.support.reviews.count")}
            value={String(shown)}
            hint={
              filtered
                ? `of ${totalReviews ?? 0} total, after filters`
                : capped
                  ? `most recent ${LIMIT} of ${totalReviews ?? 0}`
                  : "every review"
            }
          />
          <KpiCard tint="amber"
            label={t("admin.support.reviews.avg")}
            value={avg == null ? "—" : avg.toFixed(1)}
            hint={
              avg == null
                ? "No reviews to average"
                : `Average of ${shown} review${shown === 1 ? "" : "s"} shown`
            }
          />
        </div>

        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {REVIEW_STATUS_FILTERS.map((f) => (
            <Pill key={f.key} href={href(base, { status: f.key })} active={activeStatus === f.key}>
              {f.label}
            </Pill>
          ))}
        </div>
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {RATINGS.map((r) => (
            <Pill key={r} href={href(base, { rating: r })} active={activeRating === r}>
              {r === "all" ? t("admin.support.reviews.rating.all") : `${r} ★`}
            </Pill>
          ))}
        </div>

        {reviews.length === 0 ? (
          <EmptyStateV2
            icon="★"
            title={
              (totalReviews ?? 0) > 0
                ? t("admin.support.reviews.filtered.title")
                : t("admin.support.reviews.empty.title")
            }
            action={
              <p className="max-w-md px-6 text-xs leading-relaxed text-muted">
                {(totalReviews ?? 0) > 0
                  ? t("admin.support.reviews.filtered.body")
                  : t("admin.support.reviews.empty.body")}
              </p>
            }
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((rv) => {
              const product = one(rv.product);
              const partner = one(rv.partner);
              const customer = one(rv.customer);
              return (
                <Card key={rv.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Stars rating={Number(rv.rating)} />
                    <div className="flex shrink-0 items-center gap-2">
                      <Tag status={rv.status} />
                      <span className="whitespace-nowrap text-[11px] text-muted">
                        {new Date(rv.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>

                  {rv.text ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{rv.text}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-muted">Rating only — no written review.</p>
                  )}

                  <p className="mt-2 text-xs text-muted">
                    <span className="font-medium text-ink">{product?.title ?? "Product"}</span>
                    {partner?.name ? <> · {partner.name}</> : null} · {firstName(customer?.full_name)}
                  </p>

                  {rv.store_reply ? (
                    <div className="mt-2 rounded-card bg-surface-sunk p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {t("admin.support.review.storereply")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
                        {rv.store_reply}
                      </p>
                    </div>
                  ) : null}

                  <ReviewModeration reviewId={rv.id} status={rv.status} />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
