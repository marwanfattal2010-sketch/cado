-- 0037 — managing admin accounts from the Settings page.
--
-- profiles carries no email (it lives in auth.users, which PostgREST never
-- exposes), so listing "who is an admin" needs a definer function. Granting
-- and revoking admin flips profiles.role between 'admin' and 'customer' —
-- the 0026 trigger blocks users from touching their own role, and its
-- auth.uid() escape does not apply here, so the flip must happen inside a
-- definer function too. Both are is_admin()-gated.
--
-- Additive only.

create or replace function admin_list_admins()
returns table (user_id uuid, email text, full_name text, since timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select p.id, u.email::text, p.full_name, u.created_at
  from profiles p
  join auth.users u on u.id = p.id
  where p.role = 'admin'
  order by u.created_at;
end;
$$;

-- Grant or revoke admin by email. The account must already exist (sign up on
-- the storefront or accept an invite first) — this function changes a role,
-- it does not create logins or set passwords.
create or replace function admin_set_role_admin(p_email text, p_make_admin boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_admin_count integer;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account exists with that email. They must sign up first.';
  end if;

  if p_make_admin then
    update profiles set role = 'admin' where id = v_user;
    return 'granted';
  end if;

  -- Revoking: never remove the last admin, and never let an admin demote
  -- themselves by accident — both end with nobody holding the keys.
  if v_user = auth.uid() then
    raise exception 'You cannot revoke your own admin access.';
  end if;
  select count(*) into v_admin_count from profiles where role = 'admin';
  if v_admin_count <= 1 then
    raise exception 'Cannot remove the last admin.';
  end if;

  update profiles set role = 'customer', partner_id = null where id = v_user;
  return 'revoked';
end;
$$;

revoke all on function admin_list_admins() from public, anon;
grant execute on function admin_list_admins() to authenticated;

revoke all on function admin_set_role_admin(text, boolean) from public, anon;
grant execute on function admin_set_role_admin(text, boolean) to authenticated;
