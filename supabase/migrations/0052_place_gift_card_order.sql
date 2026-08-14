-- ============================================================
-- 0052 — checking out a gift card
--
-- Additive: one new function. `place_order` is NOT touched, and that is
-- deliberate.
--
-- WHY A SEPARATE FUNCTION RATHER THAN A BRANCH INSIDE place_order
--
-- place_order is ~200 lines of money logic about partners: one sub_order per
-- store, commission rates, store payables, stock decrements, per-partner
-- gift card apportionment. A gift card has none of those things — no store,
-- no commission, no stock, nobody to pay out. Threading a branch through
-- that function would mean editing every one of those blocks to skip itself,
-- on the code path that charges real customers.
--
-- This is not duplicated money logic. The part that actually mints a card
-- and sets its balance is `issue_gift_card_internal` (0045), and this calls
-- into it exactly like the pool path does. There is still one place that
-- writes a gift card row.
--
-- WHAT IT WILL NOT DO
--
-- * It will not mint a spendable card. Cards are created `pending_payment`,
--   the same as every other card, and only an admin confirming the money
--   arrived makes them usable. The client never sets a balance.
-- * It will not let a gift card pay for a gift card. There is deliberately
--   no p_gift_card_code argument — that loop would let someone shuffle
--   balances between cards for no honest reason.
-- * It will not create a sub_order, so no store is ever paid for it, and
--   0051's trigger stops these from sharing an order with store items.
-- * It will not mint twice on a double tap. The cart is locked first, the
--   same fix 0050 applied to place_order.
-- ============================================================

create or replace function place_gift_card_order(
  p_delivery_address_id uuid default null,
  p_notes text default null,
  p_payment_method text default 'cod',
  p_is_gift boolean default false,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_address_source text default 'buyer',
  p_delivery_time_slot text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_has_physical boolean := false;
  v_buyer_name text;
  v_card record;
  rec record;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'must be logged in to place an order';
  end if;

  -- Lock this shopper's cart before reading a single row of it, so a double
  -- tap cannot mint two sets of cards for one payment. Same reasoning as
  -- 0050.
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

  if p_address_source = 'buyer' then
    if p_delivery_address_id is null then
      raise exception 'Choose a delivery address';
    end if;
    if not exists (
      select 1 from addresses
      where id = p_delivery_address_id and profile_id = auth.uid()
    ) then
      raise exception 'delivery address does not belong to the current user';
    end if;
  else
    if p_recipient_phone is null or length(trim(p_recipient_phone)) < 6 then
      raise exception 'Add their phone number so we can ask where to deliver';
    end if;
  end if;

  -- "Empty" means empty of GIFT CARDS. Store items are a different cart and
  -- a different checkout; they are deliberately not visible here.
  if not exists (
    select 1 from cart_items
    where profile_id = auth.uid() and gift_card_amount_cents is not null
  ) then
    raise exception 'cart is empty';
  end if;

  select coalesce(sum(gift_card_amount_cents * quantity), 0) / 100.0,
         bool_or(coalesce(customization->>'delivery_method', 'digital') = 'physical')
    into v_subtotal, v_has_physical
    from cart_items
   where profile_id = auth.uid() and gift_card_amount_cents is not null;

  -- A digital card is a link and a QR code; there is nothing to drive
  -- anywhere, so there is nothing to charge for driving it. A printed card
  -- in an envelope is a real delivery and carries the normal fee.
  v_delivery_fee := case when v_has_physical then 5.00 else 0.00 end;

  select full_name into v_buyer_name from profiles where id = auth.uid();

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (
    order_number, customer_id, delivery_address_id, subtotal, delivery_fee,
    discount_amount, total, notes, payment_method, payment_status,
    is_gift, recipient_name, recipient_phone, address_source, delivery_slot
  ) values (
    v_order_number, auth.uid(),
    case when p_address_source = 'buyer' then p_delivery_address_id else null end,
    v_subtotal, v_delivery_fee, 0, v_subtotal + v_delivery_fee,
    p_notes, p_payment_method, 'unpaid',
    p_is_gift, nullif(trim(coalesce(p_recipient_name, '')), ''),
    nullif(trim(coalesce(p_recipient_phone, '')), ''),
    p_address_source, p_delivery_time_slot
  )
  returning id into v_order_id;

  -- One card per unit. Buying three $50 cards means three separate codes,
  -- because that is what three gift cards is — not one card worth $150.
  for rec in
    select gift_card_amount_cents, quantity, customization
      from cart_items
     where profile_id = auth.uid() and gift_card_amount_cents is not null
     order by created_at
  loop
    for i in 1..rec.quantity loop
      select * into v_card from issue_gift_card_internal(
        (rec.gift_card_amount_cents / 100.0)::numeric,
        auth.uid(),
        nullif(trim(coalesce(rec.customization->>'note_to', '')), ''),
        null,
        nullif(trim(coalesce(rec.customization->>'note_message', '')), ''),
        coalesce(rec.customization->>'delivery_method', 'digital'),
        coalesce(nullif(trim(coalesce(rec.customization->>'note_from', '')), ''), v_buyer_name),
        null
      );

      insert into order_gift_cards (order_id, gift_card_id, amount_cents)
      values (v_order_id, v_card.id, rec.gift_card_amount_cents);
    end loop;
  end loop;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'place_gift_card_order', 'orders', v_order_id::text,
          jsonb_build_object('subtotal', v_subtotal, 'delivery_fee', v_delivery_fee));

  -- Only the gift cards leave the cart. Any store carts are still sitting
  -- there, untouched, when the shopper goes back.
  delete from cart_items
   where profile_id = auth.uid() and gift_card_amount_cents is not null;

  return v_order_id;
end;
$$;

revoke all on function place_gift_card_order(uuid, text, text, boolean, text, text, text, text)
  from public, anon;
grant execute on function place_gift_card_order(uuid, text, text, boolean, text, text, text, text)
  to authenticated;

-- ============================================================
-- Voiding the cards an order minted.
--
-- The voiding itself already exists and is NOT rewritten here:
-- `cancel_unpaid_gift_card` refuses unless the card is still awaiting
-- payment, and `refund_gift_card` refuses if a single dollar has been spent,
-- checking and cancelling inside one locked statement. Both are from 0014.
--
-- What was missing was only knowing which cards an order produced. This
-- walks that link and calls the existing function for each, and deliberately
-- does NOT swallow their refusals: a partly-spent card must fail loudly and
-- go to a human, because that money is already sitting with a store.
-- ============================================================

create or replace function void_order_gift_cards(p_order_id uuid)
returns table (gift_card_id uuid, outcome text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  rec record;
begin
  if not is_admin() then
    raise exception 'Only an admin can void an order''s gift cards.';
  end if;

  for rec in
    select g.gift_card_id, c.status
      from order_gift_cards g
      join gift_cards c on c.id = g.gift_card_id
     where g.order_id = p_order_id
  loop
    if rec.status = 'pending_payment' then
      perform cancel_unpaid_gift_card(rec.gift_card_id);
      return query select rec.gift_card_id, 'cancelled (was never paid for)'::text;
    elsif rec.status = 'active' then
      -- Raises if any of it has been spent. That is the correct outcome:
      -- the money is already at a store and a human has to deal with it.
      perform refund_gift_card(rec.gift_card_id);
      return query select rec.gift_card_id, 'refunded'::text;
    else
      return query select rec.gift_card_id, ('left alone (status: ' || rec.status || ')')::text;
    end if;
  end loop;
end;
$$;

revoke all on function void_order_gift_cards(uuid) from public, anon;
grant execute on function void_order_gift_cards(uuid) to authenticated;
