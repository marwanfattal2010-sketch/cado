import Link from "next/link";
import { Store as StoreIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Pill, STORE_LABEL } from "@/components/v3/tint";
import { StoreSearch } from "./StoreSearch";

export const dynamic = "force-dynamic";

/**
 * STORES (V4 §4) — a compact grid built for thousands, not full-width blocks.
 *
 * The old page rendered one giant card per store, four metrics and two buttons
 * each, stacked. At 27 stores that was a very long page; at 2,700 it would be
 * unusable. Four cards per row at 1440, 24 per page, filtered and sorted before
 * anything is drawn.
 *
 * Money comes from admin_partner_totals() — stored snapshots, never recomputed
 * here. That function returns LIFETIME totals per store, so that is what the
 * card says it is showing; the per-range view lives on Finance.
 */

const PAGE_SIZE = 24;

type Totals = {
  partner_id: string; name: string; status: string; city: string | null;
  commission_rate: number; owner_email: string | null;
  orders_count: number; gross_revenue: number; commission: number; payable_pending: number;
};

const usd = (v: unknown, dp = 0) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

const SORTS = [
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
  { key: "az", label: "A–Z" },
] as const;

/**
 * `closed` is here because closing a store is how a store is REMOVED from
 * CADO — nothing is ever deleted, so a removed shop has to remain findable.
 * Without this chip it fell into "all" with no way to filter to it or away
 * from it, which is what made it look as though there were no way to remove a
 * store at all.
 */
const STATUSES = ["all", "active", "pending", "paused", "closed"] as const;

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string; sort?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createServerClient();
  const sp = await searchParams;

  const [{ data: totalsData, error }, { data: partnerRows }, { data: productRows }] = await Promise.all([
    supabase.rpc("admin_partner_totals"),
    supabase.from("partners").select("id, logo_url, is_demo, status, city"),
    supabase.from("products").select("partner_id").eq("is_active", true),
  ]);

  const meta = new Map((partnerRows ?? []).map((p) => [p.id, p]));
  const productCount = new Map<string, number>();
  for (const p of productRows ?? []) productCount.set(p.partner_id, (productCount.get(p.partner_id) ?? 0) + 1);

  let stores = (totalsData ?? []) as Totals[];

  const q = (sp.q ?? "").trim().toLowerCase();
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "all";
  const city = sp.city ?? "";
  const sort = SORTS.find((s) => s.key === sp.sort)?.key ?? "revenue";

  const cities = [...new Set(stores.map((s) => s.city).filter((c): c is string => Boolean(c)))].sort();

  if (q) stores = stores.filter((s) => s.name.toLowerCase().includes(q));
  if (status !== "all") stores = stores.filter((s) => s.status === status);
  if (city) stores = stores.filter((s) => s.city === city);

  stores = [...stores].sort((a, b) => {
    if (sort === "orders") return Number(b.orders_count) - Number(a.orders_count);
    if (sort === "az") return a.name.localeCompare(b.name);
    return Number(b.gross_revenue) - Number(a.gross_revenue);
  });

  const total = stores.length;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = stores.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, status: sp.status, city: sp.city, sort: sp.sort, page: sp.page, ...over };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all") p.set(k, String(v));
    return `/admin/stores${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-8 text-ink">Stores</h1>
          <p className="mt-0.5 text-[13.5px] text-secondary tnum">
            {total.toLocaleString()} store{total === 1 ? "" : "s"}
            {status !== "all" || q || city ? " matching these filters" : ""}
          </p>
        </div>
        <Link
          href="/admin/invites"
          className="rounded-[12px] bg-ribbon px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ribbon-deep"
        >
          Invite a store owner
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13px] text-status-red">
          Could not load stores: {error.message}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StoreSearch initial={sp.q ?? ""} keep={{ status: sp.status, city: sp.city, sort: sp.sort }} />

        <div className="flex gap-1 rounded-pill border border-line bg-surface p-1">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={qs({ status: s, page: undefined })}
              className={`rounded-pill px-2.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                status === s ? "bg-ribbon text-white" : "text-secondary hover:text-ink"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {cities.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {["", ...cities].map((c) => (
              <Link
                key={c || "all-cities"}
                href={qs({ city: c || undefined, page: undefined })}
                className={`rounded-pill border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  city === c ? "border-ribbon text-ribbon" : "border-line text-secondary hover:text-ink"
                }`}
              >
                {c || "All cities"}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-1 text-[12.5px] text-muted">
          <span>Sort</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={qs({ sort: s.key, page: undefined })}
              className={`rounded-pill px-2 py-1 font-medium transition-colors ${
                sort === s.key ? "bg-ribbon-tint text-ribbon" : "text-secondary hover:text-ink"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface px-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-surface-sunk text-muted">
            <StoreIcon size={22} />
          </span>
          <p className="text-[13.5px] text-secondary">No stores match these filters.</p>
          <Link href="/admin/stores" className="text-[13px] font-semibold text-ribbon">Clear filters</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((s) => {
            const m = meta.get(s.partner_id);
            const isDemo = m?.is_demo || (s.owner_email ?? "").includes("@cado-demo.local") ||
              (s.owner_email ?? "").includes("@cadotest.local");
            return (
              <div
                key={s.partner_id}
                className="flex flex-col rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <div className="mb-3 flex items-start gap-2.5">
                  {m?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-pill object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-ribbon text-[13px] font-bold text-white">
                      {s.name.replace(/\[.*?\]\s*/g, "").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-5 text-ink">{s.name}</p>
                    <p className="truncate text-[12.5px] text-secondary">
                      {s.city ?? "—"} · {productCount.get(s.partner_id) ?? 0} products
                    </p>
                  </div>
                  <Pill status={s.status} label={STORE_LABEL[s.status]} />
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-[12.5px]">
                  <Stat label="Orders" value={String(s.orders_count)} />
                  <Stat label="Revenue" value={usd(s.gross_revenue)} />
                  <Stat label="CADO share" value={usd(s.commission, 2)} />
                  <Stat label="Owed" value={usd(s.payable_pending, 2)} strong />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/admin/stores/${s.partner_id}`}
                    className="flex-1 rounded-[10px] bg-ribbon px-3 py-1.5 text-center text-[12.5px] font-semibold text-white transition-colors hover:bg-ribbon-deep"
                  >
                    Open
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      const { enterViewAs } = await import("./view-as/actions");
                      await enterViewAs(s.partner_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-[10px] border border-line px-3 py-1.5 text-[12.5px] font-medium text-secondary transition-colors hover:text-ink"
                    >
                      View as store
                    </button>
                  </form>
                </div>

                {/* A quiet tag, not a shouting badge. */}
                {isDemo ? <p className="mt-2 text-[11px] text-muted">Demo store</p> : null}
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-secondary">
          <span className="tnum">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <Link
              href={qs({ page: page - 1 })}
              className={`rounded-[10px] border border-line px-2.5 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:text-ink"}`}
            >
              Previous
            </Link>
            <Link
              href={qs({ page: page + 1 })}
              className={`rounded-[10px] border border-line px-2.5 py-1.5 ${page >= pages ? "pointer-events-none opacity-40" : "hover:text-ink"}`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className={`tnum ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</p>
    </div>
  );
}
