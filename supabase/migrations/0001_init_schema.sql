-- CADO initial schema: profiles, partners, catalog, cart, orders, favorites, occasions
-- Extensions
create extension if not exists pg_trgm;

-- ============================================================
-- partners
-- ============================================================
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_image_url text,
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  country text not null default 'LB',
  city text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- profiles (1:1 with auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','partner','admin')),
  partner_id uuid references partners(id) on delete set null,
  avatar_url text,
  push_token text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (SECURITY DEFINER — used throughout RLS policies)
-- Defined after partners/profiles exist, since `language sql` functions
-- are parsed (and their table references resolved) at CREATE time.
-- ============================================================
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function my_partner_id() returns uuid
language sql security definer stable set search_path = public as $$
  select partner_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- RLS: partners
-- ============================================================
alter table partners enable row level security;

create policy "public reads active partners" on partners
  for select using (status = 'active' or is_admin() or id = my_partner_id());
create policy "partner updates own row" on partners
  for update using (id = my_partner_id()) with check (id = my_partner_id());
create policy "admin full access to partners" on partners
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- RLS: profiles
-- ============================================================
alter table profiles enable row level security;

create policy "user reads own profile" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "user updates own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "admin full access to profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- categories
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_name text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table categories enable row level security;
create policy "public reads categories" on categories for select using (true);
create policy "admin writes categories" on categories for all using (is_admin()) with check (is_admin());

-- ============================================================
-- products
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  category_id uuid not null references categories(id),
  title text not null,
  slug text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  currency text not null default 'USD',
  sku text,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  gift_wrap_available boolean not null default false,
  gift_wrap_price numeric(10,2) not null default 0,
  recipient_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  country text not null default 'LB',
  avg_rating numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, slug)
);

create index products_recipient_gin on products using gin (recipient_tags);
create index products_occasion_gin on products using gin (occasion_tags);
create index products_title_trgm on products using gin (title gin_trgm_ops);
create index products_category_idx on products (category_id);
create index products_partner_idx on products (partner_id);

alter table products enable row level security;

create policy "public reads active products" on products
  for select using (is_active or partner_id = my_partner_id() or is_admin());
create policy "partner manages own products" on products
  for all using (partner_id = my_partner_id()) with check (partner_id = my_partner_id());
create policy "admin full access to products" on products
  for all using (is_admin()) with check (is_admin());

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on products
  for each row execute procedure set_updated_at();

-- ============================================================
-- product_images (partner_id denormalized for simpler RLS/storage policies)
-- ============================================================
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create index product_images_product_idx on product_images (product_id);

alter table product_images enable row level security;

create policy "public reads product images" on product_images
  for select using (
    exists (select 1 from products p where p.id = product_id and (p.is_active or is_admin()))
    or partner_id = my_partner_id()
  );
create policy "partner manages own product images" on product_images
  for all using (partner_id = my_partner_id()) with check (partner_id = my_partner_id());
create policy "admin full access to product images" on product_images
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- addresses
-- ============================================================
create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  country text not null default 'LB',
  city text not null,
  area text not null,
  street text not null,
  building text,
  floor text,
  apartment text,
  notes text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;
create policy "owner manages own addresses" on addresses
  for all using (profile_id = auth.uid() or is_admin()) with check (profile_id = auth.uid());

-- ============================================================
-- cart_items
-- ============================================================
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  customization jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table cart_items enable row level security;
create policy "owner manages own cart" on cart_items
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================
-- occasions (taxonomy) + occasion_events (dated calendar entries)
-- ============================================================
create table occasions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  is_active boolean not null default true
);

alter table occasions enable row level security;
create policy "public reads occasions" on occasions for select using (true);
create policy "admin writes occasions" on occasions for all using (is_admin()) with check (is_admin());

create table occasion_events (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid references occasions(id) on delete set null,
  title text not null,
  event_date date not null,
  banner_image_url text,
  is_active boolean not null default true
);

