import Link from "next/link";
import { Star, Users as UsersIcon, Wallet } from "lucide-react";
import { Initials } from "@/components/v3/tint";

/**
 * The smaller Home cards (V5 §1.11–1.13). Server components: every figure is
 * already resolved before render, and none of them compute money — the totals
 * arrive from SECURITY DEFINER functions.
 */

const usd = (v: unknown, dp = 2) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};

function Shell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-card border border-line bg-surface">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

/* ------------------------------------------------ customer satisfaction --- */

export type ReviewSummary = {
  total: number; average: number | null; satisfied_pct: number | null;
  five: number; four: number; three: number; two: number; one: number;
};
export type RecentReview = {
  id: string; rating: number; comment: string | null;
  created_at: string; customer_first_name: string; store_name: string;
};

export function Satisfaction({
  summary,
  recent,
}: {
  summary: ReviewSummary | null;
  recent: RecentReview[];
}) {
  const total = Number(summary?.total ?? 0);

  // No ratings means no percentage. A ring at 0% would read as "everyone is
  // unhappy" and a ring at 100% would be a lie; the card says neither.
  if (!summary || total === 0) {
    return (
      <Shell title="Customer satisfaction">
        <div className="flex h-full flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-sunk text-muted">
            <Star size={20} />
          </span>
          <p className="text-[13.5px] text-secondary">No reviews yet.</p>
          <p className="max-w-[240px] text-[12.5px] text-muted">
            Customers can rate an order once it&rsquo;s delivered.
          </p>
        </div>
      </Shell>
    );
  }

  const pct = Number(summary.satisfied_pct ?? 0);
  const rows: [string, number][] = [
    ["5", Number(summary.five)], ["4", Number(summary.four)], ["3", Number(summary.three)],
    ["2", Number(summary.two)], ["1", Number(summary.one)],
  ];

  return (
    <Shell title="Customer satisfaction">
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* A real ring: the arc IS the percentage. */}
          <div className="relative h-[86px] w-[86px] shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-sunk)" strokeWidth="3.4" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke="var(--tint-mint)" strokeWidth="3.4"
                strokeLinecap="round" strokeDasharray={`${pct} ${100 - pct}`}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[19px] font-bold leading-5 text-ink tnum">{pct}%</span>
              <span className="text-[10px] text-muted">happy</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[24px] font-bold leading-7 text-ink tnum">
              {summary.average ?? "—"}
              <span className="ml-1 text-[13px] font-medium text-secondary">out of 5</span>
            </p>
            <p className="text-[12.5px] text-muted tnum">from {total} rating{total === 1 ? "" : "s"}</p>
            <div className="mt-2 space-y-0.5">
              {rows.map(([star, n]) => (
                <div key={star} className="flex items-center gap-1.5">
                  <span className="w-2 text-[11px] text-muted tnum">{star}</span>
                  <Star size={9} className="shrink-0" style={{ color: "var(--tint-amber)" }} />
                  <span className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-sunk">
                    <span
                      className="block h-full rounded-pill"
                      style={{ width: `${total ? (n / total) * 100 : 0}%`, background: "var(--tint-amber)" }}
                    />
                  </span>
                  <span className="w-4 text-right text-[11px] text-muted tnum">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {recent.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-line pt-3">
            {recent.map((r) => (
              <li key={r.id}>
                <p className="flex items-center gap-1.5 text-[12px] text-muted">
                  <span className="font-medium text-ink">{r.customer_first_name}</span>
                  <span>· {r.store_name} ·</span>
                  <span className="tnum" style={{ color: "var(--tint-amber)" }}>
                    {"★".repeat(r.rating)}
                  </span>
                </p>
                <p className="line-clamp-2 text-[12.5px] text-secondary">{r.comment}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------ finance snapshot -- */

export function FinanceSnapshot({
  earned,
  owed,
  paidOut,
}: {
  earned: number;
  owed: number;
  paidOut: number;
}) {
  return (
    <Shell
      title="Finance"
      action={<Link href="/admin/finance" className="text-[12.5px] font-medium text-ribbon">Open Finance</Link>}
    >
      <div className="space-y-3 p-4">
        <Row icon={<Wallet size={15} />} label="CADO earned" value={usd(earned)} note="In this range" tint="mint" />
        <Row label="Owed to stores" value={usd(owed)} note="Not yet paid out" tint="amber" />
        <Row label="Paid out" value={usd(paidOut)} note="Marked sent" tint="sky" />
        {/*
          No "next payout date" row: CADO has no payout schedule in the
          database, and inventing a date someone might plan around is exactly
          the kind of confident fiction this dashboard refuses.
        */}
      </div>
    </Shell>
  );
}

function Row({
  icon,
  label,
  value,
  note,
  tint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{ color: `var(--tint-${tint})`, background: `color-mix(in srgb, var(--tint-${tint}) 16%, transparent)` }}
      >
        {icon ?? <Wallet size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-ink">{label}</span>
        <span className="block text-[11.5px] text-muted">{note}</span>
      </span>
      <span className="shrink-0 text-[15px] font-bold text-ink tnum">{value}</span>
    </div>
  );
}

/* --------------------------------------------------------- team + activity */

export type TeamMember = {
  user_id: string; full_name: string | null; email: string;
  role: string; last_sign_in_at: string | null; joined: string;
};
export type ActivityRow = {
  id: string; action: string; table_name: string; created_at: string; actor_name: string | null;
};

/** Turns an audit row into a sentence. */
function describe(a: ActivityRow): string {
  const who = a.actor_name ?? "Someone";
  const thing = a.table_name.replace(/_/g, " ").replace(/s$/, "");
  const verb =
    a.action.toLowerCase().includes("insert") || a.action.toLowerCase().includes("create")
      ? "added a"
      : a.action.toLowerCase().includes("delete")
        ? "removed a"
        : "updated a";
  return `${who} ${verb} ${thing}`;
}

export function TeamAndActivity({
  team,
  activity,
}: {
  team: TeamMember[];
  activity: ActivityRow[];
}) {
  return (
    <Shell
      title="Team"
      action={<Link href="/admin/invites" className="text-[12.5px] font-medium text-ribbon">Invite admin</Link>}
    >
      <div className="p-4">
        {team.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-secondary">No admin accounts yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {team.map((m, i) => (
              <li key={m.user_id} className="flex items-center gap-2.5">
                <Initials name={m.full_name ?? m.email} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">
                    {m.full_name ?? m.email.split("@")[0]}
                  </span>
                  <span className="block text-[11.5px] text-muted">Last active {ago(m.last_sign_in_at)}</span>
                </span>
                <span
                  className="shrink-0 rounded-pill px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{
                    color: i === 0 ? "var(--ribbon)" : "var(--text-muted)",
                    background:
                      i === 0 ? "color-mix(in srgb, var(--ribbon) 14%, transparent)" : "var(--surface-sunk)",
                  }}
                >
                  {/* The first admin by join date is the owner. Nobody is
                      pre-created; this only labels an account that exists. */}
                  {i === 0 ? "Owner" : "Admin"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 text-[11.5px] font-medium text-muted">Recent activity</p>
          {activity.length === 0 ? (
            <p className="text-[12.5px] text-secondary">No activity yet.</p>
          ) : (
            <ul className="space-y-1">
              {activity.map((a) => (
                <li key={a.id} className="flex items-baseline gap-1.5 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-secondary">{describe(a)}</span>
                  <span className="shrink-0 text-[11px] text-muted">{ago(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------- upcoming deliveries --- */

export type UpcomingRow = {
  sub_order_id: string; order_id: string; order_number: string; store_name: string;
  items: number; deliver_on: string; time_slot: string | null; status: string; driver_name: string | null;
};

export function UpcomingDeliveries({ rows }: { rows: UpcomingRow[] }) {
  return (
    <Shell title="Upcoming deliveries">
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13.5px] text-secondary">
          No scheduled deliveries this week.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] text-muted">
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 text-right font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Deliver on</th>
                <th className="px-3 py-2 font-medium">Driver</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sub_order_id} className="border-b border-line/60 last:border-0 hover:bg-surface-sunk">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${r.order_id}`} className="font-medium text-ribbon">
                      #{r.order_number}
                    </Link>
                  </td>
                  <td className="max-w-[150px] truncate px-3 py-2 text-secondary">{r.store_name}</td>
                  <td className="px-3 py-2 text-right text-secondary tnum">{r.items}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink">
                    {new Date(r.deliver_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {r.time_slot ? <span className="text-muted"> · {r.time_slot}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    {r.driver_name ? (
                      <span className="text-secondary">{r.driver_name}</span>
                    ) : (
                      <Link href="/admin/delivery" className="text-[12.5px] font-medium text-status-amber">
                        Unassigned · Assign
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

/* --------------------------------------------------------------- top stores */

export type TopStoreRow = { partner_id: string; name: string; orders: number; sales: number };

export function TopStores({ rows }: { rows: TopStoreRow[] }) {
  const max = rows.reduce((n, r) => Math.max(n, Number(r.sales)), 0);
  return (
    <Shell title="Top stores">
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13.5px] text-secondary">No store sales in this range.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.partner_id}>
              <Link
                href={`/admin/stores/${r.partner_id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-sunk"
              >
                <span className="w-4 shrink-0 text-[12px] font-semibold text-muted tnum">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink">{r.name}</span>
                  <span className="mt-1 block h-1 w-full overflow-hidden rounded-pill bg-surface-sunk">
                    <span
                      className="block h-full rounded-pill bg-ribbon"
                      style={{ width: `${max ? (Number(r.sales) / max) * 100 : 0}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-semibold text-ink tnum">{usd(r.sales, 0)}</span>
                  <span className="block text-[11px] text-muted tnum">{r.orders} orders</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export { UsersIcon };
