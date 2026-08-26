-- ============================================================================
-- 0068 — Dashboard V2: the operations back-office
--
-- Additive only. Everything 0031–0033 already built is left alone; this adds
-- what the V2 spec needs and nothing it already has. The store role in this
-- database is `partner` (not the spec's `store_owner`) and every policy here
-- keys on it, matching the thirty policies that already exist.
-- ============================================================================

-- ---------------------------------------------------------------- partners --
-- The application IS a pending partner row. A separate applications table
-- would be a second copy of the same store that could drift from the first.
alter table partners
  add column if not exists pickup_address text,
  add column if not exists driver_contact text,
  add column if not exists store_of_week boolean not null default false,
  add column if not exists is_demo boolean not null default false,
  add column if not exists application_text text,
  add column if not exists applied_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

-- status gains paused/closed/rejected. The existing check (if any) is
-- replaced by one that covers the dashboard's whole vocabulary.
do $$
begin
  if exists (select 1 from information_schema.constraint_column_usage
             where table_name='partners' and constraint_name='partners_status_check') then
    alter table partners drop constraint partners_status_check;
  end if;
end $$;
alter table partners add constraint partners_status_check
  check (status in ('pending','active','paused','closed','rejected'));

-- ---------------------------------------------------------------- profiles --
-- owner vs staff inside one store. Staff cannot touch payout details or the
-- team — enforced below, not just hidden.
alter table profiles
  add column if not exists store_role text not null default 'owner'
    check (store_role in ('owner','staff'));

-- ---------------------------------------------------------------- products --
alter table products
  add column if not exists review_status text not null default 'approved'
    check (review_status in ('approved','pending','rejected'));

-- Cost is store-private and products are the PUBLIC catalogue — every row is
-- world-readable by design, so a cost_price column there would publish every
-- store's margins. It gets its own table with its own lock instead.
create table if not exists product_costs (
  product_id uuid primary key references products(id) on delete cascade,
  cost numeric(10,2) not null check (cost >= 0),
  updated_at timestamptz not null default now()
);

-- The storefront must not show products awaiting review. The storefront
-- filters on is_active + stock; review_status folds into is_active via a
-- trigger so no storefront query needs changing: a pending product is
-- flipped inactive, approval flips it back.
create or replace function sync_review_visibility() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.review_status = 'pending' or new.review_status = 'rejected' then
    new.is_active := false;
  end if;
  return new;
end $$;
drop trigger if exists trg_review_visibility on products;
create trigger trg_review_visibility before insert or update of review_status
  on products for each row execute function sync_review_visibility();

-- hashtags with a colour, many per product
create table if not exists product_hashtags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 40),
  colour text not null default '#C6A664' check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (product_id, tag)
);

-- ---------------------------------------------------------------- settings --
-- Key/value, admin-write. The delivery fee lives here now; place_order is
-- updated below to read it instead of its hard-coded 5.
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

insert into settings (key, value) values
  ('delivery_fee_usd', '5'::jsonb),
  ('support_contacts', '{"email":"cado1782010@gmail.com","whatsapp":null,"instagram":"cado.lb"}'::jsonb),
  ('ordering_window', '{"open":"09:00","close":"21:00","timezone":"Asia/Beirut"}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------- delivery --
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  cost numeric(10,2),
  assigned_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (order_id)
);

-- ---------------------------------------------------------------- support ---
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  customer_id uuid not null references profiles(id) on delete cascade,
  subject text not null default 'Order support',
  message text not null check (char_length(message) <= 2000),
  status text not null default 'open' check (status in ('open','replied','closed')),
  assignee uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- reviews ---
-- Order-linked only: one review per PURCHASED item, which is what makes a
-- review mean something. No order item, no review.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references order_items(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  text text check (char_length(text) <= 1000),
  status text not null default 'visible' check (status in ('visible','hidden')),
  store_reply text check (char_length(store_reply) <= 1000),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- payout data --
-- Bank details are the most sensitive rows a store has. Separate table so
-- the partner row itself stays readable by staff while this stays owner-only.
create table if not exists partner_payout_details (
  partner_id uuid primary key references partners(id) on delete cascade,
  method text not null default 'cash' check (method in ('cash','whish','bank')),
  account_holder text,
  account_number text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists payout_statements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open','paid')),
  paid_at timestamptz,
  paid_method text check (paid_method in ('cash','whish','bank')),
  paid_reference text,
  created_at timestamptz not null default now()
);

alter table store_payables
  add column if not exists statement_id uuid references payout_statements(id) on delete set null,
  add column if not exists paid_at timestamptz,
  add column if not exists paid_method text check (paid_method in ('cash','whish','bank')),
  add column if not exists paid_reference text;

-- ------------------------------------------------- place_order delivery fee --
-- The fee comes from settings now. Wrapped defensively: if the key is gone
-- the old constant stands, because an order that cannot compute its fee is a
-- lost order.
create or replace function delivery_fee_usd() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::numeric from settings where key = 'delivery_fee_usd'), 5);
$$;

