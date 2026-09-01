-- 0077: a searchable, filterable, paginated order list.
--
-- admin_orders() (0036) takes only a limit and an offset and caps at 200. That
-- is fine for "the last few orders" and useless for the Orders page, which has
-- to survive a table that grows forever. Filtering 200 rows in React and
-- calling it a search would break the moment CADO has real volume — and it
-- would silently show the wrong answer rather than fail, because a filter over
-- a truncated page looks exactly like a filter over everything.
--
-- So the filtering happens where the rows are. One function, every filter the
-- Orders page offers, plus the total count for that filter so the pager can
-- say "1–50 of 1,284" honestly.
--
-- Status lives on sub_orders (one per store), so an order MATCHES a status
-- filter when any of its parts has that status — that is what a human means by
-- "show me orders awaiting pickup".

create or replace function admin_orders_page(
  p_search text default null,
  p_status text default null,
  p_partner uuid default null,
  p_payment_method text default null,
  p_payment_status text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  order_id uuid,
  order_number text,
  placed_at timestamptz,
  customer_name text,
  customer_phone text,
  payment_method text,
  payment_status text,
  total numeric,
  item_count bigint,
  stores jsonb,
  total_count bigint
)
language sql stable security definer set search_path = public as $$
  with filtered as (
    select o.id, o.order_number, o.created_at, o.payment_method, o.payment_status, o.total,
           coalesce(pr.full_name, o.recipient_name, 'Customer') as cust_name,
           coalesce(o.recipient_phone, pr.phone) as cust_phone
    from orders o
    left join profiles pr on pr.id = o.customer_id
    where is_admin()
      and (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
      and (p_payment_method is null or o.payment_method = p_payment_method)
      and (p_payment_status is null or o.payment_status = p_payment_status)
      and (
        p_search is null or p_search = ''
        or o.order_number ilike '%' || p_search || '%'
        or coalesce(pr.full_name, '') ilike '%' || p_search || '%'
        or coalesce(o.recipient_name, '') ilike '%' || p_search || '%'
        or coalesce(o.recipient_phone, '') ilike '%' || p_search || '%'
        or coalesce(pr.phone, '') ilike '%' || p_search || '%'
      )
      and (
        p_status is null
        or exists (select 1 from sub_orders s where s.order_id = o.id and s.status = p_status)
      )
      and (
        p_partner is null
        or exists (select 1 from sub_orders s where s.order_id = o.id and s.partner_id = p_partner)
      )
  ),
  counted as (select count(*) as n from filtered)
  select
    f.id,
    f.order_number,
    f.created_at,
    f.cust_name,
    f.cust_phone,
    f.payment_method,
    f.payment_status,
    f.total,
    (select count(*) from order_items oi
      join sub_orders s2 on s2.id = oi.sub_order_id
     where s2.order_id = f.id)::bigint,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'sub_order_id', s.id,
        'partner_id', s.partner_id,
        'partner_name', pa.name,
        'status', s.status,
        'total', s.total
      ) order by pa.name)
      from sub_orders s join partners pa on pa.id = s.partner_id
      where s.order_id = f.id
    ), '[]'::jsonb),
    counted.n
  from filtered f, counted
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function admin_orders_page(text, text, uuid, text, text, timestamptz, timestamptz, integer, integer)
  from public, anon;
grant execute on function admin_orders_page(text, text, uuid, text, text, timestamptz, timestamptz, integer, integer)
  to authenticated;

comment on function admin_orders_page(text, text, uuid, text, text, timestamptz, timestamptz, integer, integer) is
  'Orders list for the admin table: search, filters, pagination and the matching total count, all resolved in Postgres.';

-- Counts for the saved-view tabs, so each tab can show a live number without
-- nine separate round trips.
create or replace function admin_order_status_counts()
returns table (status text, orders bigint)
language sql stable security definer set search_path = public as $$
  select s.status, count(distinct s.order_id)::bigint
  from sub_orders s
  where is_admin()
  group by s.status
$$;

revoke all on function admin_order_status_counts() from public, anon;
grant execute on function admin_order_status_counts() to authenticated;
