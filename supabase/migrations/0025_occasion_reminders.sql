-- PROMPT 9: the Occasions tab.
--
-- Note the name. There is already an `occasions` table, but it is a catalog
-- of occasion *types* (birthday, graduation, ...) used for tagging products.
-- This is a different thing entirely: the dates a specific customer wants to
-- be reminded about. Reusing the old table would have conflated a shared
-- lookup list with private per-user rows, which is exactly the kind of mixup
-- that later produces a cross-customer data leak.

create table if not exists occasion_reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,

  person_name text not null check (char_length(trim(person_name)) between 1 and 100),
  relationship text check (relationship is null or char_length(relationship) <= 50),

  occasion_type text not null default 'birthday'
    check (occasion_type in ('birthday', 'anniversary', 'other')),
  -- Only used when occasion_type = 'other', so the row can say what it is.
  label text check (label is null or char_length(label) <= 60),

  -- The date it happened / happens. The year is kept (an anniversary needs
  -- it to say "5 years"), but the reminder recurs on month/day.
  event_date date not null check (event_date >= '1900-01-01' and event_date <= '2100-01-01'),

  remind_days_before int not null default 7 check (remind_days_before between 0 and 60),
  phone text check (phone is null or char_length(phone) <= 30),
  note text check (note is null or char_length(note) <= 300),

  -- Set when a reminder actually goes out, so a rerun of the job on the same
  -- day cannot message the same person twice.
  last_reminded_on date,

  created_at timestamptz not null default now(),

  -- The same person's birthday twice is always a mistake, never a feature.
  unique (profile_id, person_name, occasion_type, event_date)
);

create index if not exists occasion_reminders_profile_idx on occasion_reminders (profile_id);

alter table occasion_reminders enable row level security;

-- These rows are a list of the people someone cares about and when. There is
-- no reason for any other account to read them, admin included.
drop policy if exists "owner reads own reminders" on occasion_reminders;
create policy "owner reads own reminders" on occasion_reminders
  for select using (profile_id = auth.uid());

drop policy if exists "owner inserts own reminders" on occasion_reminders;
create policy "owner inserts own reminders" on occasion_reminders
  for insert with check (profile_id = auth.uid());

drop policy if exists "owner updates own reminders" on occasion_reminders;
create policy "owner updates own reminders" on occasion_reminders
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "owner deletes own reminders" on occasion_reminders;
create policy "owner deletes own reminders" on occasion_reminders
  for delete using (profile_id = auth.uid());

-- last_reminded_on is the job's bookkeeping, not the customer's. Letting the
-- client clear it would let anyone re-trigger their own reminders at will.
revoke update (last_reminded_on) on occasion_reminders from authenticated, anon;

grant select, insert, update, delete on occasion_reminders to authenticated;
revoke all on occasion_reminders from anon;
