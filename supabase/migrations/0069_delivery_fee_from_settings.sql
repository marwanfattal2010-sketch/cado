-- 0069: place_order reads the delivery fee from settings.
--
-- 0068 created the settings table and delivery_fee_usd(), but place_order
-- still carried the constant 5.00 in its declarations, so the admin knob was
-- decorative: changing it moved the number on the Settings page and nothing
-- else. This migration closes that gap.
--
-- The body below is 0050 byte-for-byte with ONE line changed (the v_delivery_fee
-- default). It is reproduced in full because Postgres has no way to patch part
-- of a function body. Diff it against 0050 lines 34-234 to verify.
--
-- Behaviour is identical today: settings.delivery_fee_usd is 5, and
-- delivery_fee_usd() falls back to 5 if the row ever disappears. No safety
-- window needed — this makes nothing stricter.

create or replace function place_order(
  p_delivery_address_id uuid default null,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod',
  p_is_gift boolean default true,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_address_source text default 'buyer',
  p_hide_price boolean default false,
  p_gift_message text default null,
  p_partner_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := delivery_fee_usd();
  v_discount numeric(10,2) := 0;
  v_card gift_cards;
  v_gc_err constant text := 'That gift card code is not valid.';
  v_card_share numeric(10,2);
  v_commission_rate numeric(4,3);
  v_commission_amount numeric(10,2);
  rec record;
begin
  if auth.uid() is null then
    raise exception 'must be logged in to place an order';
  end if;

  -- Lock this shopper's cart before a single row of it is read.
  -- Two simultaneous checkouts - a double tap, or a phone retrying
  -- on a bad connection - must not both see the same items and both
  -- turn them into an order. The second call blocks here, wakes to
  -- an empty cart, and stops on the check below.
  perform 1 from cart_items where profile_id = auth.uid() for update;
  if p_payment_method not in ('cod', 'whish', 'omt', 'card') then
    raise exception 'unknown payment method';
  end if;
  if p_address_source not in ('buyer', 'recipient_whatsapp') then
    raise exception 'unknown address source';
  end if;
  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Order notes are too long (1000 characters max)';
  end if;
  if p_gift_message is not null and length(p_gift_message) > 500 then
    raise exception 'Gift message is too long (500 characters max)';
  end if;

  -- Deliverability, enforced here as well as by the CHECK so the error the
  -- customer sees is a sentence rather than a constraint name.
  if p_address_source = 'buyer' then
    if p_delivery_address_id is null then
      raise exception 'Choose a delivery address';
    end if;
    if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
      raise exception 'delivery address does not belong to the current user';
    end if;
  else
    if p_recipient_phone is null or length(trim(p_recipient_phone)) < 6 then
      raise exception 'Add their phone number so we can ask where to deliver';
    end if;
  end if;

  -- "Empty" now means empty *for the store being checked out*.
  if not exists (
    select 1 from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
      and (p_partner_id is null or p.partner_id = p_partner_id)
  ) then
    raise exception 'cart is empty';
  end if;

  if p_gift_card_code is not null then
    perform check_rate_limit('gift_card_redeem', 5);
    select * into v_card from gift_cards where code = p_gift_card_code for update;
    if not found or v_card.status != 'active'
       or (v_card.locked_until is not null and v_card.locked_until > now())
    then
      raise exception '%', v_gc_err;
    end if;
    if v_card.expires_at is not null and v_card.expires_at < now() then
      update gift_cards set status = 'expired' where id = v_card.id;
      raise exception '%', v_gc_err;
    end if;
  end if;

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (
    order_number, customer_id, delivery_address_id, subtotal, delivery_fee,
    discount_amount, total, notes, gift_card_code, payment_method, payment_status,
    is_gift, recipient_name, recipient_phone, address_source, hide_price, gift_message, delivery_slot
  )
  values (
    v_order_number, auth.uid(),
    case when p_address_source = 'buyer' then p_delivery_address_id else null end,
    0, 0, 0, 0, p_notes, p_gift_card_code, p_payment_method, 'unpaid',
    p_is_gift, nullif(trim(coalesce(p_recipient_name, '')), ''), nullif(trim(coalesce(p_recipient_phone, '')), ''),
    p_address_source, p_hide_price, nullif(trim(coalesce(p_gift_message, '')), ''), p_delivery_time_slot
  )
  returning id into v_order_id;

  for v_partner_id in
    select distinct p.partner_id
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
      and (p_partner_id is null or p.partner_id = p_partner_id)
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
      select ci.product_id, ci.quantity, ci.customization,
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

  if v_card.id is not null then
    v_discount := least(v_card.current_balance, v_order_subtotal + v_delivery_fee);
    update gift_cards
      set current_balance = current_balance - v_discount,
          status = case when current_balance - v_discount <= 0 then 'depleted' else status end
      where id = v_card.id
      returning current_balance into v_card.current_balance;

    insert into audit_log (actor, action, table_name, record_id, new_value)
    values (auth.uid()::text, 'gift_card_redeemed', 'gift_cards', v_card.id::text,
      jsonb_build_object('order_id', v_order_id, 'amount_used', v_discount));
  end if;

  update orders
  set subtotal = v_order_subtotal, delivery_fee = v_delivery_fee, discount_amount = v_discount,
      total = greatest(v_order_subtotal + v_delivery_fee - v_discount, 0)
  where id = v_order_id;

  for v_partner_id, v_partner_subtotal in
    select so.partner_id, so.subtotal from sub_orders so where so.order_id = v_order_id
  loop
    v_commission_rate := (select commission_rate from partners where id = v_partner_id);
    v_commission_amount := round(v_partner_subtotal * v_commission_rate, 2);

    insert into store_payables (store_id, order_id, gross_amount, commission_rate, commission_amount, net_owed)
    values (v_partner_id, v_order_id, v_partner_subtotal, v_commission_rate, v_commission_amount,
            v_partner_subtotal - v_commission_amount);

    if v_card.id is not null and v_discount > 0 and v_order_subtotal > 0 then
      v_card_share := round(v_discount * (v_partner_subtotal / v_order_subtotal), 2);
      if v_card_share > 0 then
        insert into gift_card_transactions (gift_card_id, order_id, amount_used, balance_after, store_id)
        values (v_card.id, v_order_id, v_card_share, v_card.current_balance, v_partner_id);
      end if;
    end if;
  end loop;

  -- Only the store that was just ordered is emptied. The shopper's other
  -- carts are still sitting there when they come back.
  delete from cart_items ci
   using products p
   where ci.product_id = p.id
     and ci.profile_id = auth.uid()
     and (p_partner_id is null or p.partner_id = p_partner_id);

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid)
  from public, anon;
grant execute on function place_order(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid)
  to authenticated;
