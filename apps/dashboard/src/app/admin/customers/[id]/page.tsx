import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Wallet as WalletIcon, Gift } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/rpc";
import { Initials, Pill, TintCard, TintChip } from "@/components/v3/tint";

export const dynamic = "force-dynamic";

/**
 * ONE CUSTOMER (V4 §6) — who they are, where they want things delivered, and
 * what they have ordered.
 *
 * The whole page is one call to admin_customer_detail(). Addresses are private
 * data under owner-only RLS; this function is the single place they cross to an
 * admin, one person at a time, and only after someone navigated to that person.
 *
 * No scoring, no "VIP" tier, no lifetime-value band. Those are invented
 * judgements dressed as facts; the real numbers are here instead.
 */

type Address = {
  id: string; label: string | null; recipient_name: string | null; phone: string | null;
  city: string | null; area: string | null; street: string | null; building: string | null;
  floor: string | null; apartment: string | null; notes: string | null; is_default: boolean;
};
type Order = {
  order_id: string; order_number: string; placed_at: string;
  total: number; payment_status: string; statuses: string[];
};
type Detail = {
  profile: { id: string; full_name: string | null; phone: string | null; joined: string } | null;
  addresses: Address[];
  orders: Order[];
  wallet: { balance: number } | null;
  gift_cards_sent: number;
};

const usd = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** One readable line from the address parts that actually exist. */
const oneLine = (a: Address) =>
  [a.street, a.building && `Bldg ${a.building}`, a.floor && `Floor ${a.floor}`, a.apartment, a.area, a.city]
    .filter(Boolean)
    .join(", ");

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const supabase = await createServerClient();
  const { id } = await params;

  const { data, error } = await callRpc<Detail>(supabase, "admin_customer_detail", { p_customer_id: id });
  if (error) {
    return (
      <p className="rounded-card border border-status-red bg-status-red-tint px-3 py-2 text-[13px] text-status-red">
        Could not load this customer: {error.message}
      </p>
    );
  }
  if (!data?.profile) notFound();

  const { profile, addresses, orders, wallet, gift_cards_sent } = data;
  const spent = orders.reduce((n, o) => n + Number(o.total), 0);

  return (
    <div className="space-y-4">
      <nav className="text-[12.5px] text-muted">
        <Link href="/admin/customers" className="hover:text-ink">Customers</Link>
        <span className="mx-1">/</span>
        <span className="text-secondary">{profile.full_name ?? "Customer"}</span>
      </nav>

      {/* Who */}
      <TintCard tint="sky" className="flex flex-wrap items-center gap-4 p-5">
        <Initials name={profile.full_name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold leading-7 text-ink">{profile.full_name ?? "Customer"}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-secondary">
            <span className="inline-flex items-center gap-1 tnum">
              <Phone size={13} /> {profile.phone ?? "No phone on file"}
            </span>
            <span>Joined {date(profile.joined)}</span>
          </p>
        </div>
        <div className="flex gap-5">
          <Figure label="Orders" value={String(orders.length)} />
          <Figure label="Total spent" value={usd(spent)} />
          {wallet ? <Figure label="Wallet" value={usd(wallet.balance)} /> : null}
        </div>
      </TintCard>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Addresses */}
        <section className="rounded-card border border-line bg-surface lg:col-span-1">
          <div className="flex h-12 items-center gap-2 border-b border-line px-4">
            <MapPin size={15} className="text-muted" />
            <h2 className="text-[15px] font-semibold text-ink">Addresses</h2>
            <span className="ml-auto text-[12px] text-muted tnum">{addresses.length}</span>
          </div>
          {addresses.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-secondary">
              No saved addresses yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {addresses.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-ink">{a.label || "Address"}</span>
                    {a.is_default ? (
                      <span className="rounded-pill bg-ribbon-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-ribbon">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[13px] leading-5 text-secondary">{oneLine(a) || "—"}</p>
                  {a.recipient_name || a.phone ? (
                    <p className="mt-1 text-[12px] text-muted tnum">
                      {[a.recipient_name, a.phone].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {a.notes ? <p className="mt-1 text-[12px] italic text-muted">{a.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Orders */}
        <section className="rounded-card border border-line bg-surface lg:col-span-2">
          <div className="flex h-12 items-center justify-between border-b border-line px-4">
            <h2 className="text-[15px] font-semibold text-ink">Orders</h2>
            <span className="text-[12px] text-muted tnum">{orders.length}</span>
          </div>
          {orders.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-secondary">This customer hasn&rsquo;t ordered yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 25).map((o) => (
                <li key={o.order_id}>
                  <Link
                    href={`/admin/orders/${o.order_id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-sunk"
                  >
                    <span className="w-24 shrink-0 text-[13px] font-medium text-ribbon">#{o.order_number}</span>
                    <span className="w-28 shrink-0 text-[12.5px] text-secondary">{date(o.placed_at)}</span>
                    <span className="flex-1 truncate">
                      <Pill status={o.statuses?.[0]} />
                    </span>
                    <span className="text-[13px] font-semibold text-ink tnum">{usd(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {gift_cards_sent > 0 ? (
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-2.5">
            <TintChip size={32}><Gift size={15} /></TintChip>
            <p className="text-[13.5px] text-secondary">
              Bought <span className="font-semibold text-ink tnum">{gift_cards_sent}</span> gift card
              {gift_cards_sent === 1 ? "" : "s"}.
            </p>
            <Link href="/admin/gift-cards" className="ml-auto text-[12.5px] font-medium text-ribbon">
              Gift cards
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11.5px] text-secondary">{label}</p>
      <p className="text-[18px] font-bold text-ink tnum">{value}</p>
    </div>
  );
}
