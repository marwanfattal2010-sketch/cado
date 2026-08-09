-- Extend the existing rate limiter instead of adding new infrastructure.
--
-- What was covered before this migration: gift_card_check and
-- gift_card_redeem, both keyed on the client IP only. Checkout itself
-- (place_order) and gift card *purchase* were not limited at all — someone
-- with a valid session could fire orders or mint pending_payment cards as
-- fast as the network allows.
--
-- Two honest limits on what a limiter living in Postgres can do:
--
--   * Login, signup and password reset never reach this database function.
--     They are handled by Supabase Auth (GoTrue) before Postgres is involved,
--     so they can only be limited by Supabase's own auth rate limits
--     (Dashboard > Authentication > Rate Limits) and, if you want a real
--     bot gate, a captcha configured there. Nothing in this file affects them.
--
--   * Keying on auth.uid() gives a strong per-account limit but does nothing
--     against an attacker who is not logged in, or who registers many
--     accounts. The IP key covers some of that, but IP comes from
--     x-forwarded-for, and mobile carriers in Lebanon NAT large numbers of
--     genuine users behind one address — so the per-IP ceiling has to stay
--     loose enough not to lock out a whole neighbourhood. It is a speed bump,
--     not a wall.
--
-- Neither limit is applied by editing place_order() or purchase_gift_card().
-- Those are the money functions and are under active development; a BEFORE
-- INSERT trigger on the table each one writes achieves the same thing without
-- touching either signature or body.

-- ============================================================
-- 1. Key on the account as well as the IP, and stop the table growing forever
-- ============================================================
alter table gift_card_rate_limit add column if not exists subject text;
update gift_card_rate_limit set subject = ip_address where subject is null;

create index if not exists gift_card_rate_limit_subject_lookup
  on gift_card_rate_limit (subject, endpoint, created_at desc);

create or replace function check_rate_limit(p_endpoint text, p_max_per_minute int default 5) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ip text := current_client_ip();
  v_subject text := coalesce(auth.uid()::text, v_ip);
  v_count int;
begin
  -- Nothing was ever deleting from this table. Prune opportunistically rather
  -- than on a schedule (no pg_cron on this project): roughly one call in a
  -- hundred pays for the cleanup, everything older than an hour is far past
  -- any window we measure.
  if random() < 0.01 then
    delete from gift_card_rate_limit where created_at < now() - interval '1 hour';
  end if;

  -- Per account (or per IP when there's no session). This is the limit that
  -- actually bites, because every endpoint that calls this requires a login.
  select count(*) into v_count
  from gift_card_rate_limit
  where subject = v_subject
    and endpoint = p_endpoint
    and created_at > now() - interval '1 minute';

  if v_count >= p_max_per_minute then
    raise exception 'Too many attempts. Please wait a moment and try again.';
  end if;

  -- Per IP, deliberately six times looser: shared wifi and carrier NAT mean
  -- several real customers can share one address.
  if v_ip <> 'unknown' and v_subject <> v_ip then
    select count(*) into v_count
    from gift_card_rate_limit
    where ip_address = v_ip
      and endpoint = p_endpoint
      and created_at > now() - interval '1 minute';

    if v_count >= p_max_per_minute * 6 then
      raise exception 'Too many attempts. Please wait a moment and try again.';
    end if;
  end if;

  insert into gift_card_rate_limit (ip_address, endpoint, subject)
  values (v_ip, p_endpoint, v_subject);
end;
$$;

-- ============================================================
-- 2. Checkout
-- ============================================================
-- orders has had no client-facing INSERT policy since 0010, so the only thing
-- that reaches this trigger is place_order() itself.
create or replace function rate_limit_new_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform check_rate_limit('place_order', 5);
  return new;
end;
$$;

drop trigger if exists orders_rate_limit on orders;
create trigger orders_rate_limit
  before insert on orders
  for each row execute procedure rate_limit_new_order();

-- ============================================================
-- 3. Gift card purchase
-- ============================================================
-- Every card starts as pending_payment and is worthless until an admin
-- confirms the transfer, so this is not a theft risk — it is a junk-rows and
-- admin-queue-flooding risk. Three a minute is well above any real buyer.
create or replace function rate_limit_gift_card_purchase() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform check_rate_limit('gift_card_purchase', 3);
  return new;
end;
$$;

drop trigger if exists gift_cards_rate_limit on gift_cards;
create trigger gift_cards_rate_limit
  before insert on gift_cards
  for each row execute procedure rate_limit_gift_card_purchase();
