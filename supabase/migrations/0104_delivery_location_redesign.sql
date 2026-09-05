-- 0104: the delivery-location redesign — pin, saved addresses, voice, photos.
--
-- WHICH TABLE. There are two in this database and only one of them is real:
--
--   `addresses`      (0001) is what checkout writes and what place_order
--                    validates `p_delivery_address_id` against. Orders
--                    reference it. This is the one.
--   `user_addresses` (0083) is what the old DeliverySheet wrote to. Nothing
--                    downstream reads it — an address saved there could never
--                    become an order.
--
-- So this extends `addresses`. `user_addresses` is left in place, untouched
-- and unreferenced, rather than dropped: it holds rows real people typed, and
-- 0105 can migrate them once someone has looked at them. Nothing in the app
-- reads it after this batch.
--
-- REUSING COLUMNS RATHER THAN ADDING SYNONYMS. The spec asked for `lat`/`lng`
-- and `area_street`; the table already has `latitude`/`longitude`
-- numeric(9,6) and `area`/`street`. Two columns meaning the same thing is how
-- a table starts disagreeing with itself, so the existing ones are reused.
-- numeric(9,6) is ~11cm at this latitude, which is finer than a GPS fix.
--
-- Everything here is additive: new columns, new index, new trigger, new
-- function, new bucket. Nothing is dropped or renamed.

-- ---------------------------------------------------------------------------
-- 1. The new columns
-- ---------------------------------------------------------------------------

alter table addresses
  -- 'home' | 'work' | 'other'. The old column was free text defaulting to
  -- 'Home', and existing rows keep whatever they hold — the check is not
  -- retroactive, because a row typed months ago is not invalid, it is old.
  add column if not exists label_custom text,
  add column if not exists voice_path text,
  add column if not exists voice_seconds integer,
  add column if not exists photo_paths text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

-- The new flow never asks for a recipient name — the buyer is the recipient,
-- and gift orders carry their own recipient fields on the order. The column
-- stays NOT NULL for every existing reader; it just no longer has to be
-- supplied by an insert.
alter table addresses alter column recipient_name set default '';

comment on column addresses.label_custom is
  'Free text shown instead of the label when label = ''other'' (e.g. "Mum''s place").';
comment on column addresses.voice_path is
  'Storage path in address-media: {profile_id}/{address_id}/voice.webm. Signed on read.';
comment on column addresses.photo_paths is
  'Up to 3 storage paths in address-media, entrance/building photos.';

-- ---------------------------------------------------------------------------
-- 2. One default address per person
-- ---------------------------------------------------------------------------

-- A partial unique index, so the constraint only applies to the row that is
-- actually the default. A plain unique on (profile_id, is_default) would allow
-- exactly one NON-default address per person, which is the opposite rule.
create unique index if not exists addresses_one_default_per_profile
  on addresses (profile_id)
  where is_default;

-- Setting a new default clears the old one. This is a BEFORE trigger so the
-- clear lands before the unique index above is checked; as an AFTER trigger
-- the index would reject the insert before we ever got to run.
create or replace function addresses_clear_other_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update addresses
       set is_default = false, updated_at = now()
     where profile_id = new.profile_id
       and id <> new.id
       and is_default;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists addresses_default_exclusive on addresses;
create trigger addresses_default_exclusive
  before insert or update on addresses
  for each row execute function addresses_clear_other_defaults();

-- ---------------------------------------------------------------------------
-- 3. Delivery zones, server side
-- ---------------------------------------------------------------------------

-- THE SAME TWO CIRCLES AS apps/web/src/lib/deliveryZones.ts, and that
-- duplication is deliberate but not free: a zone changed in one place and not
-- the other means the button is enabled in the app and the order is rejected
-- on submit. Change both, in the same commit. There is no shared source
-- because the client must answer this with no round trip while the map moves.
--
-- Haversine on a sphere. Lebanon is small enough that the ellipsoid
-- correction is under a metre over these radii.
create or replace function resolve_delivery_city(p_lat double precision, p_lng double precision)
returns table (city text, in_zone boolean)
language plpgsql
immutable
as $$
declare
  r constant double precision := 6371.0088; -- mean Earth radius, km
  z record;
  d double precision;
