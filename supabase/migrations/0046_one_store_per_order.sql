-- ============================================================
-- 0046 — One store per order, and no "Now" while CADO is closed
--
-- Additive. Two triggers and nothing else: no table is altered, no column
-- dropped, no row rewritten, and place_order is deliberately NOT replaced.
--
-- NOT APPLIED. Written for review first.
--
-- WHY A TRIGGER AND NOT A REWRITE OF place_order
--
-- place_order today loops `select distinct p.partner_id` over the cart and
-- writes one sub_order per partner — so a single order really can span two
-- shops. Rewriting that ~150-line money function to close the hole means
-- reproducing every line of it correctly, and a mistake there charges people
-- the wrong amount. A constraint at the table it writes into catches the same
-- thing with none of that risk, and it also catches any OTHER path that ever
-- inserts a sub_order — a script, the dashboard, a future function.
--
-- The frontend still has to keep carts separate so nobody meets this error;
-- the trigger is the floor under that, not a replacement for it.
-- ============================================================

/**
 * A driver goes to one shop and comes back. An order that spans two shops
 * cannot be delivered as one order, so it is rejected outright rather than
 * quietly split into something the operation cannot honour.
 */
create or replace function enforce_one_store_per_order()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
begin
  select so.partner_id into v_other
    from sub_orders so
   where so.order_id = new.order_id
     and so.partner_id is distinct from new.partner_id
   limit 1;

  if v_other is not null then
    raise exception
      'An order can only contain items from one store. Check out each store separately.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists sub_orders_one_store on sub_orders;
create trigger sub_orders_one_store
  before insert on sub_orders
  for each row execute function enforce_one_store_per_order();

/**
 * "Now" is only a real option while CADO is open, and open is decided in
 * Beirut by app_settings (see 0045) — never by the device clock. A phone with
 * its timezone set wrong must not be able to book a 3am delivery.
 *
 * Anything that is not a "now" slot is a preorder and passes through: the
 * picker already offers only slots at or after the next opening time.
 */
create or replace function enforce_delivery_window()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.delivery_time_slot, '')) in ('now', 'asap')
     and not cado_is_open() then
    raise exception
      'CADO is closed right now. Please choose a preorder time.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists sub_orders_delivery_window on sub_orders;
create trigger sub_orders_delivery_window
  before insert on sub_orders
  for each row execute function enforce_delivery_window();
