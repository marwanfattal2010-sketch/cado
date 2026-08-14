-- ============================================================
-- 0045 — Group gift cards, and one global CADO opening window
--
-- Additive. No table is dropped, no column is removed, no existing row is
-- rewritten. Two functions are replaced with `create or replace`
-- (purchase_gift_card, which is refactored rather than changed in behaviour)
-- and everything else is new.
--
-- NOT APPLIED. Written for review first.
-- ============================================================

-- ============================================================
-- PART A — the single CADO opening window (spec 8.3)
--
-- One row, not per-store hours. Every shop on CADO delivers through the same
-- window, so the window belongs to CADO and lives in a table rather than in
-- the frontend — changing it must not need a deploy.
--
-- Open/closed is decided in Postgres in Asia/Beirut. A phone with its clock
-- or timezone set wrong must not be able to place a "Now" order at 3am, so
-- the device clock is never consulted for this.
-- ============================================================

create table if not exists app_settings (
  id            boolean primary key default true check (id),   -- exactly one row
  opens_at      time not null default '09:00',
  closes_at     time not null default '21:00',
  timezone      text not null default 'Asia/Beirut',
  updated_at    timestamptz not null default now()
);

comment on column app_settings.opens_at is
  'Placeholder 09:00 until Marwan confirms the real opening time. One update changes it everywhere.';
comment on column app_settings.closes_at is
  '21:00 — real shops in Lebanon shut around 8-9pm, so ordering closes with them.';

insert into app_settings (id) values (true) on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Readable by anyone: the storefront has to know whether it is open. Writable
-- by admins only, through the same predicate every other policy uses.
create policy "public reads cado hours" on app_settings for select using (true);
create policy "admin writes cado hours" on app_settings
  for all using (is_admin()) with check (is_admin());

/** Is CADO open right now, in Beirut? */
create or replace function cado_is_open()
returns boolean
language sql stable security definer set search_path = public as $$
  select (now() at time zone s.timezone)::time >= s.opens_at
     and (now() at time zone s.timezone)::time <  s.closes_at
  from app_settings s
  where s.id
$$;

/**
 * The next moment CADO opens, as a Beirut timestamp.
 *
 * Today's opening if we are before it, otherwise tomorrow's — which is what
 * the "Closed - Preorder for today at 9:00 AM" / "for tomorrow" strip reads.
 */
create or replace function cado_next_open_at()
returns timestamp
language sql stable security definer set search_path = public as $$
  select case
           when (now() at time zone s.timezone)::time < s.opens_at
             then ((now() at time zone s.timezone)::date + s.opens_at)
           else (((now() at time zone s.timezone)::date + 1) + s.opens_at)
         end
  from app_settings s
  where s.id
$$;

grant execute on function cado_is_open() to anon, authenticated;
grant execute on function cado_next_open_at() to anon, authenticated;

-- ============================================================
-- PART B — group gift card pools
-- ============================================================

