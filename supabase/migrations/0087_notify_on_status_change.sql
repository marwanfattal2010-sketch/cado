-- 0087: order status changes actually produce notifications and points.
--
-- 0086 built notify_user() and award_points_for_order() but nothing called
-- them, so the bell would have stayed empty forever and points would never
-- have been earned. This is the trigger that makes them real.
--
-- It fires on sub_orders, because that is where delivery status lives — one
-- row per shop. A two-shop order therefore tells the customer twice, once per
-- parcel, which is what actually happened. Points are awarded only when EVERY
-- part has arrived (award_points_for_order checks that itself).

create or replace function notify_customer_on_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_order text;
  v_store text;
  v_subject text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Only the three moments a customer actually wants to hear about. The
  -- others (pending -> accepted -> preparing) are internal churn, and a phone
  -- that buzzes for every one of them gets muted.
  if new.status not in ('ready', 'out_for_delivery', 'delivered') then
    return new;
  end if;

  select o.customer_id, o.order_number into v_customer, v_order
    from orders o where o.id = new.order_id;
  if v_customer is null then return new; end if;

  select p.name into v_store from partners p where p.id = new.partner_id;

  if new.status = 'ready' then
    v_subject := 'Your gift is packed';
    v_body := coalesce(v_store, 'The shop') || ' has your order ready for the driver.';
  elsif new.status = 'out_for_delivery' then
    v_subject := 'On its way';
    v_body := 'Your order from ' || coalesce(v_store, 'the shop') || ' is with the driver.';
  else
    v_subject := 'Delivered';
    v_body := 'Your order from ' || coalesce(v_store, 'the shop') || ' has arrived.';
  end if;

  perform notify_user(v_customer, v_subject, v_body, '/orders/' || new.order_id, 'order_status');

  -- Points, once the whole order is down. The function is idempotent, so
  -- calling it per sub-order is safe: only the last one can succeed.
  if new.status = 'delivered' then
    perform award_points_for_order(new.order_id);
  end if;

  return new;
end;
$$;

drop trigger if exists sub_orders_notify_customer on sub_orders;
create trigger sub_orders_notify_customer
  after update on sub_orders
  for each row execute procedure notify_customer_on_status();

comment on function notify_customer_on_status() is
  'Writes the in-app notification a customer sees in the bell, and awards points once every part of the order is delivered. The only caller of award_points_for_order in the product.';
