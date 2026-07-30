-- place_order: atomically turns the caller's cart into an order split into
-- one sub_order per partner, snapshotting product price/title, decrementing
-- stock, and clearing the cart. Runs as SECURITY DEFINER so it can bypass the
-- restrictive per-row insert policies on order_items/sub_orders while still
-- being scoped entirely to auth.uid()'s own cart.

create sequence if not exists order_number_seq start 1000;

create or replace function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  rec record;
begin
  -- Address must belong to the caller.
  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
    raise exception 'cart is empty';
  end if;

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (order_number, customer_id, delivery_address_id, subtotal, delivery_fee, total, notes)
  values (v_order_number, auth.uid(), p_delivery_address_id, 0, 0, 0, p_notes)
  returning id into v_order_id;

  -- One sub_order per distinct partner represented in the cart.
  for v_partner_id in
    select distinct p.partner_id
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
  loop
    select coalesce(sum(
      (p.price + case when (ci.customization->>'gift_wrap')::boolean is true then p.gift_wrap_price else 0 end)
      * ci.quantity
    ), 0)
    into v_partner_subtotal
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid() and p.partner_id = v_partner_id;

    insert into sub_orders (order_id, partner_id, delivery_date, delivery_time_slot, subtotal, delivery_fee, total)
    values (v_order_id, v_partner_id, p_delivery_date, p_delivery_time_slot, v_partner_subtotal, 0, v_partner_subtotal)
    returning id into v_sub_order_id;

    for rec in
      select ci.id as cart_item_id, ci.product_id, ci.quantity, ci.customization,
             p.title, p.price, p.gift_wrap_price, p.stock_quantity
      from cart_items ci join products p on p.id = ci.product_id
      where ci.profile_id = auth.uid() and p.partner_id = v_partner_id
    loop
      if rec.stock_quantity < rec.quantity then
        raise exception 'insufficient stock for product %', rec.product_id;
      end if;

      insert into order_items (
        sub_order_id, product_id, product_title_snapshot, unit_price_snapshot,
        quantity, customization, line_total
      ) values (
        v_sub_order_id, rec.product_id, rec.title,
        rec.price + case when (rec.customization->>'gift_wrap')::boolean is true then rec.gift_wrap_price else 0 end,
        rec.quantity, rec.customization,
        (rec.price + case when (rec.customization->>'gift_wrap')::boolean is true then rec.gift_wrap_price else 0 end) * rec.quantity
      );

      update products set stock_quantity = stock_quantity - rec.quantity where id = rec.product_id;
    end loop;

    v_order_subtotal := v_order_subtotal + v_partner_subtotal;
  end loop;

  update orders
  set subtotal = v_order_subtotal, delivery_fee = v_delivery_fee, total = v_order_subtotal + v_delivery_fee
  where id = v_order_id;

  delete from cart_items where profile_id = auth.uid();

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, date, text, text) from public;
grant execute on function place_order(uuid, date, text, text) to authenticated;
