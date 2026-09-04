-- 0096: the store row on a category tab becomes DATA, and search stops
--        offering shops with nothing in them.
--
-- WHY
-- ---
-- The eight circles at the top of the Fashion tab were ordered by a hardcoded
-- list of names inside TabTemplate.tsx — a `rank(name)` function that had to be
-- edited and redeployed to move a shop, and that silently ranked nothing on any
-- other tab. Order of a merchandising row is a business decision, so it belongs
-- in a row, not in a bundle.
--
-- TWO COLUMNS, NOT ONE
-- --------------------
--   display_rank         where this shop sits in the row (1 = first)
--   display_category_id  WHICH category's row it sits in
--
-- The second column is not optional. Six of the eight ranked shops have no
-- products at all yet, so "which tab does this shop belong to" cannot be
-- derived from the catalogue the way it is for everyone else — and a bare
-- global rank would have pinned Adidas to the top of Jewelry, Flowers and
-- Chocolate as well. With the pair, a rank means exactly one thing: this shop
-- is pinned at this position in THIS category's store row.
--
-- THE RULE THE STOREFRONT READS (apps/web/src/lib/browse.ts, categoryStores)
--   A shop appears in a category's store row if it has an active product in
--   that category OR it is pinned to that category. Ranked shops lead, in rank
--   order; everyone else follows alphabetically. No name list anywhere.
--
-- A PINNED SHOP IS NOT A STOCKED SHOP. Being in the circle row is the ONLY
-- thing a rank buys. Every product-derived surface — the strips, the deals,
-- the grid, the Store filter facet, store search — keeps deriving itself from
-- products, so a shop with none of them cannot appear there and cannot lead a
-- shopper to an empty grid.
--
-- Additive: two nullable columns, one partial index, one check, and a replaced
-- function. Nothing is dropped and no row is rewritten.
--
-- APPLY THIS BEFORE RUNNING OR DEPLOYING THE MATCHING STOREFRONT BUILD.
-- `useStoreDirectory` names display_rank and display_category_id in its select,
-- and 0081 means PostgREST 400s on a column the anon role has not been granted
-- — which for a column that does not exist yet is every store row on the site,
-- silently empty. Migration first, then the build. Measured, not assumed: with
-- this file unapplied the partners request returns 400 and the Store facet
-- disappears from /browse?tab=fashion.
--
--   SUPABASE_ACCESS_TOKEN=<token> node scripts/run-sql.mjs --file supabase/migrations/0096_partner_display_rank.sql
--   node scripts/seed-fashion-store-row.mjs

-- ---------------------------------------------------------------- columns --

alter table partners add column if not exists display_rank integer;
alter table partners add column if not exists display_category_id uuid references categories(id);

comment on column partners.display_rank is
  'Position of this store in its display_category_id store row (1 = first). NULL means the store is not pinned; it still appears in any category where it has an active product, sorted by name. Set together with display_category_id — see 0096.';

comment on column partners.display_category_id is
  'Which category''s store row display_rank applies to. Also the ONLY way a store with zero products can appear in a category''s store row and store directory. It does NOT put the store into any product-derived section, facet or search result.';

-- A rank is a position, and positions start at 1.
alter table partners drop constraint if exists partners_display_rank_positive;
alter table partners add constraint partners_display_rank_positive
  check (display_rank is null or display_rank >= 1) not valid;
alter table partners validate constraint partners_display_rank_positive;

-- A rank only means something with a category attached, and vice versa. Half a
-- pin is how a store ends up ranked on every tab, or on none.
alter table partners drop constraint if exists partners_display_pin_complete;
alter table partners add constraint partners_display_pin_complete
  check ((display_rank is null) = (display_category_id is null)) not valid;
alter table partners validate constraint partners_display_pin_complete;

-- Two shops cannot both be third in Fashion. Partial, so the thirty unpinned
-- partners do not collide on (null, null).
create unique index if not exists partners_display_slot_unique
  on partners (display_category_id, display_rank)
  where display_rank is not null;

-- 0081 removed the table-level SELECT grant from anon and hands columns back
-- one at a time, so a NEW column is invisible to logged-out visitors until it
-- is named here. The storefront reads both of these on every category tab.
grant select (display_rank, display_category_id) on partners to anon;

-- ----------------------------------------------------------- store search --
--
-- search_stores (0084) matched any active partner whose text contained every
-- typed word. That was harmless while every active store had stock. It stops
-- being harmless the moment a pinned, product-less store exists: typing its
-- name would return a result that opens onto a page with nothing to buy.
--
-- Same body as 0084 — same word splitting, same escaped LIKE metacharacters,
-- same security definer / fixed search_path — with one added requirement: the
-- store must have at least one active product. Unchanged otherwise, so the
-- injection-safety reasoning in 0084 still holds.

create or replace function search_stores(p_query text, p_limit int default 20)
returns table (
  id uuid, name text, slug text, city text, logo_url text,
  cover_image_url text, category_name text
)
language sql stable security definer set search_path = public as $$
  with terms as (
    select '%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%' as term
    from unnest(string_to_array(btrim(coalesce(p_query, '')), ' ')) as t
    where length(btrim(t)) > 0
  ),
  -- Everything about a store that a person might type, in one string per store.
  haystack as (
    select pa.id,
           pa.name || ' ' || coalesce(pa.description, '') || ' ' || coalesce(pa.city, '') || ' ' ||
           coalesce((
             select string_agg(distinct coalesce(pr.title, '') || ' ' || coalesce(c.name, '') || ' ' ||
                               coalesce(array_to_string(pr.tags, ' '), ''), ' ')
             from products pr
             left join categories c on c.id = pr.category_id
             where pr.partner_id = pa.id and pr.is_active
           ), '') as blob
    from partners pa
    where pa.status = 'active'
  )
  select pa.id, pa.name, pa.slug, pa.city, pa.logo_url, pa.cover_image_url,
    (select c.name from products pr2
       join categories c on c.id = pr2.category_id
      where pr2.partner_id = pa.id and pr2.is_active limit 1)
  from partners pa
  join haystack h on h.id = pa.id
  where length(btrim(coalesce(p_query, ''))) >= 2
    and (select count(*) from terms) > 0
    -- every word must appear somewhere in this store's text
    and not exists (
      select 1 from terms where h.blob not ilike terms.term escape '\'
    )
    -- 0096: nothing to sell, nothing to find. A search hit is a promise that
    -- tapping it lands somewhere with products on it.
    and exists (
      select 1 from products pr3 where pr3.partner_id = pa.id and pr3.is_active
    )
  order by pa.is_featured desc, pa.name
  limit greatest(1, least(coalesce(p_limit, 20), 50))
$$;

revoke all on function search_stores(text, int) from public;
grant execute on function search_stores(text, int) to anon, authenticated;
