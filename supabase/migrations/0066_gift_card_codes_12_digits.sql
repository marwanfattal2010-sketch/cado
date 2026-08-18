-- ============================================================
-- 0066 — GIFT CARD CODES: TWELVE DIGITS, SHOWN AS XXXX-XXXX-XXXX
--
-- One function is recreated. Everything that mints a card —
-- issue_gift_card_internal and the pool issue path — already calls
-- generate_gift_card_code(), so they inherit the new format with no change
-- of their own.
--
-- THIS ALSO REPAIRS A REGRESSION 0063 INTRODUCED. 0011's generator drew
-- from gen_random_bytes — the OS CSPRNG — with the comment "never
-- Math.random()". 0063 replaced it with plpgsql random(), which is a
-- seeded PRNG, while cutting codes to nine digits. Codes are bearer-ish
-- secrets (rate limiting is the other half of the defence); they go back
-- to the CSPRNG here and stay there.
--
-- WHY TWELVE DIGITS IS ENOUGH: a trillion combinations behind
-- check_rate_limit's five-attempts-a-minute. The number that matters is
-- combinations ÷ guess rate, and at this rate brute force does not finish
-- in lifetimes. Digits-only because the code gets read over the phone and
-- typed from paper: no 0/O confusion class at all.
--
-- OLD CODES KEEP WORKING FOREVER, and nothing here touches them:
--   * no existing row is modified;
--   * redeem_gift_card_to_wallet normalises input (strips spaces/dashes,
--     uppercases) and looks the code up as stored — a 20-character code
--     matches exactly as before;
--   * place_order's gift-card path does the same lookup;
--   * NO length CHECK constraint is added. Migration 0041 (NOT_APPLIED)
--     already records why bounding code length belongs in the function
--     body, not a constraint — and any future bound must accept BOTH
--     12-digit and 20-character codes.
--
-- Additive only. Safe to apply before the matching frontend deploys, and
-- per the 0046 lesson the two happen in the same window anyway.
-- ============================================================

create or replace function generate_gift_card_code() returns text
language plpgsql as $$
declare
  v_code text;
  v_bytes bytea;
  v_num numeric;
begin
  loop
    -- Twelve digits from the OS CSPRNG: six bytes is 2^48 ≈ 2.8e14, far
    -- above 1e12, so modulo bias across a trillion buckets is negligible.
    v_bytes := gen_random_bytes(6);
    v_num := (get_byte(v_bytes, 0)::numeric * 1099511627776) -- 2^40
           + (get_byte(v_bytes, 1)::numeric * 4294967296)    -- 2^32
           + (get_byte(v_bytes, 2)::numeric * 16777216)      -- 2^24
           + (get_byte(v_bytes, 3)::numeric * 65536)
           + (get_byte(v_bytes, 4)::numeric * 256)
           + (get_byte(v_bytes, 5)::numeric);
    v_code := lpad((v_num % 1000000000000)::text, 12, '0');
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;
  return v_code;
end;
$$;

comment on function generate_gift_card_code() is
  'Twelve CSPRNG digits, shown to people as XXXX-XXXX-XXXX. Older 20-character codes remain valid; redemption normalises and matches as stored.';
