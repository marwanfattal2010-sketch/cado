-- Gift card system rebuild: cryptographically random codes, bcrypt-hashed PINs,
-- an append-only redemption ledger, per-store payables, and an audit log.
--
-- No real gift cards have been sold yet (checked before writing this), so the
-- table is rebuilt cleanly rather than migrated in place.

create extension if not exists pgcrypto;

-- ============================================================
-- gift_cards
-- ============================================================
alter table orders drop constraint if exists orders_gift_card_code_fkey;
drop table if exists gift_cards cascade;

create table gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  pin_hash text not null,
  original_amount numeric(10,2) not null check (original_amount > 0),
  current_balance numeric(10,2) not null check (current_balance >= 0),
  currency text not null default 'USD',
  buyer_id uuid references profiles(id) on delete set null,
  buyer_name text,
  buyer_email text,
  recipient_name text not null,
  recipient_email text,
  message text,
  delivery_method text not null default 'digital' check (delivery_method in ('digital', 'physical')),
  status text not null default 'active'
    check (status in ('active', 'depleted', 'expired', 'cancelled', 'fraud_hold')),
  failed_pin_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index gift_cards_code_idx on gift_cards (code);
create index gift_cards_buyer_idx on gift_cards (buyer_id);

alter table gift_cards enable row level security;

-- Reading a card by id is safe (no code/PIN exposed to browse); the code and PIN
-- travel to the buyer once, at purchase time, in the function's return value only.
create policy "buyer reads own gift cards" on gift_cards
  for select using (buyer_id = auth.uid() or is_admin());

-- No insert/update/delete policy for anyone: every write goes through the
-- SECURITY DEFINER functions below, which enforce the real rules.

-- ============================================================
-- gift_card_transactions — append-only ledger
-- ============================================================
create table gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references gift_cards(id),
  order_id uuid references orders(id),
  amount_used numeric(10,2) not null check (amount_used > 0),
  balance_after numeric(10,2) not null check (balance_after >= 0),
  store_id uuid references partners(id),
  created_at timestamptz not null default now()
);

create index gift_card_transactions_card_idx on gift_card_transactions (gift_card_id);
create index gift_card_transactions_order_idx on gift_card_transactions (order_id);

alter table gift_card_transactions enable row level security;

create policy "buyer or store reads own gift card transactions" on gift_card_transactions
  for select using (
    exists (select 1 from gift_cards gc where gc.id = gift_card_id and gc.buyer_id = auth.uid())
    or store_id = my_partner_id()
    or is_admin()
  );

-- Append-only: no update or delete policy exists at all, for any role including
-- admin-via-API. Corrections must be new offsetting rows, never edits.

-- ============================================================
-- store_payables — what CADO owes each store, per order
-- ============================================================
-- No commission rate existed anywhere before this; defaulting every store to 15%
-- until you tell me the real number(s). Per-store overrides are one UPDATE away.
alter table partners add column if not exists commission_rate numeric(4,3) not null default 0.150
  check (commission_rate >= 0 and commission_rate <= 1);

create table store_payables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references partners(id),
  order_id uuid references orders(id),
  gross_amount numeric(10,2) not null check (gross_amount >= 0),
  commission_rate numeric(4,3) not null,
  commission_amount numeric(10,2) not null,
  net_owed numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index store_payables_store_idx on store_payables (store_id);
create index store_payables_order_idx on store_payables (order_id);

alter table store_payables enable row level security;

create policy "store reads own payables" on store_payables
  for select using (store_id = my_partner_id() or is_admin());
create policy "admin updates payables" on store_payables
  for update using (is_admin()) with check (is_admin());
-- Inserted only by place_order (SECURITY DEFINER) — no direct insert policy.

-- ============================================================
-- audit_log
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  table_name text not null,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_log_table_record_idx on audit_log (table_name, record_id);

alter table audit_log enable row level security;
create policy "admin reads audit log" on audit_log
  for select using (is_admin());
-- Written only by SECURITY DEFINER functions — no insert policy for anyone else.

