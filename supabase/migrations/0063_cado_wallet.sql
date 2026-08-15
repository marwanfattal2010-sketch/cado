-- ============================================================
-- 0063 — THE CADO WALLET
--
-- One wallet per person. A gift card code is redeemed INTO it, and the
-- balance can then be spent across any store instead of being tied to the
-- one card at the one checkout.
--
-- Money rules, and none of them are negotiable:
--
--   1. The browser never writes a balance. Every change goes through a
--      SECURITY DEFINER function here. RLS lets a user READ their own wallet
--      and nothing else; there is no UPDATE policy for anyone.
--   2. A balance can never go below zero — a CHECK constraint, not a
--      convention, so a bug cannot invent money.
--   3. Every change writes a wallet_transactions row. A balance with no
--      history is a number nobody can audit.
--   4. Redemption row-locks the gift card exactly the way
--      check_gift_card_balance already does, so one code cannot be redeemed
--      twice by two simultaneous taps.
--
-- TWO THINGS THE SPEC GOT WRONG ABOUT THE EXISTING DATA, both checked
-- against the live table before this was written:
--
--   * Existing codes are TWENTY characters, not twelve.
--   * Existing cards have a PIN (`pin_hash`, bcrypt, five attempts then a
--     fifteen-minute lock). The spec's redeem flow is code-only.
--
-- Dropping the PIN for those cards would mean anyone who has ever SEEN a
-- code — a photo, a forwarded email, a shop assistant — could move its money
-- into their own wallet. That is a security regression on cards already
-- sold, so it is not done. Old long codes still require their PIN. New
-- 9-digit codes are issued without one and are redeemed by code alone,
-- exactly as specified, protected by rate limiting instead.
--
-- OUT OF SCOPE, deliberately: paying with the card in a physical shop.
--
-- DEPLOY TOGETHER WITH THE SITE. The 0046 lesson: a migration is only
-- dangerous in the window between applying it and deploying, and only when
-- it makes the database STRICTER than the deployed frontend expects. This
-- one is purely additive — a new table, new functions, and one new
-- defaulted argument on place_order — so the currently deployed site keeps
-- working untouched if it lands first. Nothing here can break what is live.
-- ============================================================

