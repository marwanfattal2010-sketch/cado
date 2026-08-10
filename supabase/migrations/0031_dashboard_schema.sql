-- ============================================================================
-- 0031 — Dashboard schema (additive only)
--
-- Context: the dashboard spec was written against a schema that does not
-- exist. It talks about `stores`, `profiles.store_id`, `products.name`,
-- `payouts` and a `store_owner` role. The live database uses `partners`,
-- `profiles.partner_id`, `products.title`, `store_payables` and the role
-- value `partner`. Creating the spec's tables verbatim would fork the live
-- data into two parallel schemas and break the storefront, which reads these
-- tables directly over PostgREST.
--
-- So: nothing here renames, drops or retypes anything. Every statement is
-- `add column if not exists`, `create table if not exists`, or a new trigger.
-- The storefront cannot notice this migration except that three new columns
-- appear on order_items and one on partners, all with defaults.
--
-- Mapping used throughout the dashboard:
--   spec "store"          -> partners
--   spec "store_id"       -> partner_id (or store_payables.store_id, which is
--                            already named that and already FKs to partners)
--   spec "store_owner"    -> profiles.role = 'partner'  (the CHECK constraint
--                            profiles_role_check already allows exactly
--                            customer | partner | admin — no new role value is
--                            invented, because adding one would mean altering
--                            a live CHECK constraint)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- partners.confirmation_timeout_minutes
--
-- How long a store has to confirm an item before CADO escalates. This is the
-- store's own operating preference, not a privilege column, so 0026's
-- enforce_partner_privilege_columns() deliberately does NOT guard it — a store
-- owner is allowed to change it.
-- ----------------------------------------------------------------------------
alter table partners
  add column if not exists confirmation_timeout_minutes integer not null default 60;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'partners_confirmation_timeout_range'
  ) then
    alter table partners
      add constraint partners_confirmation_timeout_range
      check (confirmation_timeout_minutes between 5 and 1440);
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- product_variants
--
-- products has no variant concept today; size/colour is squeezed into
-- cart_items.customization jsonb. This adds a real table without changing how
-- products behaves. price_delta is signed so a variant can cost less.
-- ----------------------------------------------------------------------------
create table if not exists product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  name            text not null,
  sku             text,
  price_delta     numeric(10,2) not null default 0,
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint product_variants_name_len check (char_length(name) between 1 and 80),
  constraint product_variants_sku_len  check (sku is null or char_length(sku) <= 60),
  constraint product_variants_unique_name unique (product_id, name)
);

create index if not exists idx_product_variants_product on product_variants(product_id);


-- ----------------------------------------------------------------------------
-- order_items: per-item confirmation + money snapshots
--
-- product_title_snapshot and unit_price_snapshot already existed and are
-- populated by place_order(). What was missing is the commission that applied
-- at the time of sale — today it only lives on store_payables, per order, so
-- you cannot answer "what did CADO earn on this line". Adding it per item.
--
-- confirmation_status is per ITEM, not per sub_order, because a store can have
-- one item in stock and one not. sub_orders.status stays the fulfilment
-- status and is untouched.
-- ----------------------------------------------------------------------------
alter table order_items
  add column if not exists variant_id uuid references product_variants(id) on delete set null;
alter table order_items
  add column if not exists variant_name_snapshot text;
alter table order_items
  add column if not exists commission_rate_snapshot numeric(5,4);
alter table order_items
  add column if not exists commission_amount_snapshot numeric(10,2);
alter table order_items
  add column if not exists confirmation_status text not null default 'pending';
alter table order_items
  add column if not exists confirmed_at timestamptz;
