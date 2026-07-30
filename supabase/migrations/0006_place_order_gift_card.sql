-- Extend orders with gift-card redemption tracking, and extend place_order to
-- atomically apply a gift card's balance as a discount when placing an order.
alter table orders add column discount_amount numeric(10,2) not null default 0;
alter table orders add column gift_card_code text references gift_cards(code);

-- Postgres treats a changed parameter list as a distinct overload rather than
-- a replacement, so the old 4-arg signature must be dropped explicitly.
drop function if exists place_order(uuid, date, text, text);

create function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null
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
  v_discount numeric(10,2) := 0;
  v_gift_card gift_cards;
  rec record;
begin
  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
    raise exception 'cart is empty';
  end if;

  if p_gift_card_code is not null then
    select * into v_gift_card from gift_cards
      where code = p_gift_card_code and status = 'active' and remaining_balance > 0
      for update;
    if not found then
      raise exception 'gift card code is invalid or has no remaining balance';
    end if;
  end if;

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (order_number, customer_id, delivery_address_id, subtotal, delivery_fee, discount_amount, total, notes, gift_card_code)
  values (v_order_number, auth.uid(), p_delivery_address_id, 0, 0, 0, 0, p_notes, p_gift_card_code)
  returning id into v_order_id;

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

  if v_gift_card.id is not null then
    v_discount := least(v_gift_card.remaining_balance, v_order_subtotal + v_delivery_fee);
    update gift_cards
      set remaining_balance = remaining_balance - v_discount,
          status = case when remaining_balance - v_discount <= 0 then 'depleted' else status end
      where id = v_gift_card.id;
  end if;

  update orders
  set subtotal = v_order_subtotal, delivery_fee = v_delivery_fee, discount_amount = v_discount,
      total = greatest(v_order_subtotal + v_delivery_fee - v_discount, 0)
  where id = v_order_id;

  delete from cart_items where profile_id = auth.uid();

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, date, text, text, text) from public;
grant execute on function place_order(uuid, date, text, text, text) to authenticated;
