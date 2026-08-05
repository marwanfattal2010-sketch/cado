-- Recipient contact was email-only; buyers also want to note a phone number
-- (e.g. to send the QR code over WhatsApp instead of email). The column
-- stores whatever the buyer used to share the card themselves — it was never
-- used to auto-send anything — so relax the check to accept either shape.
create or replace function is_valid_contact(p_contact text) returns boolean
language sql immutable as $$
  select p_contact is null
    or p_contact ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    or p_contact ~ '^\+?[0-9 ()-]{7,20}$';
$$;

alter table gift_cards drop constraint if exists gift_cards_recipient_email_valid;
alter table gift_cards add constraint gift_cards_recipient_contact_valid
  check (is_valid_contact(recipient_email));

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
  if p_recipient_email is not null and not is_valid_contact(p_recipient_email) then
    raise exception 'Recipient contact must be a valid email or phone number';
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
