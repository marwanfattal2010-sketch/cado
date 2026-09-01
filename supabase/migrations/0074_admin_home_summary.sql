-- 0074: the Home screen's numbers, computed in Postgres.
--
-- V3's Home shows six KPIs, each with a real comparison against the previous
-- equal period, plus a seven-point sparkline and a top-products ranking. None
-- of that may be added up in the browser:
--
--   * admins cannot read orders / sub_orders / order_items at all (0020), so a
--     browser query returns an empty array and the page would quietly show $0 —
--     which is exactly how Home and Finance were both broken before.
--   * a money figure should come from one place that can be checked.
--
-- Every function here is SECURITY DEFINER, guarded on is_admin(), reads the
-- SNAPSHOT columns written when the order was placed (line_total,
-- commission_amount_snapshot) so changing a rate today never rewrites history,
-- and excludes cancelled sub-orders from earnings.
--
-- Additive only: nothing existing is altered or dropped.

-- ---------------------------------------------------------------- KPIs -----
-- One row, so Home makes ONE round trip for its headline instead of six.
-- Returns the range and the previous equal period side by side, because a
-- delta computed against a different window is a lie with a percent sign.
create or replace function admin_home_summary(p_from timestamptz, p_to timestamptz)
returns table (
  gmv numeric,
  orders bigint,
  commission numeric,
  delivery_fees numeric,
  cado_earned numeric,
  avg_order_value numeric,
  active_customers bigint,
  owed_to_stores numeric,
  prev_gmv numeric,
  prev_orders bigint,
  prev_commission numeric,
  prev_delivery_fees numeric,
  prev_cado_earned numeric,
  prev_avg_order_value numeric,
  prev_active_customers bigint,
  had_previous boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_span interval := p_to - p_from;
  v_prev_from timestamptz := p_from - v_span;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  return query
  with win as (
    select
      o.id, o.total, o.delivery_fee, o.customer_id, o.created_at,
      case when o.created_at >= p_from and o.created_at < p_to then 'cur'
           when o.created_at >= v_prev_from and o.created_at < p_from then 'prev'
      end as bucket
    from orders o
    where o.created_at >= v_prev_from and o.created_at < p_to
  ),
  -- Commission follows the LINE, not the order, and cancelled stores' lines
  -- are not earnings.
  comm as (
    select w.bucket, sum(oi.commission_amount_snapshot) as commission
    from win w
    join sub_orders so on so.order_id = w.id and so.status <> 'cancelled'
    join order_items oi on oi.sub_order_id = so.id
    where w.bucket is not null
    group by w.bucket
  ),
  agg as (
    select
      w.bucket,
      coalesce(sum(w.total), 0) as gmv,
      count(*) as orders,
      coalesce(sum(w.delivery_fee), 0) as delivery_fees,
      count(distinct w.customer_id) as active_customers
    from win w
    where w.bucket is not null
    group by w.bucket
  ),
  cur as (select * from agg where bucket = 'cur'),
  prv as (select * from agg where bucket = 'prev'),
  cur_c as (select coalesce((select commission from comm where bucket = 'cur'), 0) as c),
  prv_c as (select coalesce((select commission from comm where bucket = 'prev'), 0) as c),
  owed as (
    select coalesce(sum(net_owed), 0) as amt from store_payables where status = 'pending'
  )
  select
    coalesce(cur.gmv, 0),
    coalesce(cur.orders, 0),
    cur_c.c,
    coalesce(cur.delivery_fees, 0),
    -- What CADO actually keeps: its commission plus the delivery fee it charged.
    cur_c.c + coalesce(cur.delivery_fees, 0),
    case when coalesce(cur.orders, 0) > 0 then coalesce(cur.gmv, 0) / cur.orders else 0 end,
    coalesce(cur.active_customers, 0),
    owed.amt,
    coalesce(prv.gmv, 0),
    coalesce(prv.orders, 0),
    prv_c.c,
    coalesce(prv.delivery_fees, 0),
    prv_c.c + coalesce(prv.delivery_fees, 0),
    case when coalesce(prv.orders, 0) > 0 then coalesce(prv.gmv, 0) / prv.orders else 0 end,
    coalesce(prv.active_customers, 0),
    -- Whether a previous period exists AT ALL. Home uses this to print
    -- "No previous data" instead of a fabricated +0%.
    coalesce(prv.orders, 0) > 0
  from cur_c, prv_c, owed
  left join cur on true
  left join prv on true;
end;
$$;

revoke all on function admin_home_summary(timestamptz, timestamptz) from public, anon;
grant execute on function admin_home_summary(timestamptz, timestamptz) to authenticated;

comment on function admin_home_summary(timestamptz, timestamptz) is
  'Home KPIs for a range plus the previous equal period. had_previous is false when there is no prior data, so the UI can say so instead of inventing a delta.';

-- ------------------------------------------------------- top products -----
create or replace function admin_top_products(p_from timestamptz, p_to timestamptz, p_limit integer default 5)
returns table (
  product_id uuid,
  title text,
  partner_name text,
  units bigint,
  revenue numeric
)
language sql stable security definer set search_path = public as $$
  select
    oi.product_id,
    -- The snapshot, not products.title: what it was called when it sold.
    max(oi.product_title_snapshot) as title,
    max(pa.name) as partner_name,
    sum(oi.quantity)::bigint as units,
    sum(oi.line_total) as revenue
  from order_items oi
  join sub_orders so on so.id = oi.sub_order_id and so.status <> 'cancelled'
  join orders o on o.id = so.order_id
  join partners pa on pa.id = so.partner_id
  where o.created_at >= p_from and o.created_at < p_to
    and is_admin()
  group by oi.product_id
  order by units desc, revenue desc
  limit greatest(1, least(coalesce(p_limit, 5), 50))
$$;

revoke all on function admin_top_products(timestamptz, timestamptz, integer) from public, anon;
grant execute on function admin_top_products(timestamptz, timestamptz, integer) to authenticated;

comment on function admin_top_products(timestamptz, timestamptz, integer) is
  'Best-selling products in a range by units, from order_items snapshots.';
