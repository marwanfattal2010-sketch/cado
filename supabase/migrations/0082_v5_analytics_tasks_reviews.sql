-- 0082: V5 foundations — visitor analytics, tasks, review submission, and the
-- read functions Home needs. Additive only: nothing existing is altered or
-- dropped, so this is safe to apply before the deploy that uses it.

-- =========================================================== site_events ===
-- Our own analytics. No third party, no cookies, no IP, no personal data — a
-- random session id kept in sessionStorage and the path. That is enough to
-- answer "how many people came and what did they look at" and nothing else.
--
-- The browser may INSERT and may not SELECT. A visitor counter that visitors
-- can read is a list of everywhere everyone has been.
create table if not exists site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  user_id uuid references profiles(id) on delete set null,
  event text not null check (event in ('page_view')),
  path text not null check (char_length(path) <= 300),
  referrer text check (char_length(referrer) <= 200),
  device text check (device in ('mobile', 'desktop', 'tablet'))
);

create index if not exists site_events_created_idx on site_events (created_at);
create index if not exists site_events_session_idx on site_events (session_id, created_at);

alter table site_events enable row level security;

-- Write-only from the browser, for everyone including logged-out visitors.
drop policy if exists site_events_insert on site_events;
create policy site_events_insert on site_events for insert to anon, authenticated with check (true);

-- Reading is for CADO staff, and only through the aggregate below.
drop policy if exists site_events_admin_read on site_events;
create policy site_events_admin_read on site_events for select using (is_admin());

/**
 * Per-day traffic for the Home analytics cards. Returns counts only.
 */
create or replace function admin_site_stats(p_from timestamptz, p_to timestamptz)
returns table (day date, page_views bigint, visitors bigint, new_users bigint)
language sql stable security definer set search_path = public as $$
  with v as (
    select date_trunc('day', e.created_at)::date as d,
           count(*)::bigint as views,
           count(distinct e.session_id)::bigint as sessions
    from site_events e
    where e.created_at >= p_from and e.created_at < p_to
    group by 1
  ),
  u as (
    select date_trunc('day', pr.created_at)::date as d, count(*)::bigint as joined
    from profiles pr
    where pr.created_at >= p_from and pr.created_at < p_to and pr.role = 'customer'
    group by 1
  )
  select coalesce(v.d, u.d),
         coalesce(v.views, 0),
         coalesce(v.sessions, 0),
         coalesce(u.joined, 0)
  from v full outer join u on u.d = v.d
  where is_admin()
  order by 1
$$;

revoke all on function admin_site_stats(timestamptz, timestamptz) from public, anon;
grant execute on function admin_site_stats(timestamptz, timestamptz) to authenticated;

/**
 * The date tracking began — so the analytics cards can say "Tracking started
 * 1 Sep 2026" instead of implying a zero is a real measurement.
 */
create or replace function admin_tracking_since()
returns timestamptz
language sql stable security definer set search_path = public as $$
  select min(created_at) from site_events where is_admin()
$$;
revoke all on function admin_tracking_since() from public, anon;
grant execute on function admin_tracking_since() to authenticated;

/** Retention: 180 days. Call from a scheduled job when one exists. */
create or replace function delete_old_site_events()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from site_events where created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function delete_old_site_events() from public, anon;

-- ======================================================== dashboard_tasks ===
create table if not exists dashboard_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  due_date date,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists dashboard_tasks_open_idx on dashboard_tasks (done, due_date);

alter table dashboard_tasks enable row level security;

-- A shared list for CADO staff: any admin can see and tick anything.
drop policy if exists tasks_admin_read on dashboard_tasks;
create policy tasks_admin_read on dashboard_tasks for select using (is_admin());
drop policy if exists tasks_admin_insert on dashboard_tasks;
create policy tasks_admin_insert on dashboard_tasks for insert with check (is_admin() and created_by = auth.uid());
drop policy if exists tasks_admin_update on dashboard_tasks;
create policy tasks_admin_update on dashboard_tasks for update using (is_admin()) with check (is_admin());
-- Deleting is narrower than ticking: only whoever wrote it.
drop policy if exists tasks_delete_own on dashboard_tasks;
create policy tasks_delete_own on dashboard_tasks for delete using (is_admin() and created_by = auth.uid());

