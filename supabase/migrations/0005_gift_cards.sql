-- Gift cards: purchased with a chosen balance, redeemed as credit at checkout.
create table gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_amount numeric(10,2) not null check (initial_amount > 0),
  remaining_balance numeric(10,2) not null check (remaining_balance >= 0),
  currency text not null default 'USD',
  purchased_by uuid references profiles(id) on delete set null,
  recipient_name text not null,
  recipient_email text,
  message text,
  status text not null default 'active' check (status in ('active','depleted','disabled')),
  created_at timestamptz not null default now()
);

create index gift_cards_purchased_by_idx on gift_cards (purchased_by);

alter table gift_cards enable row level security;

-- Purchasers can see their own gift cards (to retrieve the code they bought).
create policy "owner reads own gift cards" on gift_cards
  for select using (purchased_by = auth.uid() or is_admin());
create policy "admin full access to gift cards" on gift_cards
  for all using (is_admin()) with check (is_admin());

-- No direct insert/update policy for authenticated users — all writes go through
-- the SECURITY DEFINER RPCs below, so a code's balance can't be tampered with client-side.

create or replace function generate_gift_card_code() returns text
language plpgsql as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := 'CADO-' ||
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    select exists(select 1 from gift_cards where code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

create or replace function purchase_gift_card(
  p_amount numeric,
  p_recipient_name text,
  p_recipient_email text default null,
  p_message text default null
) returns gift_cards
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
begin
  if p_amount <= 0 then
    raise exception 'Gift card amount must be greater than zero';
  end if;

  insert into gift_cards (code, initial_amount, remaining_balance, purchased_by, recipient_name, recipient_email, message)
  values (generate_gift_card_code(), p_amount, p_amount, auth.uid(), p_recipient_name, p_recipient_email, p_message)
  returning * into v_card;

  return v_card;
end;
$$;

revoke all on function purchase_gift_card(numeric, text, text, text) from public;
grant execute on function purchase_gift_card(numeric, text, text, text) to authenticated;

-- Validates a code without exposing the full row (no balance leakage to guessers beyond a yes/no + amount).
create or replace function check_gift_card(p_code text) returns table (
  valid boolean, remaining_balance numeric, currency text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select true, gc.remaining_balance, gc.currency
    from gift_cards gc
    where gc.code = p_code and gc.status = 'active' and gc.remaining_balance > 0;

  if not found then
    return query select false, 0::numeric, 'USD'::text;
  end if;
end;
$$;

grant execute on function check_gift_card(text) to anon, authenticated;
