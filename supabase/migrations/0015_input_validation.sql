-- PART 7: server-side validation. This app has no separate API layer — every
-- write goes through Postgres (via PostgREST or a SECURITY DEFINER function),
-- so the database itself IS the server boundary. Validation lives here, not
-- in a Zod schema on a route that doesn't exist. Applied as CHECK constraints
-- where a table is written to directly, and as explicit checks inside
-- functions where business rules (ranges, formats) don't fit a constraint.

-- Quantities: positive with a sane ceiling (999 is theatre — nobody buys
-- 1000 of one earring — and it stops someone breaking a total by accident
-- or on purpose).
alter table cart_items drop constraint if exists cart_items_quantity_check;
alter table cart_items add constraint cart_items_quantity_check
  check (quantity > 0 and quantity <= 999);

alter table order_items drop constraint if exists order_items_quantity_check;
alter table order_items add constraint order_items_quantity_check
  check (quantity > 0 and quantity <= 999);

-- Addresses: every free-text field gets a ceiling. Nothing here needs to be
-- an essay, and an unbounded text column is an open invitation to send
-- megabytes of junk in a single request.
alter table addresses
  add constraint addresses_label_len check (char_length(label) <= 50),
  add constraint addresses_recipient_name_len check (char_length(recipient_name) <= 200),
  add constraint addresses_phone_len check (char_length(phone) <= 30),
  add constraint addresses_city_len check (char_length(city) <= 100),
  add constraint addresses_area_len check (char_length(area) <= 100),
  add constraint addresses_street_len check (char_length(street) <= 200),
  add constraint addresses_building_len check (building is null or char_length(building) <= 100),
  add constraint addresses_floor_len check (floor is null or char_length(floor) <= 50),
  add constraint addresses_apartment_len check (apartment is null or char_length(apartment) <= 50),
  add constraint addresses_notes_len check (notes is null or char_length(notes) <= 1000);

-- Profiles: matches the caps Settings.tsx already trims to client-side, now
-- also enforced at the one place that actually matters.
alter table profiles
  add constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 100),
  add constraint profiles_phone_len check (phone is null or char_length(phone) <= 30);

-- A tiny reusable email-shape check. Not a full RFC 5322 validator (nothing
-- practical is), just enough to reject "not an email" before it's stored.
create or replace function is_valid_email(p_email text) returns boolean
language sql immutable as $$
  select p_email is null or p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
$$;

alter table gift_cards
  add constraint gift_cards_recipient_email_valid check (is_valid_email(recipient_email)),
  add constraint gift_cards_buyer_email_valid check (is_valid_email(buyer_email)),
  add constraint gift_cards_recipient_name_len check (char_length(recipient_name) <= 200),
  add constraint gift_cards_buyer_name_len check (buyer_name is null or char_length(buyer_name) <= 200),
  add constraint gift_cards_message_len check (message is null or char_length(message) <= 500);

-- Gift card amount range: $10–$500, matching the example range in the spec.
-- Tell me if you want different limits — one line to change.
create or replace function purchase_gift_card(
  p_amount numeric,
  p_recipient_name text,
  p_recipient_email text default null,
  p_message text default null,
  p_delivery_method text default 'digital',
  p_buyer_name text default null,
  p_buyer_email text default null
) returns table (code text, pin text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
  v_pin text;
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
  if length(p_recipient_name) = 0 or length(p_recipient_name) > 200 then
    raise exception 'Recipient name must be between 1 and 200 characters';
  end if;
  if p_message is not null and length(p_message) > 500 then
    raise exception 'Message is too long (500 characters max)';
  end if;
  if p_recipient_email is not null and not is_valid_email(p_recipient_email) then
    raise exception 'Recipient email is not a valid email address';
  end if;
  if p_buyer_email is not null and not is_valid_email(p_buyer_email) then
    raise exception 'Buyer email is not a valid email address';
  end if;

  v_code := generate_gift_card_code();
  v_pin := generate_gift_card_pin();

  insert into gift_cards (
    code, pin_hash, original_amount, current_balance, buyer_id, buyer_name, buyer_email,
    recipient_name, recipient_email, message, delivery_method, expires_at, status
  ) values (
    v_code, crypt(v_pin, gen_salt('bf')), p_amount, p_amount, auth.uid(), p_buyer_name, p_buyer_email,
    p_recipient_name, p_recipient_email, p_message, p_delivery_method, now() + interval '2 years',
    'pending_payment'
  ) returning gift_cards.id into v_id;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'purchase_pending_payment', 'gift_cards', v_id::text,
    jsonb_build_object('amount', p_amount, 'delivery_method', p_delivery_method));

  return query select v_code, v_pin, v_id, p_amount;
end;
$$;

-- place_order: cap the notes field (nothing legitimate needs a novel here).
create or replace function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod',
  p_gift_card_pin text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_card gift_cards;
  v_gc_err constant text := 'That gift card code or PIN is not valid.';
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

    if p_gift_card_pin is null or crypt(p_gift_card_pin, v_card.pin_hash) <> v_card.pin_hash then
      update gift_cards set
        failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
      where id = v_card.id;
      raise exception '%', v_gc_err;
    end if;

    update gift_cards set failed_pin_attempts = 0 where id = v_card.id;
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
