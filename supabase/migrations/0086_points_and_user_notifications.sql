-- 0086: points and in-app notifications for the storefront header (spec 1.11).
--
-- Additive only.
--
-- NOTIFICATIONS: the spec asks for a new table, but `notifications` already
-- exists (0031) and already has recipient_id, subject, body and a link to a
-- sub_order. It is missing only `read_at` and `link`, so it gains those rather
-- than a second table — two tables named notifications drift apart, and then
-- the bell counts one of them.

alter table notifications
  add column if not exists read_at timestamptz,
  add column if not exists link text check (link is null or char_length(link) <= 300);

create index if not exists notifications_recipient_idx
  on notifications (recipient_id, created_at desc) where recipient_id is not null;

-- A shopper reads their own, and marks their own read. Nothing else.
drop policy if exists notifications_own_read on notifications;
create policy notifications_own_read on notifications for select
  using (recipient_id = auth.uid());

drop policy if exists notifications_own_mark on notifications;
create policy notifications_own_mark on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

/**
 * Insert a notification for one person. SECURITY DEFINER because the browser
 * must never be able to write itself a notification — an in-app message is a
 * statement by CADO, not by whoever is holding the phone.
 */
create or replace function notify_user(
  p_user uuid, p_subject text, p_body text, p_link text default null,
  p_template text default 'order_update'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into notifications (recipient_id, channel, template, subject, body, link, status)
  values (p_user, 'in_app', p_template, p_subject, p_body, p_link, 'sent')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function notify_user(uuid, text, text, text, text) from public, anon;

-- ============================================================== points =====
create table if not exists user_points (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  -- One award per order, ever. Without this a status flipping to delivered
  -- twice pays twice, and points would quietly become free money.
  unique (order_id, reason)
);

create index if not exists points_tx_user_idx on points_transactions (user_id, created_at desc);

alter table user_points enable row level security;
alter table points_transactions enable row level security;

-- Read your own. Writes go through the function below and nowhere else: a
-- balance the client can write is not a balance.
drop policy if exists points_own on user_points;
create policy points_own on user_points for select using (user_id = auth.uid());

drop policy if exists points_tx_own on points_transactions;
create policy points_tx_own on points_transactions for select using (user_id = auth.uid());

/**
 * Award points for a DELIVERED order: 1 point per $1 of what the customer
 * actually paid. Called from the delivery-status path, never from a browser.
 *
 * Idempotent by the unique (order_id, reason) constraint — calling it twice
 * for the same order is a no-op rather than a double payout.
 */
create or replace function award_points_for_order(p_order_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_total numeric;
  v_points integer;
begin
  select o.customer_id, o.total into v_user, v_total from orders o where o.id = p_order_id;
  if v_user is null then return 0; end if;

  -- Only once every part of the order has actually arrived.
  if exists (select 1 from sub_orders s where s.order_id = p_order_id and s.status <> 'delivered') then
    return 0;
  end if;

  v_points := floor(coalesce(v_total, 0))::integer;
  if v_points <= 0 then return 0; end if;

  begin
    insert into points_transactions (user_id, order_id, delta, reason)
    values (v_user, p_order_id, v_points, 'order_delivered');
  exception when unique_violation then
    return 0; -- already awarded
  end;

  insert into user_points (user_id, balance, updated_at)
  values (v_user, v_points, now())
  on conflict (user_id) do update
    set balance = user_points.balance + excluded.balance, updated_at = now();

  perform notify_user(
    v_user,
    'Your order was delivered',
    'You earned ' || v_points || ' points.',
    '/orders'
  );

  return v_points;
end;
$$;
revoke all on function award_points_for_order(uuid) from public, anon;

/** A shopper's own balance, and 0 for someone who has never earned any. */
create or replace function my_points()
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select balance from user_points where user_id = auth.uid()), 0)
$$;
revoke all on function my_points() from public, anon;
grant execute on function my_points() to authenticated;

comment on table user_points is
  'Earned points. 1 per $1 on a delivered order, awarded only by award_points_for_order(). Not redeemable yet — the Points page says so.';
