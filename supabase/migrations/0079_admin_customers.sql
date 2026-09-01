-- 0079: the Customers page.
--
-- Marwan asked to see a customer's name, phone and addresses. All three live in
-- tables an admin cannot read: `orders` (0020) and `addresses` (owner-only
-- RLS). Rather than widen those policies — which would expose every address to
-- anyone who ever becomes staff — two functions return exactly what the two
-- screens need, and nothing more.
--
-- admin_customers_list: one row per customer, with the counts. No addresses.
-- admin_customer_detail: one customer, WITH their saved addresses, because that
--   is the page whose whole purpose is "where does this person want things
--   delivered".
--
-- Both are is_admin()-gated and read-only.

create or replace function admin_customers_list(
  p_search text default null,
  p_city text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  customer_id uuid,
  full_name text,
  phone text,
  city text,
  orders bigint,
  total_spent numeric,
  last_order timestamptz,
  joined timestamptz,
  total_count bigint
)
language sql stable security definer set search_path = public as $$
  with base as (
    select
      pr.id,
      coalesce(pr.full_name, 'Customer') as full_name,
      pr.phone,
      pr.created_at as joined,
      (select a.city from addresses a
        where a.profile_id = pr.id
        order by a.is_default desc, a.created_at
        limit 1) as city
    from profiles pr
    where pr.role = 'customer' and is_admin()
  ),
  agg as (
    select o.customer_id,
           count(*)::bigint as orders,
           sum(o.total) as spent,
           max(o.created_at) as last_order
    from orders o
    group by o.customer_id
  ),
  joined_rows as (
    select b.*, coalesce(a.orders, 0) as orders, coalesce(a.spent, 0) as spent, a.last_order
    from base b left join agg a on a.customer_id = b.id
    where (p_search is null or p_search = ''
           or b.full_name ilike '%' || p_search || '%'
           or coalesce(b.phone,'') ilike '%' || p_search || '%')
      and (p_city is null or p_city = '' or b.city = p_city)
  ),
  counted as (select count(*) as n from joined_rows)
  select j.id, j.full_name, j.phone, j.city, j.orders, j.spent, j.last_order, j.joined, counted.n
  from joined_rows j, counted
  order by j.orders desc, j.joined desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function admin_customers_list(text, text, integer, integer) from public, anon;
grant execute on function admin_customers_list(text, text, integer, integer) to authenticated;

-- One customer, with their addresses. This is the only place address detail
-- crosses to an admin, and it is one person at a time by design.
create or replace function admin_customer_detail(p_customer_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', pr.id, 'full_name', pr.full_name, 'phone', pr.phone, 'joined', pr.created_at
      ) from profiles pr where pr.id = p_customer_id and pr.role = 'customer'
    ),
    'addresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'label', a.label, 'recipient_name', a.recipient_name, 'phone', a.phone,
        'city', a.city, 'area', a.area, 'street', a.street, 'building', a.building,
        'floor', a.floor, 'apartment', a.apartment, 'notes', a.notes, 'is_default', a.is_default
      ) order by a.is_default desc, a.created_at)
      from addresses a where a.profile_id = p_customer_id
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_id', o.id, 'order_number', o.order_number, 'placed_at', o.created_at,
        'total', o.total, 'payment_status', o.payment_status,
        'statuses', (select coalesce(jsonb_agg(distinct s.status), '[]'::jsonb)
                     from sub_orders s where s.order_id = o.id)
      ) order by o.created_at desc)
      from orders o where o.customer_id = p_customer_id
    ), '[]'::jsonb),
    'wallet', (select jsonb_build_object('balance', w.balance) from wallets w where w.profile_id = p_customer_id),
    'gift_cards_sent', (select count(*) from gift_cards g where g.buyer_id = p_customer_id)
  ) end
$$;

revoke all on function admin_customer_detail(uuid) from public, anon;
grant execute on function admin_customer_detail(uuid) to authenticated;

comment on function admin_customer_detail(uuid) is
  'One customer with saved addresses and order history, for the admin customer page. Address detail crosses to an admin here and nowhere else.';
