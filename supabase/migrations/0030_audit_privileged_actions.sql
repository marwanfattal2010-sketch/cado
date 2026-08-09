-- audit_log only ever recorded gift card events. Everything else a partner or
-- an admin can do to money or access happened silently: a price rewritten, a
-- store suspended or approved, a commission rate moved, a partner_id granted.
-- If any of those is ever done maliciously — or by mistake — there is
-- currently nothing to look at afterwards.
--
-- These triggers are AFTER, so they only record changes that actually
-- committed, and they are deliberately narrow: only the columns where a
-- change means money or access moved. Logging every column of every update
-- would bury the rows that matter.
--
-- audit_log has no INSERT policy for anyone (0011, and 0013 removed even the
-- admin SELECT), so these SECURITY DEFINER triggers are the only writers and
-- nothing but the service role can read them back.

-- ============================================================
-- partners: approval state, commission, identity
-- ============================================================
create or replace function audit_partner_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     or new.commission_rate is distinct from old.commission_rate
     or new.slug is distinct from old.slug
     or new.name is distinct from old.name
  then
    insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
    values (
      coalesce(auth.uid()::text, 'service_role'),
      'partner_updated', 'partners', new.id::text,
      jsonb_build_object('status', old.status, 'commission_rate', old.commission_rate,
                         'slug', old.slug, 'name', old.name),
      jsonb_build_object('status', new.status, 'commission_rate', new.commission_rate,
                         'slug', new.slug, 'name', new.name)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists partners_audit on partners;
create trigger partners_audit
  after update on partners
  for each row execute procedure audit_partner_changes();

-- ============================================================
-- profiles: who got made an admin, who got given a store
-- ============================================================
create or replace function audit_profile_privilege_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role or new.partner_id is distinct from old.partner_id then
    insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
    values (
      coalesce(auth.uid()::text, 'service_role'),
      'profile_privilege_changed', 'profiles', new.id::text,
      jsonb_build_object('role', old.role, 'partner_id', old.partner_id),
      jsonb_build_object('role', new.role, 'partner_id', new.partner_id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_audit_privilege on profiles;
create trigger profiles_audit_privilege
  after update on profiles
  for each row execute procedure audit_profile_privilege_changes();

-- ============================================================
-- products: price and availability
-- ============================================================
-- Deliberately not logging stock_quantity: place_order decrements it on every
-- single order and the ledger already records those. This is for someone
-- changing what a thing costs or making it disappear.
create or replace function audit_product_price_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.price is distinct from old.price
     or new.gift_wrap_price is distinct from old.gift_wrap_price
     or new.is_active is distinct from old.is_active
  then
    insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
    values (
      coalesce(auth.uid()::text, 'service_role'),
      'product_price_changed', 'products', new.id::text,
      jsonb_build_object('price', old.price, 'gift_wrap_price', old.gift_wrap_price,
                         'is_active', old.is_active),
      jsonb_build_object('price', new.price, 'gift_wrap_price', new.gift_wrap_price,
                         'is_active', new.is_active)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists products_audit_price on products;
create trigger products_audit_price
  after update on products
  for each row execute procedure audit_product_price_changes();

-- ============================================================
-- store_payables: marking money as paid out
-- ============================================================
create or replace function audit_payable_status_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or new.net_owed is distinct from old.net_owed then
    insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
    values (
      coalesce(auth.uid()::text, 'service_role'),
      'payable_updated', 'store_payables', new.id::text,
      jsonb_build_object('status', old.status, 'net_owed', old.net_owed),
      jsonb_build_object('status', new.status, 'net_owed', new.net_owed)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists store_payables_audit on store_payables;
create trigger store_payables_audit
  after update on store_payables
  for each row execute procedure audit_payable_status_changes();
