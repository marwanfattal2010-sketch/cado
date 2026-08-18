-- ============================================================
-- 0065 — THE ENDLESS HOME PAGE (data half)
--
-- Three small additive pieces for the rebuilt lower half of the All tab:
--
--   1. partners gains a tagline and a featured flag+rank, for the big
--      swipeable "Stores on CADO" cards.
--   2. homepage_config — ONE row, holding which store is Store of the Week.
--   3. home_product_signals() — the aggregate that lets the storefront rank
--      products by what people actually do, without being able to see WHO
--      did it.
--
-- WHY AN RPC AND NOT A GRANT. The storefront deliberately cannot read
-- order_items or favorites across users — one customer must not be able to
-- count another's purchases, and RLS enforces that. But "how many times was
-- this product ordered recently" is an aggregate that betrays nobody. So a
-- SECURITY DEFINER function computes it server-side and returns ONLY
-- product_id + counts. No buyer, no order id, no timestamps leave the
-- database. This is the same reasoning that keeps the Bestseller badge
-- dormant everywhere else: a rank is fine, a ledger is not.
--
-- Everything here is additive: new nullable/defaulted columns, a new table,
-- a new function. The deployed site does not know any of it exists, so the
-- migration is safe to apply BEFORE deploying — which is the required order.
-- ============================================================

alter table partners add column if not exists tagline text;
alter table partners add column if not exists is_featured boolean not null default false;
alter table partners add column if not exists featured_rank int;

comment on column partners.tagline is
  'One line under the store name on the homepage hero cards. Written by an admin; facts only, never an invented promotion.';

-- ------------------------------------------------------------
-- One row of homepage configuration. The single-row shape is enforced the
-- same way app_settings does it: a fixed primary key value.
-- ------------------------------------------------------------
create table if not exists homepage_config (
  id boolean primary key default true check (id),
  store_of_week_partner_id uuid references partners(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into homepage_config (id) values (true) on conflict (id) do nothing;

alter table homepage_config enable row level security;

drop policy if exists "homepage config: public read" on homepage_config;
create policy "homepage config: public read" on homepage_config
  for select using (true);

drop policy if exists "homepage config: admin write" on homepage_config;
create policy "homepage config: admin write" on homepage_config
  for update using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- The signals. product_id + two counts, nothing else.
-- ------------------------------------------------------------
create or replace function home_product_signals(p_days int default 14)
returns table (product_id uuid, recent_orders bigint, favorites bigint)
language sql security definer set search_path = public stable as $$
  select
    p.id as product_id,
    coalesce(o.cnt, 0) as recent_orders,
    coalesce(f.cnt, 0) as favorites
  from products p
  left join (
    select oi.product_id, count(distinct so.order_id) as cnt
    from order_items oi
    join sub_orders so on so.id = oi.sub_order_id
    join orders ord on ord.id = so.order_id
    where ord.created_at > now() - make_interval(days => greatest(1, least(p_days, 90)))
    group by oi.product_id
  ) o on o.product_id = p.id
  left join (
    select product_id, count(*) as cnt from favorites group by product_id
  ) f on f.product_id = p.id
  where p.is_active and coalesce(o.cnt, 0) + coalesce(f.cnt, 0) > 0;
$$;

revoke all on function home_product_signals(int) from public;
grant execute on function home_product_signals(int) to anon, authenticated;

comment on function home_product_signals(int) is
  'Aggregate order/favorite counts per product for homepage ranking. Deliberately exposes counts only — no buyers, no order rows.';
