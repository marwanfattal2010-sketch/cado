-- ============================================================
-- 0064 — PAYING WITH THE CADO BALANCE
--
-- WHY THIS DOES NOT TOUCH place_order
--
-- place_order is ~200 lines of money logic about partners: one sub_order per
-- store, payables, the delivery window, the cart lock from 0050. Postgres
-- cannot add a parameter in place, so changing it means DROP and CREATE —
-- and for the seconds between those two statements, checkout is a function
-- that does not exist. 0047 had to do that and it was worth the risk for a
-- behaviour change. This is not that: nothing about how an order is built
-- changes, only what happens to the total afterwards.
--
-- So this WRAPS it. And the wrap is still atomic, which is the requirement
-- that actually matters: a plpgsql function body runs inside ONE
-- transaction, so place_order() and spend_wallet_balance() below either both
-- commit or both roll back. An order can never exist having taken money it
-- did not record, and money can never leave a wallet for an order that
-- failed to write.
--
-- THE CLIENT'S NUMBERS ARE NEVER USED. The amount to take is read from
-- `orders.total` — the figure place_order computed from the database — not
-- from anything the browser sent. The browser says only "use my balance", a
-- boolean.
--
-- Additive: a new function, a new nullable column. The deployed site keeps
-- working if this lands before it.
-- ============================================================

-- How much of this order the wallet covered. Nullable, so every existing
-- order stays exactly as it is and no backfill is needed.
alter table orders add column if not exists wallet_amount numeric(10,2);

comment on column orders.wallet_amount is
  'How much of total was paid from the CADO wallet. Null on orders that predate the wallet, or that did not use it.';

create or replace function place_order_with_wallet(
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
  p_partner_id uuid default null,
  -- The only new input, and it is a yes/no. Not an amount: an amount from
  -- the browser is an amount someone can edit.
  p_use_balance boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_total numeric(10,2);
  v_taken numeric(10,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Log in to place an order.';
  end if;

  -- Build the order exactly as it has always been built. Every rule inside
  -- place_order — the cart lock, one store per order, the delivery window,
  -- the payables — still applies and is not duplicated here.
  v_order_id := place_order(
    p_delivery_address_id := p_delivery_address_id,
    p_delivery_date := p_delivery_date,
    p_delivery_time_slot := p_delivery_time_slot,
    p_notes := p_notes,
    p_gift_card_code := p_gift_card_code,
    p_payment_method := p_payment_method,
    p_is_gift := p_is_gift,
    p_recipient_name := p_recipient_name,
    p_recipient_phone := p_recipient_phone,
    p_address_source := p_address_source,
    p_hide_price := p_hide_price,
    p_gift_message := p_gift_message,
    p_partner_id := p_partner_id
  );

  if not p_use_balance then
    return v_order_id;
  end if;

  -- The total the DATABASE calculated, after any gift card place_order
  -- already applied.
  select total into v_total from orders where id = v_order_id;

  v_taken := spend_wallet_balance(auth.uid(), v_total, v_order_id);

  if v_taken > 0 then
    update orders
       set wallet_amount = v_taken,
           -- Covered in full means there is nothing left to collect. Anything
           -- short stays unpaid: the rest is still owed by Whish, card or
           -- cash, and a partly-paid order must not look settled to the shop.
           payment_status = case when v_taken >= v_total then 'paid' else payment_status end
     where id = v_order_id;
  end if;

  return v_order_id;
end;
$$;

revoke all on function place_order_with_wallet(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid, boolean) from public, anon;
grant execute on function place_order_with_wallet(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid, boolean) to authenticated;
