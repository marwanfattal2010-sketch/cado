-- Drop the separate PIN. The code itself becomes the sole secret — this
-- matches how real consumer gift cards actually work (Amazon, iTunes: the
-- code alone redeems). To keep that safe as a single factor, the code stays
-- high-entropy (12 random chars from a 32-symbol alphabet = 32^12, far
-- beyond brute-force range even before the existing per-IP rate limit), just
-- formatted in short readable blocks instead of a long base64 string.
-- Per-record PIN lockout no longer applies (there's no second secret to
-- guess against a known card) — the per-IP rate limit is still the defense
-- against enumerating codes.

alter table gift_cards alter column pin_hash drop not null;
alter table gift_cards alter column recipient_name drop not null;

create or replace function generate_gift_card_code() returns text
language plpgsql as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTVWXYZ'; -- no 0/O/1/I/L — easy to type, hard to misread
  v_code text;
  v_raw bytea;
  v_i int;
begin
  loop
    v_raw := gen_random_bytes(12);
    v_code := '';
    for v_i in 0..11 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_raw, v_i) % length(v_alphabet)) + 1, 1);
      if v_i in (3, 7) then
        v_code := v_code || '-';
      end if;
    end loop;
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;
  return v_code;
end;
$$;

drop function if exists purchase_gift_card(numeric, text, text, text, text, text, text);

create or replace function purchase_gift_card(
  p_amount numeric,
  p_recipient_name text default null,
  p_recipient_email text default null,
  p_message text default null,
  p_delivery_method text default 'digital',
  p_buyer_name text default null,
  p_buyer_email text default null
) returns table (code text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be logged in to buy a gift card';
  end if;
  if p_amount < 10 or p_amount > 500 then
    raise exception 'Gift card amount must be between $10 and $500';
  end if;
  if p_delivery_method not in ('digital', 'physical') then
    raise exception 'Unknown delivery method: %', p_delivery_method;
  end if;
  if p_recipient_name is not null and length(p_recipient_name) > 200 then
    raise exception 'Recipient name is too long (200 characters max)';
  end if;
  if p_buyer_name is not null and length(p_buyer_name) > 200 then
    raise exception 'Sender name is too long (200 characters max)';
  end if;
  if p_message is not null and length(p_message) > 500 then
    raise exception 'Message is too long (500 characters max)';
  end if;
  if p_recipient_email is not null and not is_valid_contact(p_recipient_email) then
    raise exception 'Recipient contact must be a valid email or phone number';
  end if;

  v_code := generate_gift_card_code();

  insert into gift_cards (
    code, pin_hash, original_amount, current_balance, buyer_id, buyer_name, buyer_email,
    recipient_name, recipient_email, message, delivery_method, expires_at, status
  ) values (
    v_code, null, p_amount, p_amount, auth.uid(), p_buyer_name, p_buyer_email,
    nullif(p_recipient_name, ''), p_recipient_email, p_message, p_delivery_method, now() + interval '2 years',
    'pending_payment'
  ) returning gift_cards.id into v_id;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'purchase_pending_payment', 'gift_cards', v_id::text,
    jsonb_build_object('amount', p_amount, 'delivery_method', p_delivery_method));

  return query select v_code, v_id, p_amount;
end;
$$;

revoke all on function purchase_gift_card(numeric, text, text, text, text, text, text) from public, anon;
grant execute on function purchase_gift_card(numeric, text, text, text, text, text, text) to authenticated;

-- check_gift_card_balance: code only, and now also returns who it's from and
-- the message, so a shared link can say "You've received $50 from Marwan"
-- instead of a bare form.
drop function if exists check_gift_card_balance(text, text);

create or replace function check_gift_card_balance(p_code text)
returns table (remaining_balance numeric, currency text, from_name text, card_message text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_card gift_cards;
  v_err constant text := 'That code is not valid.';
begin
  if auth.uid() is null then
    raise exception '%', v_err;
  end if;

  perform check_rate_limit('gift_card_check', 5);

  select * into v_card from gift_cards where code = p_code for update;

  if not found or v_card.status != 'active'
     or (v_card.locked_until is not null and v_card.locked_until > now())
  then
    raise exception '%', v_err;
  end if;

  if v_card.expires_at is not null and v_card.expires_at < now() then
    update gift_cards set status = 'expired' where id = v_card.id;
    raise exception '%', v_err;
  end if;

  return query select v_card.current_balance, v_card.currency, v_card.buyer_name, v_card.message;
end;
$$;

revoke all on function check_gift_card_balance(text) from public, anon;
grant execute on function check_gift_card_balance(text) to authenticated;

-- place_order: gift card redemption drops the PIN param, adds a flat
-- delivery fee (was hardcoded to $0 — nobody asked for free delivery,
-- that just never got wired up).
drop function if exists place_order(uuid, date, text, text, text, text, text);

create function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod'
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 5.00;
  v_discount numeric(10,2) := 0;
  v_card gift_cards;
  v_gc_err constant text := 'That gift card code is not valid.';
  v_card_share numeric(10,2);
  v_commission_rate numeric(4,3);
  v_commission_amount numeric(10,2);
  rec record;
begin
  if p_payment_method not in ('cod', 'whish') then
    raise exception 'unknown payment method';
  end if;
  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Order notes are too long (1000 characters max)';
  end if;
  if p_delivery_time_slot is not null and length(p_delivery_time_slot) > 100 then
    raise exception 'Invalid delivery time slot';
  end if;

  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
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
    discount_amount, total, notes, gift_card_code, payment_method, payment_status
  )
  values (
    v_order_number, auth.uid(), p_delivery_address_id, 0, 0,
    0, 0, p_notes, p_gift_card_code, p_payment_method, 'unpaid'
  )
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

  if v_card.id is not null then
    v_discount := least(v_card.current_balance, v_order_subtotal + v_delivery_fee);

    update gift_cards
      set current_balance = current_balance - v_discount,
          status = case when current_balance - v_discount <= 0 then 'depleted' else status end
      where id = v_card.id
      returning current_balance into v_card.current_balance;
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

  delete from cart_items where profile_id = auth.uid();

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, date, text, text, text, text) from public, anon;
grant execute on function place_order(uuid, date, text, text, text, text) to authenticated;