alter table order_items
  add column if not exists rejection_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_confirmation_status_check') then
    alter table order_items add constraint order_items_confirmation_status_check
      check (confirmation_status in ('pending','confirmed','rejected','substituted'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_rejection_reason_len') then
    alter table order_items add constraint order_items_rejection_reason_len
      check (rejection_reason is null or char_length(rejection_reason) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_variant_name_len') then
    alter table order_items add constraint order_items_variant_name_len
      check (variant_name_snapshot is null or char_length(variant_name_snapshot) <= 80);
  end if;
end $$;

create index if not exists idx_order_items_confirmation_status
  on order_items(confirmation_status) where confirmation_status = 'pending';


-- ----------------------------------------------------------------------------
-- Populate the commission snapshot on insert.
--
-- Deliberately NOT done by editing place_order(). place_order() is live money
-- logic with concurrency tests against it; a BEFORE INSERT trigger adds the
-- snapshot without reopening that function.
--
-- This runs on the live checkout path, so it must never raise. Every lookup is
-- null-tolerant and the whole body is wrapped: if anything at all goes wrong
-- the snapshot is left null and the order still completes. A missing analytics
-- number is not worth a failed checkout.
-- ----------------------------------------------------------------------------
create or replace function set_order_item_commission_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric;
begin
  begin
    if new.commission_rate_snapshot is null then
      select p.commission_rate into v_rate
      from sub_orders so
      join partners p on p.id = so.partner_id
      where so.id = new.sub_order_id;

      if v_rate is not null then
        new.commission_rate_snapshot := v_rate;
        new.commission_amount_snapshot := round(coalesce(new.line_total, 0) * v_rate, 2);
      end if;
    elsif new.commission_amount_snapshot is null then
      new.commission_amount_snapshot :=
        round(coalesce(new.line_total, 0) * new.commission_rate_snapshot, 2);
    end if;
  exception when others then
    -- never block a checkout over a reporting column
    null;
  end;
  return new;
end;
$$;

drop trigger if exists order_items_commission_snapshot on order_items;
create trigger order_items_commission_snapshot
  before insert on order_items
  for each row execute procedure set_order_item_commission_snapshot();

-- Backfill the rows that already exist. commission_rate is read from the
-- partner's CURRENT rate, which is the best available approximation for
-- historical rows — flagged rather than hidden.
update order_items oi
set commission_rate_snapshot = p.commission_rate,
    commission_amount_snapshot = round(oi.line_total * p.commission_rate, 2)
from sub_orders so
join partners p on p.id = so.partner_id
where so.id = oi.sub_order_id
  and oi.commission_rate_snapshot is null;


-- ----------------------------------------------------------------------------
-- Lock down what a store owner may change on an order line.
--
-- Same pattern as 0026: a BEFORE UPDATE trigger, because a WITH CHECK
-- expression cannot compare OLD to NEW. Without this, granting the UPDATE
-- policy needed for "confirm this item" would also let a store rewrite
-- unit_price_snapshot or line_total on a placed order.
--
-- auth.uid() is null means service role / psql, which is already fully
-- privileged; is_admin() is CADO.
-- ----------------------------------------------------------------------------
create or replace function enforce_order_item_partner_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.sub_order_id is distinct from old.sub_order_id
     or new.product_id is distinct from old.product_id
     or new.product_title_snapshot is distinct from old.product_title_snapshot
     or new.unit_price_snapshot is distinct from old.unit_price_snapshot
     or new.quantity is distinct from old.quantity
     or new.line_total is distinct from old.line_total
     or new.customization is distinct from old.customization
     or new.variant_id is distinct from old.variant_id
     or new.variant_name_snapshot is distinct from old.variant_name_snapshot
     or new.commission_rate_snapshot is distinct from old.commission_rate_snapshot
     or new.commission_amount_snapshot is distinct from old.commission_amount_snapshot
  then
    raise exception 'a store may only set confirmation_status, confirmed_at and rejection_reason on an order line';
  end if;

  if new.confirmation_status is distinct from old.confirmation_status
     and new.confirmation_status = 'confirmed'
     and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_enforce_partner_update on order_items;
create trigger order_items_enforce_partner_update
  before update on order_items
  for each row execute procedure enforce_order_item_partner_update();


-- ----------------------------------------------------------------------------
-- order_events — immutable timeline
--
-- order_status_history already exists but only records sub_order status
-- transitions. This is the wider timeline the dashboard needs: item
-- confirmations, rejections, notification sends, admin interventions.
-- Append-only, enforced by triggers (RLS alone cannot express "no updates
-- ever, including by the table owner").
-- ----------------------------------------------------------------------------
create table if not exists order_events (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  sub_order_id  uuid references sub_orders(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete set null,
  partner_id    uuid references partners(id) on delete set null,
  event_type    text not null,
  actor_id      uuid references auth.users(id) on delete set null,
  actor_role    text not null default 'system',
  from_status   text,
  to_status     text,
  message       text,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint order_events_scope check (order_id is not null or sub_order_id is not null),
  constraint order_events_type_len check (char_length(event_type) between 1 and 60),
  constraint order_events_actor_role check (actor_role in ('system','customer','partner','admin')),
  constraint order_events_message_len check (message is null or char_length(message) <= 500)
);

create index if not exists idx_order_events_sub_order on order_events(sub_order_id, created_at desc);
create index if not exists idx_order_events_order on order_events(order_id, created_at desc);
create index if not exists idx_order_events_partner on order_events(partner_id, created_at desc);

create or replace function order_events_are_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'order_events is append-only';
end;
$$;

drop trigger if exists order_events_no_update on order_events;
create trigger order_events_no_update
  before update on order_events
  for each row execute procedure order_events_are_immutable();

drop trigger if exists order_events_no_delete on order_events;
create trigger order_events_no_delete
  before delete on order_events
  for each row execute procedure order_events_are_immutable();


-- ----------------------------------------------------------------------------
-- notifications — outbound log
--
-- A record of what CADO tried to send, not a queue worker. Email is currently
-- sandboxed (Resend, no verified domain) so most rows will end up 'failed' or
-- 'skipped' until a domain is verified; the log is what makes that visible
-- instead of silent.
-- ----------------------------------------------------------------------------
create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid references profiles(id) on delete set null,
  partner_id     uuid references partners(id) on delete cascade,
  sub_order_id   uuid references sub_orders(id) on delete set null,
  channel        text not null,
  template       text not null,
  destination    text,
  subject        text,
  body           text,
  status         text not null default 'queued',
  error          text,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  constraint notifications_channel_check check (channel in ('email','sms','whatsapp','push','in_app')),
  constraint notifications_status_check  check (status in ('queued','sent','failed','skipped')),
  constraint notifications_template_len  check (char_length(template) between 1 and 80),
  constraint notifications_destination_len check (destination is null or char_length(destination) <= 320),
  constraint notifications_subject_len   check (subject is null or char_length(subject) <= 200),
  constraint notifications_body_len      check (body is null or char_length(body) <= 5000),
  constraint notifications_error_len     check (error is null or char_length(error) <= 500)
);

create index if not exists idx_notifications_partner on notifications(partner_id, created_at desc);
create index if not exists idx_notifications_recipient on notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_status on notifications(status) where status = 'queued';


-- ----------------------------------------------------------------------------
-- payout_periods — sits ON TOP of store_payables, does not replace it
--
-- store_payables already holds one row per order per store with gross,
-- commission_rate, commission_amount, net_owed and a pending|paid status. That
-- is the ledger and it stays the source of truth. What is missing is the
-- grouping CADO actually pays against: "everything owed to store X for the
-- first half of March". So: a periods table, plus a nullable FK from the
-- existing payables rows into it.
-- ----------------------------------------------------------------------------
create table if not exists payout_periods (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references partners(id) on delete cascade,
  period_start      date not null,
  period_end        date not null,
  status            text not null default 'open',
  gross_total       numeric(12,2) not null default 0,
  commission_total  numeric(12,2) not null default 0,
  net_total         numeric(12,2) not null default 0,
  reference         text,
  note              text,
  closed_at         timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  constraint payout_periods_status_check check (status in ('open','closed','paid','void')),
  constraint payout_periods_range check (period_end >= period_start),
  constraint payout_periods_reference_len check (reference is null or char_length(reference) <= 100),
  constraint payout_periods_note_len check (note is null or char_length(note) <= 500),
  constraint payout_periods_unique unique (partner_id, period_start, period_end)
);

create index if not exists idx_payout_periods_partner on payout_periods(partner_id, period_start desc);

alter table store_payables
  add column if not exists payout_period_id uuid references payout_periods(id) on delete set null;

create index if not exists idx_store_payables_period on store_payables(payout_period_id);
create index if not exists idx_store_payables_store on store_payables(store_id, created_at desc);


-- ----------------------------------------------------------------------------
-- store_metrics — daily rollup, one row per store per day
--
-- Rebuilt by rebuild_store_metrics() (0033), never written from the client.
-- ----------------------------------------------------------------------------
create table if not exists store_metrics (
  partner_id           uuid not null references partners(id) on delete cascade,
  day                  date not null,
  orders_count         integer not null default 0,
  items_count          integer not null default 0,
  units_count          integer not null default 0,
  gross_revenue        numeric(12,2) not null default 0,
  commission_amount    numeric(12,2) not null default 0,
  net_revenue          numeric(12,2) not null default 0,
  cancelled_count      integer not null default 0,
  delivered_count      integer not null default 0,
  avg_confirm_seconds  integer,
  updated_at           timestamptz not null default now(),
  primary key (partner_id, day)
);

create index if not exists idx_store_metrics_day on store_metrics(day desc);


-- ----------------------------------------------------------------------------
-- store_owner_invites
--
-- Admin invites a store owner by email. The row records the intent; the actual
-- credential is created by Supabase Auth (invite / magic link) and the owner
-- sets their own password. No password is ever stored, generated or displayed
-- by this system.
-- ----------------------------------------------------------------------------
create table if not exists store_owner_invites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  partner_id   uuid not null references partners(id) on delete cascade,
  invited_by   uuid references profiles(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  status       text not null default 'pending',
  note         text,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  constraint store_owner_invites_status_check check (status in ('pending','accepted','revoked')),
  constraint store_owner_invites_email_len check (char_length(email) <= 320),
  constraint store_owner_invites_email_valid check (is_valid_email(email)),
  constraint store_owner_invites_note_len check (note is null or char_length(note) <= 300)
);

create unique index if not exists idx_store_owner_invites_pending_email
  on store_owner_invites(lower(email)) where status = 'pending';
create index if not exists idx_store_owner_invites_partner on store_owner_invites(partner_id);


-- ----------------------------------------------------------------------------
-- Seed marker.
--
-- The database already holds real partners, products and orders. Test data
-- seeded for the dashboard has to be removable without guessing, so every
-- seeded row is tagged here rather than being identified by a naming
-- convention someone will later break.
-- ----------------------------------------------------------------------------
create table if not exists dashboard_seed_registry (
  id          bigserial primary key,
  batch       text not null,
  table_name  text not null,
  record_id   text not null,
  created_at  timestamptz not null default now(),
  constraint dashboard_seed_registry_unique unique (table_name, record_id)
);

create index if not exists idx_dashboard_seed_registry_batch on dashboard_seed_registry(batch);