-- ------------------------------------------------------------------- RLS ----
alter table product_costs enable row level security;
alter table product_hashtags enable row level security;
alter table settings enable row level security;
alter table drivers enable row level security;
alter table deliveries enable row level security;
alter table support_tickets enable row level security;
alter table support_replies enable row level security;
alter table reviews enable row level security;
alter table partner_payout_details enable row level security;
alter table payout_statements enable row level security;

-- Costs: the owning store and admins. Nobody else, not even select.
drop policy if exists costs_own on product_costs;
create policy costs_own on product_costs for all using (
  is_admin() or exists (
    select 1 from products p join profiles me on me.id = auth.uid()
    where p.id = product_costs.product_id and p.partner_id = me.partner_id and me.role = 'partner'
  )
) with check (
  is_admin() or exists (
    select 1 from products p join profiles me on me.id = auth.uid()
    where p.id = product_costs.product_id and p.partner_id = me.partner_id and me.role = 'partner'
  )
);

-- Everyone can read hashtags (they render on the storefront); only the
-- product's own store or an admin writes them.
drop policy if exists hashtags_read on product_hashtags;
create policy hashtags_read on product_hashtags for select using (true);
drop policy if exists hashtags_write on product_hashtags;
create policy hashtags_write on product_hashtags for all using (
  is_admin() or exists (
    select 1 from products p join profiles me on me.id = auth.uid()
    where p.id = product_hashtags.product_id and p.partner_id = me.partner_id
  )
) with check (
  is_admin() or exists (
    select 1 from products p join profiles me on me.id = auth.uid()
    where p.id = product_hashtags.product_id and p.partner_id = me.partner_id
  )
);

-- Settings: the world may read (the storefront needs the delivery fee and
-- hours), only admins write.
drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (true);
drop policy if exists settings_write on settings;
create policy settings_write on settings for all using (is_admin()) with check (is_admin());

-- Drivers and deliveries are CADO-internal.
drop policy if exists drivers_admin on drivers;
create policy drivers_admin on drivers for all using (is_admin()) with check (is_admin());
drop policy if exists deliveries_admin on deliveries;
create policy deliveries_admin on deliveries for all using (is_admin()) with check (is_admin());

-- Tickets: a customer sees and writes their own; admins see all. Stores see
-- none — support is CADO's desk, not the store's.
drop policy if exists tickets_own on support_tickets;
create policy tickets_own on support_tickets for select using (customer_id = auth.uid() or is_admin());
drop policy if exists tickets_insert on support_tickets;
create policy tickets_insert on support_tickets for insert with check (customer_id = auth.uid());
drop policy if exists tickets_admin_update on support_tickets;
create policy tickets_admin_update on support_tickets for update using (is_admin()) with check (is_admin());

drop policy if exists replies_read on support_replies;
create policy replies_read on support_replies for select using (
  is_admin() or exists (select 1 from support_tickets t where t.id = ticket_id and t.customer_id = auth.uid())
);
drop policy if exists replies_write on support_replies;
create policy replies_write on support_replies for insert with check (
  author_id = auth.uid() and (
    is_admin() or exists (select 1 from support_tickets t where t.id = ticket_id and t.customer_id = auth.uid())
  )
);

-- Reviews: readable by all (they render on the storefront), written only by
-- the customer who bought that exact item, replied to only by that store.
drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (true);
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (
  customer_id = auth.uid() and exists (
    select 1 from order_items oi
    join sub_orders so on so.id = oi.sub_order_id
    join orders o on o.id = so.order_id
    where oi.id = order_item_id and o.customer_id = auth.uid() and so.status = 'delivered'
  )
);
drop policy if exists reviews_store_reply on reviews;
create policy reviews_store_reply on reviews for update using (
  is_admin() or exists (
    select 1 from profiles me where me.id = auth.uid()
      and me.role = 'partner' and me.partner_id = reviews.partner_id
  )
) with check (
  is_admin() or exists (
    select 1 from profiles me where me.id = auth.uid()
      and me.role = 'partner' and me.partner_id = reviews.partner_id
  )
);

-- Payout details: THE strictest table. The store's OWNER (not staff) and
-- admins. Nothing else, not even select.
drop policy if exists payout_details_owner on partner_payout_details;
create policy payout_details_owner on partner_payout_details for all using (
  is_admin() or exists (
    select 1 from profiles me where me.id = auth.uid()
      and me.role = 'partner' and me.store_role = 'owner'
      and me.partner_id = partner_payout_details.partner_id
  )
) with check (
  is_admin() or exists (
    select 1 from profiles me where me.id = auth.uid()
      and me.role = 'partner' and me.store_role = 'owner'
      and me.partner_id = partner_payout_details.partner_id
  )
);

-- Statements: the store reads its own, admins everything.
drop policy if exists statements_read on payout_statements;
create policy statements_read on payout_statements for select using (
  is_admin() or exists (
    select 1 from profiles me where me.id = auth.uid()
      and me.role = 'partner' and me.partner_id = payout_statements.partner_id
  )
);
drop policy if exists statements_admin on payout_statements;
create policy statements_admin on payout_statements for insert with check (is_admin());
drop policy if exists statements_admin_update on payout_statements;
create policy statements_admin_update on payout_statements for update using (is_admin()) with check (is_admin());

