-- PRIVILEGE ESCALATION FIX.
--
-- Two write paths let an ordinary logged-in customer promote themselves.
-- Both are direct PostgREST writes — no RPC involved — so RLS was the only
-- thing standing in the way, and RLS was checking the wrong columns.
--
-- 1. profiles
--    The policy from 0001 is:
--        for update using (id = auth.uid())
--        with check (id = auth.uid() and role = (select role from profiles ...))
--    It pins `role`. It does NOT pin `partner_id`. Partner ids are public
--    (`public reads active partners`), so any customer could run
--        PATCH /rest/v1/profiles?id=eq.<their own id>  {"partner_id": "<any store>"}
--    and my_partner_id() would start returning that store. That hands them,
--    via the existing partner policies:
--      - "partner manages own products" (FOR ALL) — edit or delete that
--        store's products, including rewriting prices
--      - "partner updates own sub_orders" — move other people's orders
--        through the delivery statuses
--      - "partner updates own row" on partners — see below
--      - write access to that partner's storage folder
--      - read access to that partner's inactive products
--
-- 2. partners
--    "partner updates own row" is FOR UPDATE with no column restriction, so
--    a partner (or anyone who just granted themselves partner_id above) could
--    set their own commission_rate to 0 — CADO then earns nothing on every
--    order from that store, silently — or flip their own status to 'active'
--    to self-approve, or take another store's slug.
--
-- Fixed with triggers rather than by rewriting the policies, because a
-- BEFORE UPDATE trigger sees OLD and NEW directly. A WITH CHECK expression
-- can only see NEW plus a subquery, and subquery-against-the-same-table is
-- exactly the pattern that made this bug easy to get wrong the first time.
--
-- `auth.uid() is null` is treated as trusted: that is the service role or a
-- direct psql session, both of which are already fully privileged and are how
-- the owner legitimately assigns a partner_id to a store's account. The anon
-- role also has a null uid but cannot reach these rows at all — every UPDATE
-- policy on profiles requires id = auth.uid(), which never matches for anon.

-- ============================================================
-- profiles: role and partner_id are assigned to you, never chosen by you
-- ============================================================
create or replace function enforce_profile_privilege_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed';
  end if;
  if new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_privilege_columns on profiles;
create trigger profiles_enforce_privilege_columns
  before update on profiles
  for each row execute procedure enforce_profile_privilege_columns();

-- ============================================================
-- partners: a store owner edits how the store looks, not what it earns
-- ============================================================
create or replace function enforce_partner_privilege_columns() returns trigger
language plpgsql security definer set search_path = public as $$
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
    raise exception 'store status can only be changed by CADO';
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

-- ============================================================
-- Belt and braces on profiles: keep the existing WITH CHECK but state the
-- partner_id rule there too, so the policy reads honestly on its own without
-- a reader having to know the trigger exists.
-- ============================================================
drop policy if exists "user updates own profile" on profiles;
create policy "user updates own profile" on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from profiles p where p.id = auth.uid())
    and partner_id is not distinct from (select p.partner_id from profiles p where p.id = auth.uid())
  );