-- ============================================================== reviews ====
-- The reviews table already exists (0068) and is keyed on order_item_id, which
-- is finer than the spec's one-per-order: it lets a customer say the flowers
-- were lovely and the chocolate was late. That shape stays.
--
-- What was missing is a way for the STOREFRONT to submit one. A customer rates
-- a shop's part of an order, so this takes a sub_order and records the rating
-- against its first item — one rating per shop per order, which is what a
-- person means by "rate this order".
create or replace function submit_review(p_sub_order_id uuid, p_rating int, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item uuid;
  v_product uuid;
  v_partner uuid;
  v_status text;
  v_customer uuid;
  v_id uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  select so.status, so.partner_id, o.customer_id
    into v_status, v_partner, v_customer
    from sub_orders so join orders o on o.id = so.order_id
   where so.id = p_sub_order_id;

  if v_customer is null then
    raise exception 'no such order';
  end if;
  if v_customer <> auth.uid() then
    raise exception 'you can only rate your own order';
  end if;
  if v_status <> 'delivered' then
    raise exception 'you can rate an order once it has been delivered';
  end if;

  select oi.id, oi.product_id into v_item, v_product
    from order_items oi where oi.sub_order_id = p_sub_order_id
   order by oi.id limit 1;

  if v_item is null then
    raise exception 'that order has no items to rate';
  end if;

  -- One rating per shop per order. A second attempt is a mistake, not an edit.
  if exists (select 1 from reviews r where r.order_item_id = v_item) then
    raise exception 'you have already rated this order';
  end if;

  insert into reviews (order_item_id, product_id, partner_id, customer_id, rating, text, status)
  values (v_item, v_product, v_partner, auth.uid(), p_rating,
          nullif(btrim(coalesce(p_comment, '')), ''), 'visible')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function submit_review(uuid, int, text) from public, anon;
grant execute on function submit_review(uuid, int, text) to authenticated;

/** Satisfaction for Home: the ring, the average, and the star breakdown. */
create or replace function admin_review_summary()
returns table (
  total bigint, average numeric, satisfied_pct numeric,
  five bigint, four bigint, three bigint, two bigint, one bigint
)
language sql stable security definer set search_path = public as $$
  select
    count(*)::bigint,
    round(avg(r.rating)::numeric, 1),
    case when count(*) = 0 then null
         else round(100.0 * count(*) filter (where r.rating >= 4) / count(*), 0) end,
    count(*) filter (where r.rating = 5)::bigint,
    count(*) filter (where r.rating = 4)::bigint,
    count(*) filter (where r.rating = 3)::bigint,
    count(*) filter (where r.rating = 2)::bigint,
    count(*) filter (where r.rating = 1)::bigint
  from reviews r
  where r.status = 'visible' and is_admin()
$$;
revoke all on function admin_review_summary() from public, anon;
grant execute on function admin_review_summary() to authenticated;

/** The three most recent comments, for the card under the ring. */
create or replace function admin_recent_reviews(p_limit int default 3)
returns table (
  id uuid, rating int, comment text, created_at timestamptz,
  customer_first_name text, store_name text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.text, r.created_at,
         split_part(coalesce(pr.full_name, 'Customer'), ' ', 1),
         pa.name
  from reviews r
  left join profiles pr on pr.id = r.customer_id
  join partners pa on pa.id = r.partner_id
  where r.status = 'visible' and r.text is not null and is_admin()
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 3), 20))
$$;
revoke all on function admin_recent_reviews(int) from public, anon;
grant execute on function admin_recent_reviews(int) to authenticated;

-- ============================================================== team =======
/**
 * CADO's own people, with when they were last here. last_sign_in_at lives in
 * auth.users, which no browser role can read — hence SECURITY DEFINER, and
 * hence it returns only these six fields.
 */