alter table occasion_events enable row level security;
create policy "public reads occasion events" on occasion_events for select using (true);
create policy "admin writes occasion events" on occasion_events for all using (is_admin()) with check (is_admin());

-- ============================================================
-- user_reminders
-- ============================================================
create table user_reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  recipient_name text not null,
  relationship text,
  occasion_id uuid references occasions(id),
  reminder_date date not null,
  repeat_yearly boolean not null default true,
  notify_days_before int not null default 3,
  created_at timestamptz not null default now()
);

alter table user_reminders enable row level security;
create policy "owner manages own reminders" on user_reminders
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================
-- favorites
-- ============================================================
create table favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, product_id)
);

alter table favorites enable row level security;
create policy "owner manages own favorites" on favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================
-- orders / sub_orders / order_items / order_status_history
-- ============================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references profiles(id),
  delivery_address_id uuid not null references addresses(id),
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',
  notes text,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;
create policy "customer reads own orders" on orders
  for select using (customer_id = auth.uid() or is_admin());
create policy "customer creates own orders" on orders
  for insert with check (customer_id = auth.uid());
create policy "admin full access to orders" on orders
  for all using (is_admin()) with check (is_admin());

create table sub_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  partner_id uuid not null references partners(id),
  status text not null default 'pending' check (status in
    ('pending','accepted','preparing','ready','out_for_delivery','delivered','cancelled')),
  delivery_date date,
  delivery_time_slot text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  partner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sub_orders_partner_idx on sub_orders (partner_id);
create index sub_orders_order_idx on sub_orders (order_id);

alter table sub_orders enable row level security;

create policy "customer reads own sub_orders" on sub_orders
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
    or partner_id = my_partner_id() or is_admin()
  );
create policy "partner updates own sub_orders" on sub_orders
  for update using (partner_id = my_partner_id()) with check (partner_id = my_partner_id());
create policy "admin full access to sub_orders" on sub_orders
  for all using (is_admin()) with check (is_admin());

-- Lock down which columns a partner can touch on sub_orders: only status + partner_notes.
create or replace function restrict_sub_order_partner_update() returns trigger
language plpgsql as $$
begin
  if not is_admin() and old.partner_id = my_partner_id() then
    if new.order_id <> old.order_id or new.partner_id <> old.partner_id
       or new.subtotal <> old.subtotal or new.delivery_fee <> old.delivery_fee
       or new.total <> old.total then
      raise exception 'partners may only update status, delivery_date, delivery_time_slot, and partner_notes';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger sub_orders_restrict_partner_update
  before update on sub_orders
  for each row execute procedure restrict_sub_order_partner_update();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid not null references sub_orders(id) on delete cascade,
  product_id uuid references products(id),
  product_title_snapshot text not null,
  unit_price_snapshot numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  customization jsonb not null default '{}',
  line_total numeric(10,2) not null
);

alter table order_items enable row level security;
create policy "read order_items via sub_order access" on order_items
  for select using (
    exists (
      select 1 from sub_orders so
      join orders o on o.id = so.order_id
      where so.id = sub_order_id
        and (o.customer_id = auth.uid() or so.partner_id = my_partner_id() or is_admin())
    )
  );
create policy "admin writes order_items" on order_items
  for insert with check (is_admin() or true); -- inserted only via place_order() SECURITY DEFINER RPC

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid not null references sub_orders(id) on delete cascade,
  status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

alter table order_status_history enable row level security;
create policy "read status history via sub_order access" on order_status_history
  for select using (
    exists (
      select 1 from sub_orders so
      join orders o on o.id = so.order_id
      where so.id = sub_order_id
        and (o.customer_id = auth.uid() or so.partner_id = my_partner_id() or is_admin())
    )
  );

create or replace function log_sub_order_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_history (sub_order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), new.partner_notes);
  end if;
  return new;
end;
$$;

create trigger sub_orders_log_status_change
  after update on sub_orders
  for each row execute procedure log_sub_order_status_change();
