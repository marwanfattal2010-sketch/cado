-- 0083: saved delivery addresses, and a flag for Lebanese brands.
--
-- Additive only: a new table and one nullable-defaulted column. Nothing gets
-- stricter, so this is safe to apply before the deploy that uses it.

-- ======================================================== user_addresses ===
-- The storefront already has `addresses`, which is the address attached to an
-- ORDER. This is the address book a person keeps — "Home", "Teta's" — that
-- they pick from at checkout. Separate table because the two have different
-- lifetimes: deleting a saved address must never rewrite where a past order
-- actually went.
create table if not exists user_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  city text not null,
  area text,
  street text,
  building text,
  floor text,
  apartment text,
  phone text,
  notes text check (char_length(notes) <= 300),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_addresses_profile_idx on user_addresses (profile_id, is_default desc, created_at);

alter table user_addresses enable row level security;

-- Owner-only, all four verbs. An address book is as private as data gets, and
-- there is no reason for staff to browse everyone's doorsteps — the admin
-- customer page already reads one person's addresses through a SECURITY
-- DEFINER function when someone navigates to that person.
drop policy if exists user_addresses_own on user_addresses;
create policy user_addresses_own on user_addresses for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

/**
 * Exactly one default per person. Doing this in a trigger rather than the UI
 * means a second device, a stale tab or a direct API call cannot leave someone
 * with two defaults and a checkout that picks arbitrarily.
 */
create or replace function enforce_single_default_address() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update user_addresses
       set is_default = false
     where profile_id = new.profile_id
       and id <> new.id
       and is_default;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_addresses_single_default on user_addresses;
create trigger user_addresses_single_default
  before insert or update on user_addresses
  for each row execute procedure enforce_single_default_address();

-- ====================================================== Lebanese brands ====
-- Drives the "Made in Lebanon" collection. Defaults to false: a shop is only
-- local when someone at CADO says so, never by guessing from a name.
alter table partners add column if not exists is_lebanese_brand boolean not null default false;

comment on column partners.is_lebanese_brand is
  'Marked by CADO. Drives the "Made in Lebanon" collection; the tile hides entirely when no store is flagged.';

-- The storefront reads partners through a column grant (0081), so the new
-- column has to be handed to anon explicitly or the collection query 403s.
grant select (is_lebanese_brand) on partners to anon;

-- ================================================= search support =========
/**
 * Stores matching a search term — by their own name, their category, or any
 * product they sell. Doing it in SQL keeps the three-way OR off the client,
 * where composing PostgREST `.or()` strings from user input is the injection
 * trap this codebase has hit before.
 *
 * The term is matched literally: `like` metacharacters are escaped here so a
 * search for "50%" cannot turn into a wildcard.
 */
create or replace function search_stores(p_query text, p_limit int default 20)
returns table (
  id uuid, name text, slug text, city text, logo_url text,
  cover_image_url text, category_name text
)
language sql stable security definer set search_path = public as $$
  with q as (
    select '%' || replace(replace(replace(coalesce(p_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as term
  )
  select distinct on (pa.id)
    pa.id, pa.name, pa.slug, pa.city, pa.logo_url, pa.cover_image_url,
    (select c.name from products pr2
       join categories c on c.id = pr2.category_id
      where pr2.partner_id = pa.id and pr2.is_active
      limit 1)
  from partners pa, q
  where pa.status = 'active'
    and length(coalesce(p_query, '')) >= 2
    and (
      pa.name ilike q.term escape '\'
      or coalesce(pa.description, '') ilike q.term escape '\'
      or exists (
        select 1 from products pr
        left join categories c on c.id = pr.category_id
        where pr.partner_id = pa.id and pr.is_active
          and (
            pr.title ilike q.term escape '\'
            or coalesce(c.name, '') ilike q.term escape '\'
            or exists (select 1 from unnest(coalesce(pr.tags, '{}')) t where t ilike q.term escape '\')
          )
      )
    )
  limit greatest(1, least(coalesce(p_limit, 20), 50))
$$;

revoke all on function search_stores(text, int) from public;
grant execute on function search_stores(text, int) to anon, authenticated;
