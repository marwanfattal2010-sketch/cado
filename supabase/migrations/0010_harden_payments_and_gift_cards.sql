-- Hardening pass: the browser may send intentions and IDs, never amounts or states.
--
-- 1. Payment method/status become real columns instead of client-written free text,
--    and only staff can mark an order paid.
-- 2. Gift cards are 6 digits (easy to type, but only a million combinations), so the
--    lookup is authenticated, rate limited, and stops leaking balances to guessers.
-- 3. Customers can no longer INSERT orders directly; place_order is the only path.

-- ============================================================
-- 1. Payment
-- ============================================================
alter table orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded'));

alter table orders
  drop constraint if exists orders_payment_method_check;

alter table orders
  alter column payment_method set default 'cod';

alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'whish'));

-- A customer declaring "I paid by Whish" is a claim, not a fact. Only admins flip
-- payment_status, and orders remain immutable to the customer who owns them.
drop policy if exists "customer creates own orders" on orders;

-- ============================================================
-- 2. Gift cards
-- ============================================================

-- A card belongs to whoever redeems it first; only that account may spend it.
alter table gift_cards
  add column if not exists claimed_by uuid references profiles(id) on delete set null;

create table if not exists gift_card_attempts (
  id bigserial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists gift_card_attempts_lookup
  on gift_card_attempts (profile_id, attempted_at desc);

alter table gift_card_attempts enable row level security;
-- No direct access: the SECURITY DEFINER functions below are the only writers.
create policy "admin reads gift card attempts" on gift_card_attempts
  for select using (is_admin());

-- Claim a card by code. Authenticated only, and throttled so the 6-digit space
-- cannot be swept: 8 failures in 15 minutes locks further attempts.
create or replace function redeem_gift_card(p_code text)
returns table (remaining_balance numeric, currency text)
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
  v_failures int;
begin
  if auth.uid() is null then
    raise exception 'must be logged in to redeem a gift card';
  end if;

  select count(*) into v_failures
  from gift_card_attempts
  where profile_id = auth.uid()
    and not succeeded
    and attempted_at > now() - interval '15 minutes';

  if v_failures >= 8 then
    raise exception 'too many attempts, please wait a few minutes';
  end if;

  select * into v_card from gift_cards
  where code = p_code
    and status = 'active'
    and gift_cards.remaining_balance > 0
    and (claimed_by is null or claimed_by = auth.uid())
  for update;

  if not found then
    insert into gift_card_attempts (profile_id, succeeded) values (auth.uid(), false);
    raise exception 'that code is not valid';
  end if;

  if v_card.claimed_by is null then
    update gift_cards set claimed_by = auth.uid() where id = v_card.id;
  end if;

  insert into gift_card_attempts (profile_id, succeeded) values (auth.uid(), true);

  return query select v_card.remaining_balance, v_card.currency;
end;
$$;

revoke all on function redeem_gift_card(text) from public, anon;
grant execute on function redeem_gift_card(text) to authenticated;

-- The old anonymous checker leaked "is this code real, and how much is on it" to
-- anyone who asked. Replaced by a lookup that only reports cards you already hold.
drop function if exists check_gift_card(text);

create or replace function check_gift_card(p_code text) returns table (
  valid boolean, remaining_balance numeric, currency text
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return query select false, 0::numeric, 'USD'::text;
    return;
  end if;

  return query
    select true, gc.remaining_balance, gc.currency
    from gift_cards gc
    where gc.code = p_code
      and gc.status = 'active'
      and gc.remaining_balance > 0
      and (gc.claimed_by = auth.uid() or gc.purchased_by = auth.uid());

  if not found then
    return query select false, 0::numeric, 'USD'::text;
  end if;
end;
$$;

revoke all on function check_gift_card(text) from public, anon;
grant execute on function check_gift_card(text) to authenticated;

-- ============================================================
-- 3. place_order: takes payment method as a validated intent, and refuses
--    gift cards the caller does not hold.
-- ============================================================
drop function if exists place_order(uuid, date, text, text, text);

create function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod'
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
  if p_payment_method not in ('cod', 'whish') then
    raise exception 'unknown payment method';
  end if;

  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
    raise exception 'cart is empty';
  end if;

  if p_gift_card_code is not null then
    select * into v_gift_card from gift_cards
      where code = p_gift_card_code
        and status = 'active'
        and remaining_balance > 0
        and (claimed_by = auth.uid() or purchased_by = auth.uid())
      for update;
    if not found then
      raise exception 'gift card code is invalid or has no remaining balance';
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

revoke all on function place_order(uuid, date, text, text, text, text) from public, anon;
grant execute on function place_order(uuid, date, text, text, text, text) to authenticated;
