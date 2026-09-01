-- 0076: fix admin_home_summary — "column reference commission is ambiguous".
--
-- 0074 declared RETURNS TABLE (... commission numeric ...). Inside a plpgsql
-- function those output columns are also VARIABLES, so a CTE that produces a
-- column of the same name makes `select commission from comm` ambiguous and
-- Postgres raises 42702 at runtime.
--
-- It failed the worst possible way: PostgREST returned the error, the page
-- treated a null result as "no data", and Home rendered $0 revenue and $0 owed
-- to stores directly above a chart plotting real August sales. Caught by
-- calling the function as a real admin rather than trusting the page.
--
-- Fix: every CTE column gets a name that cannot collide with an output column,
-- and every reference is qualified. Same logic, same numbers, no renaming of
-- anything outside this function.

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
      o.id as order_id,
      o.total as order_total,
      o.delivery_fee as order_fee,
      o.customer_id as cust,
      case when o.created_at >= p_from and o.created_at < p_to then 'cur'
           when o.created_at >= v_prev_from and o.created_at < p_from then 'prev'
      end as bucket
    from orders o
    where o.created_at >= v_prev_from and o.created_at < p_to
  ),
  comm as (
    select w.bucket as b, sum(oi.commission_amount_snapshot) as amt
    from win w
    join sub_orders so on so.order_id = w.order_id and so.status <> 'cancelled'
    join order_items oi on oi.sub_order_id = so.id
    where w.bucket is not null
    group by w.bucket
  ),
  agg as (
    select
      w.bucket as b,
      coalesce(sum(w.order_total), 0) as gmv_sum,
      count(*) as order_count,
      coalesce(sum(w.order_fee), 0) as fee_sum,
      count(distinct w.cust) as cust_count
    from win w
    where w.bucket is not null
    group by w.bucket
  ),
  cur as (select * from agg where agg.b = 'cur'),
  prv as (select * from agg where agg.b = 'prev'),
  cur_c as (select coalesce((select c.amt from comm c where c.b = 'cur'), 0) as amt),
  prv_c as (select coalesce((select c.amt from comm c where c.b = 'prev'), 0) as amt),
  owed as (
    select coalesce(sum(sp.net_owed), 0) as amt
    from store_payables sp where sp.status = 'pending'
  )
  select
    coalesce(cur.gmv_sum, 0),
    coalesce(cur.order_count, 0),
    cur_c.amt,
    coalesce(cur.fee_sum, 0),
    cur_c.amt + coalesce(cur.fee_sum, 0),
    case when coalesce(cur.order_count, 0) > 0
         then coalesce(cur.gmv_sum, 0) / cur.order_count else 0 end,
    coalesce(cur.cust_count, 0),
    owed.amt,
    coalesce(prv.gmv_sum, 0),
    coalesce(prv.order_count, 0),
    prv_c.amt,
    coalesce(prv.fee_sum, 0),
    prv_c.amt + coalesce(prv.fee_sum, 0),
    case when coalesce(prv.order_count, 0) > 0
         then coalesce(prv.gmv_sum, 0) / prv.order_count else 0 end,
    coalesce(prv.cust_count, 0),
    coalesce(prv.order_count, 0) > 0
  from cur_c, prv_c, owed
  left join cur on true
  left join prv on true;
end;
$$;
