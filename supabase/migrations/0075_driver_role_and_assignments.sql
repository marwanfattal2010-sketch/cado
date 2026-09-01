-- 0075: drivers become real users, and delivery status stops being the admin's
-- job.
--
-- Marwan's objection: "why would I mark as delivered? I'm the admin." Correct.
-- The person who knows a parcel was handed over is the person who handed it
-- over. So:
--
--   store owner  -> ready        (the parcel is packed and waiting)
--   driver       -> out_for_delivery, then delivered
--   admin        -> assigns a driver, and can override with a REASON that is
--                   written to the audit trail
--
-- ON THE STATUS NAMES. The spec asks for confirmed / ready_for_pickup /
-- picked_up / delivered. The live vocabulary is already
-- pending / accepted / preparing / ready / out_for_delivery / delivered /
-- cancelled, and it means the same things: accepted IS confirmed, ready IS
-- ready-for-pickup, out_for_delivery IS picked-up. Renaming them would rewrite
-- a column that place_order(), the storefront's order tracking, the store
-- dashboard and 29 existing orders all depend on — a destructive change to the
-- order path in exchange for nicer words. The names stay; the UI carries the
-- clearer labels. This is a deliberate deviation from the spec, recorded here.

-- ------------------------------------------------------------- the role ----
-- profiles.role is 'customer' | 'partner' | 'admin' (0001). Drivers are a
-- fourth kind of person, and giving them any existing role would hand them
-- that role's access.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check' and conrelid = 'profiles'::regclass
  ) then
    alter table profiles drop constraint profiles_role_check;
  end if;
end $$;
alter table profiles
  add constraint profiles_role_check check (role in ('customer','partner','admin','driver'));

-- The audit trail needs to be able to say a driver did something.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'order_events_actor_role' and conrelid = 'order_events'::regclass
  ) then
    alter table order_events drop constraint order_events_actor_role;
  end if;
end $$;
alter table order_events
  add constraint order_events_actor_role
  check (actor_role in ('system','customer','partner','admin','driver'));

-- ---------------------------------------------------------- driver rows ----
-- drivers already exists (0068) as a plain contact list. It gains a link to a
-- real login and a vehicle note. profile_id stays NULLABLE: a driver CADO
-- phones but who has no app login is still a driver.
alter table drivers
  add column if not exists profile_id uuid references profiles(id) on delete set null,
  add column if not exists vehicle text;

create unique index if not exists drivers_profile_id_key on drivers(profile_id)
  where profile_id is not null;

-- ------------------------------------------------------ the assignment -----
-- 0068's `deliveries` keys on ORDER. That is wrong for CADO: one order can
-- span several stores, each with its own parcel and its own pickup address, so
-- the unit a driver collects is the SUB-ORDER. deliveries is left untouched
-- (it holds no rows) and this is the table the board uses.
create table if not exists delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid not null unique references sub_orders(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete restrict,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cost numeric(10,2)
);

create index if not exists delivery_assignments_driver_idx on delivery_assignments(driver_id);

alter table delivery_assignments enable row level security;

-- Admins run dispatch.
create policy assignments_admin on delivery_assignments for all
  using (is_admin()) with check (is_admin());

-- A driver sees ONLY their own assignments. Note this is a read policy: the
-- status transition itself goes through driver_set_delivery_status() below, so
-- a driver never writes sub_orders directly.
create policy assignments_own_driver on delivery_assignments for select
  using (
    exists (
      select 1 from drivers d
      where d.id = delivery_assignments.driver_id
        and d.profile_id = auth.uid()
    )
  );

-- The store whose parcel it is can see who is collecting it.
create policy assignments_partner on delivery_assignments for select
  using (
    exists (
      select 1 from sub_orders so
      where so.id = delivery_assignments.sub_order_id
        and so.partner_id = my_partner_id()
    )
  );

