-- PART 5, adapted to this business's real payment model (Whish transfer / COD,
-- no card processor, no webhooks — verified with the user this is accurate).
--
-- The principle still applies: never activate value before payment is
-- confirmed. Without a webhook, "confirmed" has to mean a human (you) seeing
-- the money arrive and saying so. So a purchased card is now born inert —
-- generated, code and PIN shown to the buyer, but NOT spendable — until you
-- flip it on. This closes a real hole: as originally built, purchasing
-- instantly created a live, fully spendable card before any money had
-- necessarily changed hands.

alter table gift_cards drop constraint if exists gift_cards_status_check;
alter table gift_cards add constraint gift_cards_status_check
  check (status in ('pending_payment', 'active', 'depleted', 'expired', 'cancelled', 'fraud_hold'));

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
  if p_amount <= 0 then
    raise exception 'Gift card amount must be greater than zero';
  end if;
  if p_delivery_method not in ('digital', 'physical') then
    raise exception 'Unknown delivery method: %', p_delivery_method;
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

-- Every check-balance / redeem call already requires status = 'active', so a
-- pending_payment card is correctly unusable with no other code changes.

-- Admin confirms the Whish transfer arrived / COD cash was collected.
create or replace function confirm_gift_card_payment(p_gift_card_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old gift_cards;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_old from gift_cards where id = p_gift_card_id for update;
  if not found then
    raise exception 'gift card not found';
  end if;
  if v_old.status <> 'pending_payment' then
    raise exception 'card is not awaiting payment (status: %)', v_old.status;
  end if;

  update gift_cards set status = 'active' where id = p_gift_card_id;

  insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
  values (auth.uid()::text, 'confirm_payment', 'gift_cards', p_gift_card_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', 'active'));
end;
$$;

revoke all on function confirm_gift_card_payment(uuid) from public, anon;
grant execute on function confirm_gift_card_payment(uuid) to authenticated;

-- Payment never arrived — release the card instead of leaving it dangling.
create or replace function cancel_unpaid_gift_card(p_gift_card_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old gift_cards;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_old from gift_cards where id = p_gift_card_id for update;
  if not found then
    raise exception 'gift card not found';
  end if;
  if v_old.status <> 'pending_payment' then
    raise exception 'card is not awaiting payment (status: %)', v_old.status;
  end if;

  update gift_cards set status = 'cancelled' where id = p_gift_card_id;

  insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
  values (auth.uid()::text, 'cancel_unpaid', 'gift_cards', p_gift_card_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', 'cancelled'));
end;
$$;

revoke all on function cancel_unpaid_gift_card(uuid) from public, anon;
grant execute on function cancel_unpaid_gift_card(uuid) to authenticated;

-- Refunds: never refund a card that's already been (partially) spent without
-- knowing it, and cancelling happens in the same statement as the check —
-- there's no window for a redemption to sneak in between "check" and "cancel".
create or replace function refund_gift_card(p_gift_card_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_card from gift_cards where id = p_gift_card_id for update;
  if not found then
    raise exception 'gift card not found';
  end if;
  if v_card.current_balance <> v_card.original_amount then
    raise exception 'card has already been redeemed against, cannot refund (balance % of %)',
      v_card.current_balance, v_card.original_amount;
  end if;
  if v_card.status not in ('pending_payment', 'active') then
    raise exception 'card is not in a refundable state (status: %)', v_card.status;
  end if;

  update gift_cards set status = 'cancelled', current_balance = 0 where id = p_gift_card_id;

  insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
  values (auth.uid()::text, 'refund', 'gift_cards', p_gift_card_id::text,
    jsonb_build_object('status', v_card.status, 'balance', v_card.current_balance),
    jsonb_build_object('status', 'cancelled', 'balance', 0));
end;
$$;

revoke all on function refund_gift_card(uuid) from public, anon;
grant execute on function refund_gift_card(uuid) to authenticated;
