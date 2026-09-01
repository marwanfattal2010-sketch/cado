-- 0084: search matches WORDS, not the whole phrase.
--
-- 0083's search_stores matched the query as one literal string, so "necklace"
-- found two jewellers and "blue necklace" found nothing — the exact example in
-- the brief. Real queries are several words that live in different places: the
-- colour is on the product, the noun is in the title, the shop's name is
-- neither.
--
-- Both functions below split the query on whitespace and require EVERY term to
-- match somewhere. `like` metacharacters are escaped so "50%" is a search for
-- fifty percent rather than a wildcard, and building the filter here keeps
-- user text out of a client-composed PostgREST `.or()` string — the injection
-- trap this codebase has hit before.

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
  order by pa.is_featured desc, pa.name
  limit greatest(1, least(coalesce(p_limit, 20), 50))
$$;

revoke all on function search_stores(text, int) from public;
grant execute on function search_stores(text, int) to anon, authenticated;

/**
 * Products for the Items tab. Same rule: every word must match the title, the
 * description, a hashtag or the category name.
 */
create or replace function search_products(p_query text, p_limit int default 40)
returns table (
  id uuid, title text, price numeric, compare_at_price numeric,
  partner_id uuid, partner_name text, partner_slug text,
  image_path text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with terms as (
    select '%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%' as term
    from unnest(string_to_array(btrim(coalesce(p_query, '')), ' ')) as t
    where length(btrim(t)) > 0
  ),
  hay as (
    select pr.id,
           pr.title || ' ' || coalesce(pr.description, '') || ' ' ||
           coalesce(array_to_string(pr.tags, ' '), '') || ' ' ||
           coalesce((select c.name from categories c where c.id = pr.category_id), '') as blob
    from products pr
    where pr.is_active
  )
  select pr.id, pr.title, pr.price, pr.compare_at_price,
         pr.partner_id, pa.name, pa.slug,
         (select pi.storage_path from product_images pi
           where pi.product_id = pr.id order by pi.is_primary desc, pi.sort_order limit 1),
         pr.created_at
  from products pr
  join partners pa on pa.id = pr.partner_id and pa.status = 'active'
  join hay on hay.id = pr.id
  where pr.is_active
    and length(btrim(coalesce(p_query, ''))) >= 2
    and (select count(*) from terms) > 0
    and not exists (select 1 from terms where hay.blob not ilike terms.term escape '\')
  order by pr.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100))
$$;

revoke all on function search_products(text, int) from public;
grant execute on function search_products(text, int) to anon, authenticated;
