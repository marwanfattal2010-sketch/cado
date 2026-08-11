-- 0036 — admin reporting and order management, without reopening 0020.
--
-- 0020 removed admin's direct SELECT on orders / sub_orders / order_items on
-- purpose (an admin browsing their own order page was seeing everyone's).
-- The dashboard still needs admin to SEE everything — but through named,
-- is_admin()-gated SECURITY DEFINER functions, not blanket table policies the
-- storefront would inherit. Every function here raises for non-admins.
--
-- Money rule: these functions only READ the snapshots written by place_order()
-- (line_total, commission_amount_snapshot, delivery_fee). Nothing recomputes a
-- price, and the one writer (admin_set_sub_order_status) touches status only.
--
-- Additive only: no table, column, policy or existing function is altered.


-- ----------------------------------------------------------------------------
-- admin_overview_stats() — the numbers on the admin landing page.
-- One row. Revenue is the sum of line_total over non-cancelled sub_orders;
-- commission is CADO's cut of the same lines; delivery fees come off orders,
-- counted once per order (they are per-order, not per-store).
-- ----------------------------------------------------------------------------
create or replace function admin_overview_stats()
returns table (
  orders_today       bigint,
  orders_this_month  bigint,
  orders_all_time    bigint,
  revenue_today      numeric,
  revenue_this_month numeric,
  revenue_all_time   numeric,
  commission_all_time numeric,
  commission_this_month numeric,
  delivery_fees_all_time numeric,
  sub_orders_by_status jsonb
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  return query
  with li as (
    select so.status, so.created_at, oi.line_total, oi.commission_amount_snapshot
    from order_items oi
    join sub_orders so on so.id = oi.sub_order_id
    where so.status <> 'cancelled'
  )
  select
    (select count(*) from orders where created_at::date = current_date),
    (select count(*) from orders where date_trunc('month', created_at) = date_trunc('month', now())),
    (select count(*) from orders),
    coalesce((select sum(line_total) from li where created_at::date = current_date), 0),
    coalesce((select sum(line_total) from li where date_trunc('month', created_at) = date_trunc('month', now())), 0),
    coalesce((select sum(line_total) from li), 0),
    coalesce((select sum(commission_amount_snapshot) from li), 0),
    coalesce((select sum(commission_amount_snapshot) from li where date_trunc('month', created_at) = date_trunc('month', now())), 0),
    coalesce((select sum(delivery_fee) from orders), 0),
    coalesce((select jsonb_object_agg(status, n) from (
      select so.status, count(*) as n from sub_orders so group by so.status
    ) s), '{}'::jsonb);
end;
$$;


-- ----------------------------------------------------------------------------
-- admin_orders() — every order, newest first, with its stores and lines
-- embedded as jsonb. Paged, because this table only grows.
-- ----------------------------------------------------------------------------
create or replace function admin_orders(p_limit integer default 50, p_offset integer default 0)
returns table (
  order_id       uuid,
  order_number   text,
  placed_at      timestamptz,
  customer_name  text,
  payment_method text,
  payment_status text,
  subtotal       numeric,
  delivery_fee   numeric,
  discount       numeric,
  total          numeric,
  sub_orders     jsonb
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if p_limit < 1 or p_limit > 200 then
    raise exception 'limit out of range';
  end if;

  return query
  select
    o.id, o.order_number, o.created_at,
    coalesce(pr.full_name, o.recipient_name, 'Customer'),
    o.payment_method, o.payment_status,
    o.subtotal, o.delivery_fee, o.discount_amount, o.total,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'sub_order_id', so.id,
        'partner_id', so.partner_id,
        'partner_name', pa.name,
        'status', so.status,
        'total', so.total,
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'title', oi.product_title_snapshot,
            'quantity', oi.quantity,
            'line_total', oi.line_total,
            'confirmation_status', oi.confirmation_status
          ) order by oi.id), '[]'::jsonb)
          from order_items oi where oi.sub_order_id = so.id
        )
      ) order by pa.name)
      from sub_orders so
      join partners pa on pa.id = so.partner_id
      where so.order_id = o.id
    ), '[]'::jsonb)
  from orders o
  left join profiles pr on pr.id = o.customer_id
  order by o.created_at desc
  limit p_limit offset p_offset;
end;
$$;


-- ----------------------------------------------------------------------------
-- admin_partner_totals() — the Partners page table: per store, lifetime
-- orders / revenue / CADO commission, what CADO owes the store
-- (store_payables not yet paid), and the owner login if one is attached.
-- Includes inactive stores: an admin page that hides suspended stores would
-- be lying to the one person who needs to see them.
-- ----------------------------------------------------------------------------
create or replace function admin_partner_totals()
returns table (
  partner_id      uuid,
  name            text,
  status          text,
  city            text,
  commission_rate numeric,
  owner_email     text,
  orders_count    bigint,
  gross_revenue   numeric,
  commission      numeric,
  payable_pending numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    pa.id, pa.name, pa.status, pa.city, pa.commission_rate,
    (select u.email::text from profiles pr join auth.users u on u.id = pr.id
     where pr.partner_id = pa.id and pr.role = 'partner'
     order by u.created_at limit 1),
    (select count(distinct so.id) from sub_orders so
     where so.partner_id = pa.id and so.status <> 'cancelled'),
    coalesce((select sum(oi.line_total) from order_items oi
      join sub_orders so on so.id = oi.sub_order_id
      where so.partner_id = pa.id and so.status <> 'cancelled'), 0),
    coalesce((select sum(oi.commission_amount_snapshot) from order_items oi
      join sub_orders so on so.id = oi.sub_order_id
      where so.partner_id = pa.id and so.status <> 'cancelled'), 0),
    coalesce((select sum(sp.net_owed) from store_payables sp
      where sp.store_id = pa.id and sp.status = 'pending'), 0)
  from partners pa
  order by pa.name;
end;
$$;


-- ----------------------------------------------------------------------------
-- admin_set_sub_order_status() — the one WRITE. Status changes and cancels,
-- nothing else: amounts, items and addresses stay exactly as place_order()
-- wrote them. The existing sub_orders AFTER UPDATE trigger records the event,
-- so this needs no logging of its own.
--
-- Terminal states are terminal: un-delivering or un-cancelling an order would
-- corrupt payables that were computed from it.
-- ----------------------------------------------------------------------------
create or replace function admin_set_sub_order_status(
  p_sub_order_id uuid,
  p_status text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if p_status not in ('pending','accepted','preparing','ready','out_for_delivery','delivered','cancelled') then
    raise exception 'unknown status %', p_status;
  end if;

  select status into v_current from sub_orders where id = p_sub_order_id for update;
  if v_current is null then
    raise exception 'no such sub_order';
  end if;
  if v_current in ('delivered','cancelled') then
    raise exception 'order is already %, which is final', v_current;
  end if;

  update sub_orders set status = p_status where id = p_sub_order_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- Grants. All four gate internally on is_admin(); anon never gets execute.
-- ----------------------------------------------------------------------------
revoke all on function admin_overview_stats() from public, anon;
grant execute on function admin_overview_stats() to authenticated;

revoke all on function admin_orders(integer, integer) from public, anon;
grant execute on function admin_orders(integer, integer) to authenticated;

revoke all on function admin_partner_totals() from public, anon;
grant execute on function admin_partner_totals() to authenticated;

revoke all on function admin_set_sub_order_status(uuid, text) from public, anon;
grant execute on function admin_set_sub_order_status(uuid, text) to authenticated;