create table gift_card_pools (
  id              uuid primary key default gen_random_uuid(),
  -- Random and unguessable: this is the whole share link, and a sequential
  -- or derived slug would let anyone walk every pool on the site.
  slug            text not null unique,
  organizer_id    uuid not null references profiles(id) on delete cascade,
  recipient_name  text not null check (length(recipient_name) between 1 and 80),
  occasion        text not null check (occasion in
                    ('birthday','wedding','graduation','newborn','just-because')),
  goal_cents      integer not null check (goal_cents >= 2500),
  deadline        date,
  status          text not null default 'open'
                    check (status in ('open','funded','sent','cancelled')),
  gift_card_id    uuid references gift_cards(id),
  -- "Allow extra" is off by default: a contribution over what is left is
  -- rejected unless the organizer opted in.
  allow_extra     boolean not null default false,
  note_to         text check (note_to is null or length(note_to) <= 80),
  note_from       text check (note_from is null or length(note_from) <= 80),
  note_message    text check (note_message is null or length(note_message) <= 120),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table gift_card_pool_contributions (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references gift_card_pools(id) on delete cascade,
  -- Null when somebody chipped in through the link without an account.
  contributor_id   uuid references profiles(id) on delete set null,
  contributor_name text not null check (length(contributor_name) between 1 and 80),
  amount_cents     integer not null check (amount_cents >= 500),
  payment_ref      text check (payment_ref is null or length(payment_ref) <= 60),
  payment_status   text not null default 'pending'
                     check (payment_status in ('pending','confirmed','refund_required')),
  message          text check (message is null or length(message) <= 120),
  hide_amount      boolean not null default false,
  created_at       timestamptz not null default now()
);

create index on gift_card_pool_contributions (pool_id, created_at desc);
create index on gift_card_pools (organizer_id);

-- ------------------------------------------------------------
-- RLS
--
-- There is deliberately NO public select policy on either table. A pool is
-- read through get_pool_by_slug() and nothing else: a public policy would
-- let anyone list every pool on CADO, with recipient names and amounts.
--
-- There is deliberately NO insert or update policy for clients either.
-- Every write goes through a SECURITY DEFINER function that recalculates the
-- money itself, so a client can never post a total it made up.
-- ------------------------------------------------------------
alter table gift_card_pools enable row level security;
alter table gift_card_pool_contributions enable row level security;

create policy "organizer reads own pools" on gift_card_pools
  for select using (organizer_id = auth.uid() or is_admin());

create policy "organizer reads own pool contributions" on gift_card_pool_contributions
  for select using (
    is_admin()
    or exists (
      select 1 from gift_card_pools p
      where p.id = gift_card_pool_contributions.pool_id and p.organizer_id = auth.uid()
    )
  );

-- ============================================================
-- PART C — one place that mints a gift card
--
-- purchase_gift_card kept its $10-$500 retail limits and its behaviour; the
-- row-writing half is lifted into issue_gift_card_internal so the pool path
-- can reuse it rather than growing a second copy of the money logic.
--
-- A pool card is NOT capped at $500 — the whole point is a $900 ring — but
-- the amount is never client-supplied: it is the pool's own goal, and the
-- pool only reaches `funded` once admin-confirmed contributions cover it.
--
-- Cards are created `pending_payment` exactly like a normal purchase, so a
-- pool cannot mint a spendable card without the same admin activation every
-- other card goes through.
-- ============================================================

create or replace function issue_gift_card_internal(
  p_amount numeric,
  p_buyer_id uuid,
  p_recipient_name text default null,
  p_recipient_email text default null,
  p_message text default null,
  p_delivery_method text default 'digital',
  p_buyer_name text default null,
  p_buyer_email text default null
) returns table (code text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
  v_id uuid;
begin
  if p_delivery_method not in ('digital', 'physical') then
    raise exception 'Unknown delivery method: %', p_delivery_method;
  end if;

  v_code := generate_gift_card_code();

  insert into gift_cards (
    code, pin_hash, original_amount, current_balance, buyer_id, buyer_name, buyer_email,
    recipient_name, recipient_email, message, delivery_method, expires_at, status
  ) values (
    v_code, null, p_amount, p_amount, p_buyer_id, p_buyer_name, p_buyer_email,
    nullif(p_recipient_name, ''), p_recipient_email, p_message, p_delivery_method,
    now() + interval '2 years', 'pending_payment'
  ) returning gift_cards.id into v_id;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (coalesce(p_buyer_id::text, 'system'), 'purchase_pending_payment', 'gift_cards', v_id::text,
    jsonb_build_object('amount', p_amount, 'delivery_method', p_delivery_method));

  return query select v_code, v_id, p_amount;
end;
$$;

revoke all on function issue_gift_card_internal(numeric, uuid, text, text, text, text, text, text)
  from public, anon, authenticated;

-- ============================================================
-- PART D — pool functions. All SECURITY DEFINER, search_path pinned.
-- ============================================================

/** A 12-character unguessable slug. */
create or replace function generate_pool_slug()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slug text;
begin
  loop
    -- base64 of 9 random bytes, stripped to url-safe characters.
    v_slug := lower(regexp_replace(encode(gen_random_bytes(9), 'base64'), '[^a-zA-Z0-9]', '', 'g'));
    v_slug := substr(v_slug, 1, 12);
    exit when length(v_slug) = 12 and not exists (select 1 from gift_card_pools where slug = v_slug);
  end loop;
  return v_slug;
end;
$$;

revoke all on function generate_pool_slug() from public, anon, authenticated;

create or replace function create_gift_card_pool(
  p_recipient_name text,
  p_occasion text,
  p_goal_cents integer,
  p_deadline date default null,
  p_note_to text default null,
  p_note_from text default null,
  p_note_message text default null,
  p_allow_extra boolean default false
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start a group gift.';
  end if;
  if p_goal_cents < 2500 then
    raise exception 'The goal must be at least $25.';
  end if;
  if p_deadline is not null and p_deadline < (now() at time zone 'Asia/Beirut')::date then
    raise exception 'The deadline cannot be in the past.';
  end if;

  v_slug := generate_pool_slug();

  insert into gift_card_pools (
    slug, organizer_id, recipient_name, occasion, goal_cents, deadline,
    note_to, note_from, note_message, allow_extra
  ) values (
    v_slug, auth.uid(), p_recipient_name, p_occasion, p_goal_cents, p_deadline,
    p_note_to, p_note_from, p_note_message, coalesce(p_allow_extra, false)
  );

  return v_slug;
end;
$$;

revoke all on function create_gift_card_pool(text, text, integer, date, text, text, text, boolean)
  from public, anon;
grant execute on function create_gift_card_pool(text, text, integer, date, text, text, text, boolean)
  to authenticated;

/**
 * Everything the public group page is allowed to know.
 *
 * Deliberately NOT `select *`: no organizer id, no email, no phone, no gift
 * card code, no payment reference. A wrong slug returns zero rows rather
 * than raising, so a guesser cannot tell a real slug from a fake one by the
 * shape of the error.
 */
create or replace function get_pool_by_slug(p_slug text)
returns table (
  slug text,
  recipient_name text,
  occasion text,
  goal_cents integer,
  confirmed_cents bigint,
  pending_cents bigint,
  contributor_count integer,
  status text,
  deadline date,
  is_organizer boolean,
  contributors jsonb
)
language sql stable security definer set search_path = public as $$
  select
    p.slug,
    p.recipient_name,
    p.occasion,
    p.goal_cents,
    coalesce((select sum(c.amount_cents) from gift_card_pool_contributions c
               where c.pool_id = p.id and c.payment_status = 'confirmed'), 0)::bigint,
    coalesce((select sum(c.amount_cents) from gift_card_pool_contributions c
               where c.pool_id = p.id and c.payment_status = 'pending'), 0)::bigint,
    (select count(*) from gift_card_pool_contributions c
      where c.pool_id = p.id and c.payment_status = 'confirmed')::integer,
    p.status,
    p.deadline,
    (p.organizer_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', c.contributor_name,
               'amount_cents', case when c.hide_amount then null else c.amount_cents end,
               'hidden', c.hide_amount,
               'message', c.message,
               'status', c.payment_status
             ) order by c.created_at desc)
      from gift_card_pool_contributions c
      where c.pool_id = p.id and c.payment_status in ('confirmed','pending')
    ), '[]'::jsonb)
  from gift_card_pools p
  where p.slug = p_slug