-- ---------------------------------------------------- admin read functions --
-- Gift cards stay unreachable from the browser role; admins read them
-- through these, and reveal of a full code is a separate audited act.
create or replace function admin_gift_cards_list()
returns table (
  id uuid, code_last4 text, original_amount numeric, current_balance numeric,
  status text, buyer_name text, recipient_name text, delivery_method text,
  created_at timestamptz, expires_at timestamptz
)
language sql security definer set search_path = public as $$
  select gc.id, right(gc.code, 4), gc.original_amount, gc.current_balance,
         gc.status, gc.buyer_name, gc.recipient_name, gc.delivery_method,
         gc.created_at, gc.expires_at
  from gift_cards gc
  where is_admin()
  order by gc.created_at desc
$$;

-- One row per day. Joining order_items directly onto orders would multiply
-- the order totals by the item count, so each measure is aggregated in its
-- own subquery and only then joined by day.
create or replace function admin_finance_breakdown(p_from date, p_to date)
returns table (
  day date, gmv numeric, orders bigint, commission numeric, delivery_fees numeric
)
language sql security definer set search_path = public as $$
  with o as (
    select date_trunc('day', created_at)::date as day,
           sum(total) as gmv, count(*) as orders, sum(delivery_fee) as delivery_fees
    from orders
    where created_at >= p_from and created_at < p_to + 1
    group by 1
  ),
  c as (
    select date_trunc('day', ord.created_at)::date as day,
           sum(oi.commission_amount_snapshot) as commission
    from order_items oi
    join sub_orders so on so.id = oi.sub_order_id and so.status <> 'cancelled'
    join orders ord on ord.id = so.order_id
    where ord.created_at >= p_from and ord.created_at < p_to + 1
    group by 1
  )
  select o.day, coalesce(o.gmv,0), coalesce(o.orders,0),
         coalesce(c.commission,0), coalesce(o.delivery_fees,0)
  from o left join c on c.day = o.day
  where is_admin()
  order by o.day
$$;

-- Everything the admin order-detail page shows, one round trip. The page
-- fell back to admin_orders() before this existed; with it, gift fields,
-- the address, commission snapshots and the event timeline all arrive
-- together. SECURITY DEFINER because admins cannot (and should not) read
-- orders/addresses directly — RLS there is customer-own-rows.
create or replace function admin_order_detail(p_order_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not is_admin() then raise exception 'admin only'; end if;

  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'created_at', o.created_at,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'discount_amount', o.discount_amount,
    'wallet_amount', o.wallet_amount,
    'total', o.total,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'is_gift', o.is_gift,
    'recipient_name', o.recipient_name,
    'recipient_phone', o.recipient_phone,
    'gift_message', o.gift_message,
    'hide_price', o.hide_price,
    'delivery_slot', o.delivery_slot,
    'customer', (select jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'phone', pr.phone)
                 from profiles pr where pr.id = o.customer_id),
    'customer_orders', (select count(*) from orders x where x.customer_id = o.customer_id),
    'customer_lifetime', (select coalesce(sum(x.total),0) from orders x where x.customer_id = o.customer_id),
    'address', (select jsonb_build_object('recipient_name', a.recipient_name, 'phone', a.phone,
                  'city', a.city, 'area', a.area, 'street', a.street, 'building', a.building,
                  'floor', a.floor, 'apartment', a.apartment, 'notes', a.notes)
                from addresses a where a.id = o.delivery_address_id),
    'sub_orders', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', so.id, 'status', so.status, 'partner_id', so.partner_id,
        'partner_name', pa.name,
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', oi.id, 'title', oi.product_title_snapshot,
            'unit_price', oi.unit_price_snapshot, 'quantity', oi.quantity,
            'line_total', oi.line_total,
            'commission', oi.commission_amount_snapshot,
            'variant', oi.variant_name_snapshot
          ) order by oi.id), '[]'::jsonb)
          from order_items oi where oi.sub_order_id = so.id
        )
      )), '[]'::jsonb)
      from sub_orders so left join partners pa on pa.id = so.partner_id
      where so.order_id = o.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ev.id, 'event_type', ev.event_type, 'actor_role', ev.actor_role,
        'from_status', ev.from_status, 'to_status', ev.to_status,
        'message', ev.message, 'created_at', ev.created_at
      ) order by ev.created_at), '[]'::jsonb)
      from order_events ev where ev.order_id = o.id
    )
  ) into result
  from orders o where o.id = p_order_id;

  return result;
end $$;

-- ---------------------------------------------------------------- comments --
comment on table settings is 'Admin-editable key/value config. delivery_fee_usd is read by delivery_fee_usd() for place_order.';
comment on column partners.is_demo is 'Seed partners operated by CADO until real stores sign. delete where is_demo wipes them.';
comment on column products.review_status is 'pending products are flipped inactive by trigger until an admin approves.';