create or replace function admin_team_members()
returns table (
  user_id uuid, full_name text, email text, role text,
  last_sign_in_at timestamptz, joined timestamptz
)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.full_name, u.email::text, pr.role, u.last_sign_in_at, pr.created_at
  from profiles pr
  join auth.users u on u.id = pr.id
  where pr.role = 'admin' and is_admin()
  order by pr.created_at
$$;
revoke all on function admin_team_members() from public, anon;
grant execute on function admin_team_members() to authenticated;

-- ============================================== monthly overview chart =====
/**
 * Twelve calendar months, every month present even when nothing happened — a
 * gap in a bar chart reads as missing data, a zero reads as a quiet month.
 * The average is over months that actually had an order, so one dead month
 * cannot halve the figure.
 */
create or replace function admin_monthly_overview()
returns table (month date, revenue numeric, orders bigint)
language sql stable security definer set search_path = public as $$
  with months as (
    select generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    )::date as m
  ),
  o as (
    select date_trunc('month', created_at)::date as m,
           sum(total) as revenue, count(*)::bigint as orders
    from orders
    where created_at >= date_trunc('month', now()) - interval '11 months'
    group by 1
  )
  select months.m, coalesce(o.revenue, 0), coalesce(o.orders, 0)
  from months left join o on o.m = months.m
  where is_admin()
  order by months.m
$$;
revoke all on function admin_monthly_overview() from public, anon;
grant execute on function admin_monthly_overview() to authenticated;

-- ======================================= orders in motion / upcoming =======
/** Everything on the road right now, for Home's live panel. */
create or replace function admin_orders_in_motion(p_limit int default 8)
returns table (
  sub_order_id uuid, order_id uuid, order_number text, status text,
  store_name text, area text, placed_at timestamptz, driver_name text
)
language sql stable security definer set search_path = public as $$
  select so.id, o.id, o.order_number, so.status, pa.name,
         coalesce(nullif(a.area, ''), a.city, '—'),
         o.created_at,
         d.name
  from sub_orders so
  join orders o on o.id = so.order_id
  join partners pa on pa.id = so.partner_id
  left join addresses a on a.id = o.delivery_address_id
  left join delivery_assignments da on da.sub_order_id = so.id
  left join drivers d on d.id = da.driver_id
  where so.status in ('accepted', 'preparing', 'ready', 'out_for_delivery')
    and is_admin()
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 50))
$$;
revoke all on function admin_orders_in_motion(int) from public, anon;
grant execute on function admin_orders_in_motion(int) to authenticated;

/** Scheduled deliveries in the next seven days. */
create or replace function admin_upcoming_deliveries()
returns table (
  sub_order_id uuid, order_id uuid, order_number text, store_name text,
  items bigint, deliver_on date, time_slot text, status text, driver_name text
)
language sql stable security definer set search_path = public as $$
  select so.id, o.id, o.order_number, pa.name,
         (select count(*) from order_items oi where oi.sub_order_id = so.id)::bigint,
         so.delivery_date, so.delivery_time_slot, so.status, d.name
  from sub_orders so
  join orders o on o.id = so.order_id
  join partners pa on pa.id = so.partner_id
  left join delivery_assignments da on da.sub_order_id = so.id
  left join drivers d on d.id = da.driver_id
  where so.delivery_date is not null
    and so.delivery_date >= current_date
    and so.delivery_date < current_date + 7
    and so.status not in ('delivered', 'cancelled')
    and is_admin()
  order by so.delivery_date, o.created_at
$$;
revoke all on function admin_upcoming_deliveries() from public, anon;
grant execute on function admin_upcoming_deliveries() to authenticated;

/** Orders per day for the Home calendar. */
create or replace function admin_orders_by_day(p_from date, p_to date)
returns table (day date, orders bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc('day', created_at)::date, count(*)::bigint
  from orders
  where created_at >= p_from and created_at < p_to + 1 and is_admin()
  group by 1
  order by 1
$$;
revoke all on function admin_orders_by_day(date, date) from public, anon;
grant execute on function admin_orders_by_day(date, date) to authenticated;
