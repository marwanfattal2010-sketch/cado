-- ============================================================================
-- 0033 — Dashboard functions and event wiring
--
-- Everything here is either a new SECURITY DEFINER function that gates on
-- is_admin() / my_partner_id() itself, or a new trigger that writes to the new
-- order_events table. No existing function is modified.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- is_store_owner() — the dashboard's second role, in the vocabulary the
-- database already uses. The spec calls this 'store_owner'; profiles.role is
-- constrained to customer|partner|admin, so 'partner' + a partner_id IS the
-- store owner. No new role value is invented — that would mean altering the
-- live profiles_role_check constraint.
-- ----------------------------------------------------------------------------
create or replace function is_store_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'partner' and partner_id is not null
  )
$$;


-- ----------------------------------------------------------------------------
-- record_order_event() — internal writer. Not callable usefully from the
-- client (order_events has no INSERT policy and this is only invoked by the
-- triggers below), but centralised so every event row is shaped the same.
-- ----------------------------------------------------------------------------
create or replace function record_order_event(
  p_order_id      uuid,
  p_sub_order_id  uuid,
  p_order_item_id uuid,
  p_partner_id    uuid,
  p_event_type    text,
  p_from_status   text default null,
  p_to_status     text default null,
  p_message       text default null,
  p_payload       jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text := 'system';
begin
  if auth.uid() is not null then
    select coalesce(role, 'system') into v_role from profiles where id = auth.uid();
    if v_role not in ('customer','partner','admin') then
      v_role := 'system';
    end if;
  end if;

  insert into order_events (
    order_id, sub_order_id, order_item_id, partner_id,
    event_type, actor_id, actor_role, from_status, to_status, message, payload
  ) values (
    p_order_id, p_sub_order_id, p_order_item_id, p_partner_id,
    p_event_type, auth.uid(), v_role, p_from_status, p_to_status,
    left(p_message, 500), coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- sub_orders status changes also land in the timeline.
--
-- order_status_history already records these and is left exactly as it is —
-- the storefront reads it. order_events is the wider timeline (it also carries
-- item confirmations and notification sends), so both are written. Duplicating
-- one row per status change is cheaper than migrating a table the storefront
-- depends on.
-- ----------------------------------------------------------------------------
create or replace function order_event_on_sub_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform record_order_event(
      new.order_id, new.id, null, new.partner_id,
      'sub_order_status_changed', old.status, new.status, new.partner_notes
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sub_orders_order_event on sub_orders;
create trigger sub_orders_order_event
  after update on sub_orders
  for each row execute procedure order_event_on_sub_order_status();


-- ----------------------------------------------------------------------------
-- Item confirmations land in the timeline too.
-- ----------------------------------------------------------------------------
create or replace function order_event_on_item_confirmation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
  v_order   uuid;
begin
  if new.confirmation_status is distinct from old.confirmation_status then
    select so.partner_id, so.order_id into v_partner, v_order
    from sub_orders so where so.id = new.sub_order_id;

    perform record_order_event(
      v_order, new.sub_order_id, new.id, v_partner,
      'order_item_' || new.confirmation_status,
      old.confirmation_status, new.confirmation_status,
      new.rejection_reason,
      jsonb_build_object('product_title', new.product_title_snapshot, 'quantity', new.quantity)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_order_event on order_items;
create trigger order_items_order_event
  after update on order_items
  for each row execute procedure order_event_on_item_confirmation();


-- ----------------------------------------------------------------------------
-- partner_order_context() — the delivery details a store needs, and nothing
-- more.
--
-- A store owner can read sub_orders and order_items for its own orders, but
-- has no policy on `orders` at all, so it cannot see who to deliver to. The
-- fix is NOT an RLS policy on orders: the order row carries the whole basket's
-- total, the gift card code, the customer id, and other stores' money. This
-- function returns the delivery fields only, gated on the caller actually
-- owning that sub_order.
-- ----------------------------------------------------------------------------
create or replace function partner_order_context(p_sub_order_id uuid)
returns table (
  order_number     text,
  placed_at        timestamptz,
  payment_method   text,
  payment_status   text,
  is_gift          boolean,
  hide_price       boolean,
  gift_message     text,
  delivery_slot    text,
  recipient_name   text,
  recipient_phone  text,
  address_city     text,
  address_area     text,
  address_street   text,
  address_building text,
  address_floor    text,
  address_apartment text,
  address_notes    text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_admin() or exists (
    select 1 from sub_orders so
    where so.id = p_sub_order_id and so.partner_id = my_partner_id()
  )) then
    raise exception 'not your order';
  end if;

  return query
  select o.order_number, o.created_at, o.payment_method, o.payment_status,
         o.is_gift, o.hide_price, o.gift_message, coalesce(so.delivery_time_slot, o.delivery_slot),
         coalesce(o.recipient_name, a.recipient_name),
         coalesce(o.recipient_phone, a.phone),
         a.city, a.area, a.street, a.building, a.floor, a.apartment, a.notes
  from sub_orders so
  join orders o on o.id = so.order_id
  left join addresses a on a.id = o.delivery_address_id
  where so.id = p_sub_order_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- rebuild_store_metrics() — recompute the daily rollup for one store.
--
-- Callable by CADO for any store, or by a store owner for its own store. Idem-
-- potent: it deletes and rewrites the days in range, so running it twice is
-- the same as running it once.
--
-- Money comes from order_items (line_total and the commission snapshot added
-- in 0031), not from store_payables, because payables are per ORDER and this
-- rollup needs to survive an order that spans two days of fulfilment.
-- ----------------------------------------------------------------------------
create or replace function rebuild_store_metrics(
  p_partner_id uuid,
  p_from date default (current_date - 90),
  p_to   date default current_date
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  if not (is_admin() or p_partner_id = my_partner_id()) then
    raise exception 'not your store';
  end if;
  if p_to < p_from then
    raise exception 'invalid date range';
  end if;
  if p_to - p_from > 400 then
    raise exception 'range too wide';
  end if;

  delete from store_metrics
  where partner_id = p_partner_id and day between p_from and p_to;

  insert into store_metrics (
    partner_id, day, orders_count, items_count, units_count,
    gross_revenue, commission_amount, net_revenue,
    cancelled_count, delivered_count, avg_confirm_seconds, updated_at
  )
  select
    so.partner_id,
    so.created_at::date,
    count(distinct so.id),
    count(oi.id),
    coalesce(sum(oi.quantity), 0),
    coalesce(sum(oi.line_total), 0),
    coalesce(sum(oi.commission_amount_snapshot), 0),
    coalesce(sum(oi.line_total), 0) - coalesce(sum(oi.commission_amount_snapshot), 0),
    count(distinct so.id) filter (where so.status = 'cancelled'),
    count(distinct so.id) filter (where so.status = 'delivered'),
    avg(extract(epoch from (oi.confirmed_at - so.created_at)))
      filter (where oi.confirmed_at is not null)::integer,
    now()
  from sub_orders so
  left join order_items oi on oi.sub_order_id = so.id
  where so.partner_id = p_partner_id
    and so.created_at::date between p_from and p_to
  group by so.partner_id, so.created_at::date;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;


-- ----------------------------------------------------------------------------
-- Grants. PostgREST exposes functions to `authenticated`; these all gate
-- internally, but be explicit and keep anon out.
-- ----------------------------------------------------------------------------
revoke all on function partner_order_context(uuid) from public, anon;
grant execute on function partner_order_context(uuid) to authenticated;

revoke all on function rebuild_store_metrics(uuid, date, date) from public, anon;
grant execute on function rebuild_store_metrics(uuid, date, date) to authenticated;

revoke all on function record_order_event(uuid, uuid, uuid, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

revoke all on function is_store_owner() from anon;
grant execute on function is_store_owner() to authenticated;
