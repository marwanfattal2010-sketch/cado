-- 0078: two more Home panels, answered in Postgres.
--
-- "Orders by area" needs to group delivery addresses by city. `addresses` is
-- the customer's own private data — its RLS is owner-only, and an admin
-- selecting from it gets nothing back (silently, as always). So the grouping
-- happens inside a SECURITY DEFINER function that returns COUNTS ONLY: how many
-- orders went to Beirut, to Tripoli. No street, no name, no phone leaves this
-- function. An admin dashboard needs the shape of demand, not everyone's door.
--
-- "n new this period" on the Customers card needs first-order dates, which
-- means reading orders — also blocked for admins (0020).

create or replace function admin_orders_by_area(p_from timestamptz, p_to timestamptz)
returns table (area text, orders bigint)
language sql stable security definer set search_path = public as $$
  select
    coalesce(nullif(trim(a.city), ''), 'Unspecified') as area,
    count(*)::bigint
  from orders o
  left join addresses a on a.id = o.delivery_address_id
  where o.created_at >= p_from and o.created_at < p_to
    and is_admin()
  group by 1
  order by 2 desc
$$;

revoke all on function admin_orders_by_area(timestamptz, timestamptz) from public, anon;
grant execute on function admin_orders_by_area(timestamptz, timestamptz) to authenticated;

comment on function admin_orders_by_area(timestamptz, timestamptz) is
  'Order counts per delivery city. Counts only — no address detail crosses this boundary.';

-- How many people ordered for the FIRST time inside the range, and the daily
-- series behind it. A "new customer" is one whose earliest order falls in the
-- window; counting distinct customers in the window would call every returning
-- shopper new.
create or replace function admin_new_customers(p_from timestamptz, p_to timestamptz)
returns table (day date, new_customers bigint)
language sql stable security definer set search_path = public as $$
  with firsts as (
    select o.customer_id, min(o.created_at) as first_order
    from orders o
    group by o.customer_id
  )
  select date_trunc('day', f.first_order)::date, count(*)::bigint
  from firsts f
  where f.first_order >= p_from and f.first_order < p_to
    and is_admin()
  group by 1
  order by 1
$$;

revoke all on function admin_new_customers(timestamptz, timestamptz) from public, anon;
grant execute on function admin_new_customers(timestamptz, timestamptz) to authenticated;

comment on function admin_new_customers(timestamptz, timestamptz) is
  'Customers whose FIRST order falls in the range, by day.';