-- ------------------------------------------------- the driver's two taps ---
-- The only way a driver moves an order. Derives the driver from auth.uid(), so
-- there is no id for a client to substitute, and permits exactly two
-- transitions in one direction.
create or replace function driver_set_delivery_status(p_sub_order_id uuid, p_status text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_driver uuid;
  v_current text;
begin
  if p_status not in ('out_for_delivery','delivered') then
    raise exception 'a driver can only mark picked up or delivered';
  end if;

  select d.id into v_driver
    from drivers d
   where d.profile_id = auth.uid() and d.active;
  if v_driver is null then
    raise exception 'not an active driver';
  end if;

  -- Must be THIS driver's assignment.
  if not exists (
    select 1 from delivery_assignments a
     where a.sub_order_id = p_sub_order_id and a.driver_id = v_driver
  ) then
    raise exception 'that delivery is not assigned to you';
  end if;

  select so.status into v_current from sub_orders so where so.id = p_sub_order_id for update;

  -- Forward only. A delivered parcel cannot become undelivered by a mis-tap.
  if p_status = 'out_for_delivery' and v_current <> 'ready' then
    raise exception 'the store has not marked this ready for pickup yet';
  end if;
  if p_status = 'delivered' and v_current <> 'out_for_delivery' then
    raise exception 'mark it picked up first';
  end if;

  update sub_orders set status = p_status, updated_at = now() where id = p_sub_order_id;

  update delivery_assignments
     set picked_up_at = case when p_status = 'out_for_delivery' then now() else picked_up_at end,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end
   where sub_order_id = p_sub_order_id;

  insert into order_events (sub_order_id, order_id, partner_id, actor_id, actor_role,
                            event_type, from_status, to_status)
  select p_sub_order_id, so.order_id, so.partner_id, auth.uid(), 'driver',
         'status_change', v_current, p_status
    from sub_orders so where so.id = p_sub_order_id;

  return p_status;
end;
$$;

revoke all on function driver_set_delivery_status(uuid, text) from public, anon;
grant execute on function driver_set_delivery_status(uuid, text) to authenticated;

-- --------------------------------------------- what a driver may read ------
-- A driver needs the drop-off address and the store's pickup details for the
-- parcels assigned to them, and nothing else in the system. Rather than open
-- sub_orders/orders to the driver role, one function returns exactly the round.
create or replace function driver_my_deliveries()
returns table (
  sub_order_id uuid,
  order_number text,
  status text,
  store_name text,
  pickup_address text,
  store_phone text,
  recipient_name text,
  recipient_phone text,
  drop_off text,
  items bigint,
  cod_amount numeric
)
language sql stable security definer set search_path = public as $$
  select
    so.id,
    o.order_number,
    so.status,
    pa.name,
    pa.pickup_address,
    coalesce(pa.driver_contact, pa.phone),
    o.recipient_name,
    o.recipient_phone,
    -- Enough for a driver to actually find the door.
    nullif(concat_ws(', ', nullif(a.street,''), nullif(a.building,''), nullif(a.area,''), a.city), ''),
    (select count(*) from order_items oi where oi.sub_order_id = so.id),
    -- Cash to collect: only when the order is unpaid cash on delivery.
    case when o.payment_method = 'cod' and o.payment_status = 'unpaid' then so.total else 0 end
  from delivery_assignments da
  join drivers d on d.id = da.driver_id and d.profile_id = auth.uid()
  join sub_orders so on so.id = da.sub_order_id
  join orders o on o.id = so.order_id
  left join addresses a on a.id = o.delivery_address_id
  join partners pa on pa.id = so.partner_id
  where so.status in ('ready','out_for_delivery')
  order by so.status desc, o.created_at
$$;

revoke all on function driver_my_deliveries() from public, anon;
grant execute on function driver_my_deliveries() to authenticated;

comment on function driver_my_deliveries() is
  'A driver''s round for today. Returns only parcels assigned to the calling driver — the driver role has no direct read on orders or sub_orders.';