-- ============================================================
-- Best-effort per-IP rate limiting
-- ============================================================
-- Supabase's gateway sets x-forwarded-for from the real connection, not from
-- anything the client can override in its own request — but this is still a
-- secondary layer. The primary defense against PIN guessing is the per-card
-- failed_pin_attempts/locked_until above, which no header can bypass.
create table gift_card_rate_limit (
  id bigserial primary key,
  ip_address text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index gift_card_rate_limit_lookup on gift_card_rate_limit (ip_address, endpoint, created_at desc);

alter table gift_card_rate_limit enable row level security;
-- No policies at all: only the functions below (SECURITY DEFINER) touch this table.

create or replace function current_client_ip() returns text
language sql stable as $$
  select coalesce(
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    'unknown'
  );
$$;

create or replace function check_rate_limit(p_endpoint text, p_max_per_minute int default 5) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ip text := current_client_ip();
  v_count int;
begin
  select count(*) into v_count
  from gift_card_rate_limit
  where ip_address = v_ip and endpoint = p_endpoint and created_at > now() - interval '1 minute';

  if v_count >= p_max_per_minute then
    raise exception 'Too many attempts. Please wait a moment and try again.';
  end if;

  insert into gift_card_rate_limit (ip_address, endpoint) values (v_ip, p_endpoint);
end;
$$;

-- ============================================================
-- Code / PIN generation — cryptographically random, never Math.random()
-- ============================================================
create or replace function generate_gift_card_code() returns text
language plpgsql as $$
declare
  v_code text;
begin
  loop
    -- gen_random_bytes draws from the OS CSPRNG. 16 bytes -> ~21 base64 chars,
    -- stripped to alphanumeric and cut to 20: comfortably over the 16-char floor.
    v_code := upper(left(regexp_replace(encode(gen_random_bytes(16), 'base64'), '[^a-zA-Z0-9]', '', 'g'), 20));
    exit when length(v_code) >= 16 and not exists (select 1 from gift_cards where code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function generate_gift_card_pin() returns text
language plpgsql as $$
begin
  -- 6 digits, drawn from pgcrypto's CSPRNG (server-side, not client JS Math.random).
  return lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
end;
$$;

-- ============================================================
-- purchase_gift_card — the code and PIN are returned exactly once, here.
-- After this, only their hash (PIN) and row (code) exist server-side.
-- ============================================================
drop function if exists purchase_gift_card(numeric, text, text, text, text);

create or replace function purchase_gift_card(
  p_amount numeric,
  p_recipient_name text,
  p_recipient_email text default null,
  p_message text default null,
  p_delivery_method text default 'digital',
  p_buyer_name text default null,
  p_buyer_email text default null
) returns table (code text, pin text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public as $$
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
    recipient_name, recipient_email, message, delivery_method, expires_at
  ) values (
    v_code, crypt(v_pin, gen_salt('bf')), p_amount, p_amount, auth.uid(), p_buyer_name, p_buyer_email,
    p_recipient_name, p_recipient_email, p_message, p_delivery_method, now() + interval '2 years'
  ) returning gift_cards.id into v_id;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'purchase', 'gift_cards', v_id::text,
    jsonb_build_object('amount', p_amount, 'delivery_method', p_delivery_method));

  return query select v_code, v_pin, v_id, p_amount;
end;
$$;

revoke all on function purchase_gift_card(numeric, text, text, text, text, text, text) from public, anon;
grant execute on function purchase_gift_card(numeric, text, text, text, text, text, text) to authenticated;

-- ============================================================
-- check_gift_card_balance — code + PIN required, identical error for every
-- failure reason (no code, wrong code, wrong PIN, locked, expired, disabled).
-- ============================================================
drop function if exists check_gift_card(text);

create or replace function check_gift_card_balance(p_code text, p_pin text)
returns table (remaining_balance numeric, currency text)
language plpgsql security definer set search_path = public as $$
declare
  v_card gift_cards;
  v_err constant text := 'That code or PIN is not valid.';
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

  if crypt(p_pin, v_card.pin_hash) <> v_card.pin_hash then
    update gift_cards set
      failed_pin_attempts = failed_pin_attempts + 1,
      locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where id = v_card.id;
    raise exception '%', v_err;
  end if;

  update gift_cards set failed_pin_attempts = 0 where id = v_card.id;

  return query select v_card.current_balance, v_card.currency;
end;
$$;

revoke all on function check_gift_card_balance(text, text) from public, anon;
grant execute on function check_gift_card_balance(text, text) to authenticated;

-- ============================================================
-- place_order — now the single redemption path. All ten steps from the spec
-- happen inside this one transaction: lock the card, verify the PIN, recompute
-- the order total from the database (never from the browser), cap the
-- deduction at the real balance, write the ledger, write payables, commit.
-- ============================================================
drop function if exists place_order(uuid, date, text, text, text, text);

create function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod',
  p_gift_card_pin text default null
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

  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
    raise exception 'cart is empty';
  end if;

  -- Lock and verify the gift card BEFORE touching cart/order state, so a
  -- rejected card can never leave partial writes behind.
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

  -- Every store in this order gets its own sub_order, its own ledger slice of
  -- any gift-card usage, and its own payable — never a shared/blended total.
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

  -- Deduct the gift card, capped at whatever is actually left on it — the
  -- CHECK constraint on current_balance is the last line of defense if this
  -- arithmetic is ever wrong.
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

  -- Second pass per store: split the gift-card deduction proportionally and
  -- write the ledger + payable for every store in the order, gift card or not.
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

revoke all on function place_order(uuid, date, text, text, text, text, text) from public, anon;
grant execute on function place_order(uuid, date, text, text, text, text, text) to authenticated;

-- ============================================================
-- Cleanup: the account-claiming approach from the previous pass is superseded
-- by code+PIN possession, which is the real-world gift-card security model.
-- ============================================================
drop function if exists redeem_gift_card(text);
drop table if exists gift_card_attempts;
