-- Gift cards can now be delivered two ways: a physical card hand-delivered to the
-- buyer's address, or a digital QR/link sent to the recipient. Codes become 6 digits
-- so they are easy to read off a printed card or type in by hand.

alter table gift_cards
  add column if not exists delivery_method text not null default 'digital'
    check (delivery_method in ('digital', 'physical'));

create or replace function generate_gift_card_code() returns text
language plpgsql as $$
declare
  v_code text;
begin
  loop
    -- 6 digits, zero-padded, never starting the search over a collision.
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;
  return v_code;
end;
$$;

drop function if exists purchase_gift_card(numeric, text, text, text);

create or replace function purchase_gift_card(
  p_amount numeric,
  p_recipient_name text,
  p_recipient_email text default null,
  p_message text default null,
  p_delivery_method text default 'digital'
) returns gift_cards
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
begin
  if p_amount <= 0 then
    raise exception 'Gift card amount must be greater than zero';
  end if;

  if p_delivery_method not in ('digital', 'physical') then
    raise exception 'Unknown delivery method: %', p_delivery_method;
  end if;

  insert into gift_cards (
    code, initial_amount, remaining_balance, purchased_by,
    recipient_name, recipient_email, message, delivery_method
  )
  values (
    generate_gift_card_code(), p_amount, p_amount, auth.uid(),
    p_recipient_name, p_recipient_email, p_message, p_delivery_method
  )
  returning * into v_card;

  return v_card;
end;
$$;

revoke all on function purchase_gift_card(numeric, text, text, text, text) from public;
grant execute on function purchase_gift_card(numeric, text, text, text, text) to authenticated;