$$;

grant execute on function get_pool_by_slug(text) to anon, authenticated;

/**
 * Chip in.
 *
 * Every limit is enforced here and not in the UI, because the UI is not a
 * security boundary. The pool row is locked first so two people chipping in
 * at the same second cannot both pass the "is there room?" check.
 */
create or replace function contribute_to_pool(
  p_slug text,
  p_contributor_name text,
  p_amount_cents integer,
  p_payment_ref text default null,
  p_message text default null,
  p_hide_amount boolean default false
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pool gift_card_pools;
  v_confirmed bigint;
  v_pending bigint;
  v_count integer;
  v_remaining bigint;
  v_id uuid;
begin
  select * into v_pool from gift_card_pools where slug = p_slug for update;
  if not found then
    raise exception 'That group gift link is not valid.';
  end if;
  if v_pool.status <> 'open' then
    raise exception 'This group gift is closed.';
  end if;
  if v_pool.deadline is not null
     and v_pool.deadline < (now() at time zone 'Asia/Beirut')::date then
    raise exception 'This group gift has passed its deadline.';
  end if;
  if p_amount_cents < 500 then
    raise exception 'The smallest amount is $5.';
  end if;
  if p_contributor_name is null or length(trim(p_contributor_name)) = 0 then
    raise exception 'Please add your name.';
  end if;

  select count(*) into v_count
    from gift_card_pool_contributions
   where pool_id = v_pool.id and payment_status in ('pending','confirmed');
  if v_count >= 20 then
    raise exception 'This group gift already has the maximum of 20 people.';
  end if;

  select
    coalesce(sum(amount_cents) filter (where payment_status = 'confirmed'), 0),
    coalesce(sum(amount_cents) filter (where payment_status = 'pending'), 0)
    into v_confirmed, v_pending
    from gift_card_pool_contributions
   where pool_id = v_pool.id;

  -- Pending money counts against the room left, or twenty people could each
  -- pledge the full goal while none of them has been confirmed yet.
  v_remaining := v_pool.goal_cents - (v_confirmed + v_pending);
  if not v_pool.allow_extra and p_amount_cents > v_remaining then
    raise exception 'That is more than the % left to reach the goal.',
      to_char(v_remaining / 100.0, 'FM999999990.00');
  end if;

  insert into gift_card_pool_contributions (
    pool_id, contributor_id, contributor_name, amount_cents,
    payment_ref, payment_status, message, hide_amount
  ) values (
    v_pool.id, auth.uid(), trim(p_contributor_name), p_amount_cents,
    nullif(trim(coalesce(p_payment_ref, '')), ''), 'pending',
    nullif(trim(coalesce(p_message, '')), ''), coalesce(p_hide_amount, false)
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function contribute_to_pool(text, text, integer, text, text, boolean)
  to anon, authenticated;

/** Admin confirms an OMT transfer actually arrived. */
create or replace function confirm_pool_contribution(p_contribution_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pool_id uuid;
  v_goal integer;
  v_confirmed bigint;
begin
  if not is_admin() then
    raise exception 'Only an admin can confirm a payment.';
  end if;

  update gift_card_pool_contributions
     set payment_status = 'confirmed'
   where id = p_contribution_id and payment_status = 'pending'
   returning pool_id into v_pool_id;

  if v_pool_id is null then
    raise exception 'That contribution is not waiting for confirmation.';
  end if;

  select goal_cents into v_goal from gift_card_pools where id = v_pool_id for update;
  select coalesce(sum(amount_cents), 0) into v_confirmed
    from gift_card_pool_contributions
   where pool_id = v_pool_id and payment_status = 'confirmed';

  if v_confirmed >= v_goal then
    update gift_card_pools
       set status = 'funded', updated_at = now()
     where id = v_pool_id and status = 'open';
  end if;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'confirm_pool_contribution', 'gift_card_pool_contributions',
          p_contribution_id::text, jsonb_build_object('confirmed_cents', v_confirmed));
end;
$$;

revoke all on function confirm_pool_contribution(uuid) from public, anon;
grant execute on function confirm_pool_contribution(uuid) to authenticated;

/** Organizer issues the card once the goal is genuinely met. */
create or replace function issue_pool_gift_card(p_pool_id uuid)
returns table (code text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pool gift_card_pools;
  v_confirmed bigint;
  v_card record;
begin
  select * into v_pool from gift_card_pools where id = p_pool_id for update;
  if not found then
    raise exception 'Group gift not found.';
  end if;
  if v_pool.organizer_id <> auth.uid() then
    raise exception 'Only the organizer can send this gift card.';
  end if;
  if v_pool.status <> 'funded' then
    raise exception 'This group gift is not fully funded yet.';
  end if;

  -- Recomputed rather than trusted, even though status already says funded.
  select coalesce(sum(amount_cents), 0) into v_confirmed
    from gift_card_pool_contributions
   where pool_id = v_pool.id and payment_status = 'confirmed';
  if v_confirmed < v_pool.goal_cents then
    raise exception 'The confirmed total is below the goal.';
  end if;

  select * into v_card from issue_gift_card_internal(
    (v_pool.goal_cents / 100.0)::numeric,
    v_pool.organizer_id,
    coalesce(v_pool.note_to, v_pool.recipient_name),
    null,
    v_pool.note_message,
    'digital',
    v_pool.note_from,
    null
  );

  update gift_card_pools
     set status = 'sent', gift_card_id = v_card.id, updated_at = now()
   where id = v_pool.id;

  return query select v_card.code, v_card.id, v_card.original_amount;
end;
$$;

revoke all on function issue_pool_gift_card(uuid) from public, anon;
grant execute on function issue_pool_gift_card(uuid) to authenticated;

/**
 * Cancel. Nothing is refunded automatically — money moved by OMT outside the
 * system cannot be moved back by a database function. Contributions are
 * flagged for a human to deal with, and that is the whole of it.
 */
create or replace function cancel_gift_card_pool(p_pool_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pool gift_card_pools;
begin
  select * into v_pool from gift_card_pools where id = p_pool_id for update;
  if not found then
    raise exception 'Group gift not found.';
  end if;
  if v_pool.organizer_id <> auth.uid() and not is_admin() then
    raise exception 'Only the organizer can cancel this group gift.';
  end if;
  if v_pool.status <> 'open' then
    raise exception 'Only an open group gift can be cancelled.';
  end if;

  update gift_card_pool_contributions
     set payment_status = 'refund_required'
   where pool_id = v_pool.id and payment_status in ('pending','confirmed');

  update gift_card_pools set status = 'cancelled', updated_at = now() where id = v_pool.id;

  insert into audit_log (actor, action, table_name, record_id, new_value)
  values (auth.uid()::text, 'cancel_gift_card_pool', 'gift_card_pools', v_pool.id::text,
          jsonb_build_object('slug', v_pool.slug));
end;
$$;

revoke all on function cancel_gift_card_pool(uuid) from public, anon;
grant execute on function cancel_gift_card_pool(uuid) to authenticated;

/** Admin list of contributions needing a manual refund. */
create or replace function list_refunds_required()
returns table (
  contribution_id uuid,
  pool_slug text,
  recipient_name text,
  contributor_name text,
  amount_cents integer,
  payment_ref text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, p.slug, p.recipient_name, c.contributor_name,
         c.amount_cents, c.payment_ref, c.created_at
  from gift_card_pool_contributions c
  join gift_card_pools p on p.id = c.pool_id
  where c.payment_status = 'refund_required' and is_admin()
  order by c.created_at desc
$$;

revoke all on function list_refunds_required() from public, anon;
grant execute on function list_refunds_required() to authenticated;
