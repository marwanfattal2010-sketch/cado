-- STORE OWNER: PAUSE AND RESUME MY OWN STORE (§5.7).
--
-- NOT APPLIED BY THE DASHBOARD WORK THAT ADDED IT. This file changes a
-- security trigger and therefore wants a review before it is run. Until it is
-- applied, the dashboard's pause button reports "Pausing isn't switched on for
-- your account yet" and writes nothing — it fails closed, not open.
--
-- ---------------------------------------------------------------------------
-- WHY A FUNCTION AND NOT A PLAIN UPDATE
--
-- 0026_lock_privilege_columns.sql pins partners.status with a BEFORE UPDATE
-- trigger, because a partner who can set their own status can self-approve out
-- of 'pending' and un-suspend themselves. That lock is correct and stays.
--
-- But "let me put my shop on hold for a week" is a legitimate thing for a shop
-- owner to do, and it is the SAME column. So rather than widening the trigger's
-- rule (which would have to reason about which transitions are safe from
-- inside a generic column guard), the trigger gains ONE narrow escape hatch
-- that only this function can open:
--
--   * the exception is keyed on a transaction-local GUC, set with
--     set_config(..., is_local => true). PostgREST runs each request in one
--     transaction, so the flag cannot outlive the call that set it.
--   * the flag is only ever set inside store_set_own_pause(), which is
--     SECURITY DEFINER and validates the caller itself. There is no RPC that
--     lets a client call set_config directly.
--   * even with the flag set, the trigger still only permits active <-> paused.
--     Every other status transition, and every other locked column (id, slug,
--     commission_rate), is rejected exactly as before.
--
-- Net effect: a store owner can pause and resume. Nobody gains the ability to
-- self-approve, un-suspend, take another store's slug, or zero their own
-- commission.
-- ---------------------------------------------------------------------------

-- 1. The trigger, re-stated in full with the one exception added. Every other
--    check is byte-for-byte the rule from 0026.
create or replace function enforce_partner_privilege_columns() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pause_ok boolean := coalesce(
    current_setting('cado.pause_transition', true) = '1', false
  );
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'partner id cannot be changed';
  end if;
  if new.slug is distinct from old.slug then
    raise exception 'store slug can only be changed by CADO';
  end if;

  if new.status is distinct from old.status then
    -- The escape hatch: set only by store_set_own_pause(), and only ever wide
    -- enough for the two statuses a shop owner controls.
    if not (
      v_pause_ok
      and old.status in ('active', 'paused')
      and new.status in ('active', 'paused')
    ) then
      raise exception 'store status can only be changed by CADO';
    end if;
  end if;

  if new.commission_rate is distinct from old.commission_rate then
    raise exception 'commission rate can only be changed by CADO';
  end if;

  return new;
end;
$$;

drop trigger if exists partners_enforce_privilege_columns on partners;
create trigger partners_enforce_privilege_columns
  before update on partners
  for each row execute procedure enforce_partner_privilege_columns();

-- 2. The only caller. Derives the store from auth.uid() — it takes no partner
--    id, so there is nothing for a client to substitute.
create or replace function store_set_own_pause(p_paused boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid;
  v_current text;
  v_next text;
begin
  select p.partner_id into v_partner
    from profiles p
   where p.id = auth.uid()
     and p.role = 'partner'
     and p.partner_id is not null;

  if v_partner is null then
    raise exception 'only a store account can pause a store';
  end if;

  -- Row lock: two taps arriving together resolve one after the other rather
  -- than racing on read-then-write.
  select pa.status into v_current from partners pa where pa.id = v_partner for update;

  if v_current is null then
    raise exception 'store not found';
  end if;
  if v_current not in ('active', 'paused') then
    raise exception 'only an active or paused store can be paused or resumed';
  end if;

  v_next := case when p_paused then 'paused' else 'active' end;
  if v_next = v_current then
    return v_current;              -- idempotent: pausing a paused store is a no-op
  end if;

  perform set_config('cado.pause_transition', '1', true);
  update partners set status = v_next where id = v_partner;
  perform set_config('cado.pause_transition', '0', true);

  return v_next;
end;
$$;

revoke all on function store_set_own_pause(boolean) from public;
grant execute on function store_set_own_pause(boolean) to authenticated;

comment on function store_set_own_pause(boolean) is
  'Store owner pauses/resumes their OWN store. Moves partners.status between active and paused only; every other status and column stays locked by enforce_partner_privilege_columns(). Audited by partners_audit (0030).';