begin
  for z in
    select * from (values
      ('Beirut',  33.8938::double precision, 35.5018::double precision, 12::double precision),
      ('Tripoli', 34.4367::double precision, 35.8497::double precision,  8::double precision)
    ) as t(name, lat, lng, radius_km)
  loop
    d := 2 * r * asin(sqrt(
      power(sin(radians(p_lat - z.lat) / 2), 2) +
      cos(radians(z.lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - z.lng) / 2), 2)
    ));
    if d <= z.radius_km then
      city := z.name;
      in_zone := true;
      return next;
      return;
    end if;
  end loop;

  city := null;
  in_zone := false;
  return next;
end $$;

comment on function resolve_delivery_city is
  'Beirut 12km / Tripoli 8km. Mirrors apps/web/src/lib/deliveryZones.ts — change both together.';

-- ---------------------------------------------------------------------------
-- 4. An order cannot be delivered where we do not deliver
-- ---------------------------------------------------------------------------

-- A TRIGGER ON orders, not a rewrite of place_order. place_order is ~200 lines
-- and Postgres has no way to patch part of a function body, so enforcing this
-- inside it would mean reproducing the whole thing a fourth time and hoping
-- the copy stays faithful. The trigger fires from inside place_order's INSERT,
-- so place_order does reject the order — the customer sees the same sentence
-- either way — and the rule also holds for any other path that ever inserts an
-- order.
--
-- An address with no coordinates is ALLOWED through. Every row saved before
-- this migration has null lat/lng, and refusing them would break checkout for
-- everyone who already has an address saved. Only a pin we know is outside is
-- rejected.
create or replace function orders_reject_undeliverable_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  z record;
begin
  if new.delivery_address_id is null then
    return new;
  end if;

  select latitude, longitude into a from addresses where id = new.delivery_address_id;
  if not found or a.latitude is null or a.longitude is null then
    return new;
  end if;

  select * into z from resolve_delivery_city(a.latitude::double precision, a.longitude::double precision);
  if not z.in_zone then
    raise exception 'We do not deliver to that address yet — Beirut and Tripoli only for now';
  end if;

  return new;
end $$;

drop trigger if exists orders_deliverable_address on orders;
create trigger orders_deliverable_address
  before insert on orders
  for each row execute function orders_reject_undeliverable_address();

-- ---------------------------------------------------------------------------
-- 5. Storage: address-media
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('address-media', 'address-media', false)
on conflict (id) do nothing;

-- PRIVATE, and read through signed URLs only. A voice note describing how to
-- get inside someone's building, and a photograph of their front door, are
-- the two most sensitive things this app stores. A public bucket would make
-- both guessable by anyone who learned an address id.
--
-- The prefix IS the authorisation: every path starts {profile_id}/, so
-- `(storage.foldername(name))[1] = auth.uid()::text` is the whole rule.
drop policy if exists "address media: owner reads" on storage.objects;
create policy "address media: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'address-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "address media: owner writes" on storage.objects;
create policy "address media: owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'address-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "address media: owner replaces" on storage.objects;
create policy "address media: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'address-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'address-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "address media: owner deletes" on storage.objects;
create policy "address media: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'address-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 6. The order's address snapshot carries the media
-- ---------------------------------------------------------------------------

-- Orders already snapshot the address so an edit months later cannot rewrite
-- history. The driver needs the voice note and the entrance photo at the door,
-- which means they have to travel with the order too.
alter table orders
  add column if not exists delivery_voice_path text,
  add column if not exists delivery_photo_paths text[] not null default '{}';

create or replace function orders_snapshot_address_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  if new.delivery_address_id is null then
    return new;
  end if;
  select voice_path, photo_paths into a from addresses where id = new.delivery_address_id;
  if found then
    new.delivery_voice_path := a.voice_path;
    new.delivery_photo_paths := coalesce(a.photo_paths, '{}');
  end if;
  return new;
end $$;

drop trigger if exists orders_snapshot_media on orders;
create trigger orders_snapshot_media
  before insert on orders
  for each row execute function orders_snapshot_address_media();