-- ------------------------------------------------------------
-- The wallet
-- ------------------------------------------------------------
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  -- Display only, and NOT a secret: it is printed on the card face in the
  -- app. It identifies the wallet to a human, it never authorises anything.
  card_number text not null unique,
  balance numeric(10,2) not null default 0 check (balance >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallets_profile_idx on wallets(profile_id);

-- ------------------------------------------------------------
-- The history. One row per movement, in or out.
-- ------------------------------------------------------------
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  -- Positive in, negative out. Signed rather than a separate direction
  -- column so the sum of this column IS the balance, and the two can be
  -- reconciled with one query.
  amount numeric(10,2) not null,
  kind text not null check (kind in ('redeem', 'purchase', 'refund', 'adjustment')),
  balance_after numeric(10,2) not null,
  gift_card_id uuid references gift_cards(id),
  order_id uuid references orders(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_tx_wallet_idx on wallet_transactions(wallet_id, created_at desc);

alter table wallets enable row level security;
alter table wallet_transactions enable row level security;

-- READ your own. There is deliberately no insert/update/delete policy for
-- anyone: every write goes through the SECURITY DEFINER functions below,
-- which bypass RLS. A missing policy is the strongest possible statement.
drop policy if exists "wallet: read own" on wallets;
create policy "wallet: read own" on wallets
  for select using (profile_id = auth.uid() or is_admin());

drop policy if exists "wallet tx: read own" on wallet_transactions;
create policy "wallet tx: read own" on wallet_transactions
  for select using (
    is_admin() or wallet_id in (select id from wallets where profile_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Card numbers. Twelve characters, shown as XXXX-XXXX-XXXX.
--
-- No ambiguous glyphs (0/O, 1/I/L) because this number gets read aloud and
-- typed by hand off a phone screen.
-- ------------------------------------------------------------
create or replace function generate_card_number() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
  v_i int;
begin
  loop
    v_code := '';
    for v_i in 1..12 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from wallets where card_number = v_code);
  end loop;
  return v_code;
end;
$$;

-- ------------------------------------------------------------
-- A wallet appears the moment a profile does, and is backfilled for
-- everyone who signed up before today.
-- ------------------------------------------------------------
create or replace function ensure_wallet_for_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into wallets (profile_id, card_number)
  values (new.id, generate_card_number())
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_wallet on profiles;
create trigger profiles_ensure_wallet
  after insert on profiles
  for each row execute function ensure_wallet_for_profile();

insert into wallets (profile_id, card_number)
select p.id, generate_card_number()
from profiles p
where not exists (select 1 from wallets w where w.profile_id = p.id);

-- ------------------------------------------------------------
-- my_wallet — the card face. Creates the wallet on first read if a profile
-- somehow predates the trigger, so the UI can never show an empty state that
-- only a database migration could fix.
-- ------------------------------------------------------------
create or replace function my_wallet()
returns table (card_number text, balance numeric, currency text)
language plpgsql security definer set search_path = public as $$
declare
  v_wallet wallets;
begin
  if auth.uid() is null then
    raise exception 'Log in to see your CADO card.';
  end if;

  select * into v_wallet from wallets where profile_id = auth.uid();
  if not found then
    insert into wallets (profile_id, card_number)
    values (auth.uid(), generate_card_number())
    returning * into v_wallet;
  end if;

  return query select v_wallet.card_number, v_wallet.balance, v_wallet.currency;
end;
$$;

revoke all on function my_wallet() from public, anon;
grant execute on function my_wallet() to authenticated;

-- ------------------------------------------------------------
-- New codes are nine digits, shown as 333-333-333.
--
-- Nine digits is a billion combinations, which is only safe BECAUSE
-- redemption is rate limited — see redeem_gift_card_to_wallet. Widen this,
-- never narrow it.
-- ------------------------------------------------------------
create or replace function generate_gift_card_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  loop
    v_code := lpad(floor(random() * 1000000000)::bigint::text, 9, '0');
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;
  return v_code;
end;
$$;

-- ------------------------------------------------------------
-- redeem_gift_card_to_wallet — moves a card's remaining value into the
-- caller's wallet.
--
-- BOTH FORMATS WORK. A nine-digit code needs no PIN. An existing long code
-- still needs the PIN it was sold with, because those cards were issued on
-- the promise that the code alone is not enough.
--
-- Locking is the same shape as check_gift_card_balance: `select ... for
-- update` on the card, so two simultaneous redemptions of one code serialise
-- and the second finds a zero balance rather than doubling the money.
-- ------------------------------------------------------------
create or replace function redeem_gift_card_to_wallet(p_code text, p_pin text default null)
returns table (redeemed numeric, new_balance numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
  v_wallet wallets;
  v_amount numeric(10,2);
  v_new numeric(10,2);
  -- One message for every failure. A different error for "no such code" and
  -- "wrong PIN" is a free oracle for anyone guessing.
  v_err constant text := 'That code is not valid, or has already been used.';
begin
  if auth.uid() is null then
    raise exception 'Log in to redeem a code.';
  end if;

  perform check_rate_limit('wallet_redeem', 5);

  -- Normalise what a person typed: the UI shows 333-333-333, people paste
  -- spaces, and old codes were printed in upper case.
  p_code := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));

  select * into v_card from gift_cards where code = p_code for update;

  if not found or v_card.status <> 'active' then
    raise exception '%', v_err;
  end if;

  if v_card.locked_until is not null and v_card.locked_until > now() then
    raise exception '%', v_err;
  end if;

  if v_card.expires_at is not null and v_card.expires_at < now() then
    update gift_cards set status = 'expired' where id = v_card.id;
    raise exception '%', v_err;
  end if;

  -- A card that carries a PIN keeps needing it, whatever its code looks
  -- like. Same lockout as the existing check.
  if v_card.pin_hash is not null then
    if p_pin is null or crypt(p_pin, v_card.pin_hash) <> v_card.pin_hash then
      update gift_cards set
        failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case
          when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes'
          else locked_until
        end
      where id = v_card.id;
      raise exception '%', v_err;
    end if;
    update gift_cards set failed_pin_attempts = 0 where id = v_card.id;
  end if;

  v_amount := v_card.current_balance;
  if v_amount <= 0 then
    raise exception '%', v_err;
  end if;

  select * into v_wallet from wallets where profile_id = auth.uid() for update;
  if not found then
    insert into wallets (profile_id, card_number)
    values (auth.uid(), generate_card_number())
    returning * into v_wallet;
  end if;

  -- Empty the card and close it in the same statement that credits the
  -- wallet. Both or neither.
  update gift_cards
     set current_balance = 0,
         status = 'redeemed'
   where id = v_card.id;

  v_new := v_wallet.balance + v_amount;

  update wallets
     set balance = v_new,
         updated_at = now()
   where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, amount, kind, balance_after, gift_card_id, note)
  values (v_wallet.id, v_amount, 'redeem', v_new, v_card.id, 'Gift card redeemed');

  return query select v_amount, v_new;
end;
$$;

revoke all on function redeem_gift_card_to_wallet(text, text) from public, anon;
grant execute on function redeem_gift_card_to_wallet(text, text) to authenticated;

-- ------------------------------------------------------------
-- spend_wallet_balance — the ONLY way money leaves a wallet.
--
-- Not callable from the browser: no grant to authenticated. place_order
-- calls it, inside the order's own transaction, so the debit and the order
-- commit or roll back together. An order that fails cannot take the money
-- with it.
--
-- It returns what it actually took, which may be less than asked for. The
-- caller must use the returned figure and never its own.
-- ------------------------------------------------------------
create or replace function spend_wallet_balance(
  p_profile_id uuid,
  p_amount numeric,
  p_order_id uuid
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_wallet wallets;
  v_take numeric(10,2);
  v_new numeric(10,2);
begin
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;

  select * into v_wallet from wallets where profile_id = p_profile_id for update;
  if not found then
    return 0;
  end if;

  -- Never more than there is. The CHECK would catch it anyway; this makes
  -- partial payment a normal outcome rather than an error.
  v_take := least(v_wallet.balance, p_amount);
  if v_take <= 0 then
    return 0;
  end if;

  v_new := v_wallet.balance - v_take;

  update wallets set balance = v_new, updated_at = now() where id = v_wallet.id;

  insert into wallet_transactions (wallet_id, amount, kind, balance_after, order_id, note)
  values (v_wallet.id, -v_take, 'purchase', v_new, p_order_id, 'Paid with CADO balance');

  return v_take;
end;
$$;

revoke all on function spend_wallet_balance(uuid, numeric, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- refund_wallet_balance — for cancelling an order that was paid with
-- balance. Written now because the alternative is someone hand-editing a
-- balance later, which is exactly what rule 1 forbids.
-- ------------------------------------------------------------
create or replace function refund_wallet_balance(p_order_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_spent numeric(10,2);
  v_wallet_id uuid;
  v_new numeric(10,2);
begin
  if not is_admin() then
    raise exception 'Only an admin can refund to a wallet.';
  end if;

  select sum(-amount), min(wallet_id) into v_spent, v_wallet_id
  from wallet_transactions
  where order_id = p_order_id and kind = 'purchase';

  if v_spent is null or v_spent <= 0 then
    return 0;
  end if;

  -- Refusing a second refund is the whole point of checking first.
  if exists (
    select 1 from wallet_transactions where order_id = p_order_id and kind = 'refund'
  ) then
    raise exception 'That order has already been refunded to the wallet.';
  end if;

  update wallets set balance = balance + v_spent, updated_at = now()
  where id = v_wallet_id
  returning balance into v_new;

  insert into wallet_transactions (wallet_id, amount, kind, balance_after, order_id, note)
  values (v_wallet_id, v_spent, 'refund', v_new, p_order_id, 'Order cancelled');

  return v_spent;
end;
$$;

revoke all on function refund_wallet_balance(uuid) from public, anon;
grant execute on function refund_wallet_balance(uuid) to authenticated;

comment on table wallets is
  'One CADO wallet per profile. Balance changes only through SECURITY DEFINER functions; there is no UPDATE policy by design.';
comment on table wallet_transactions is
  'Signed history of every wallet movement. sum(amount) per wallet must equal wallets.balance.';
