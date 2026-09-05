-- 0106: a synonym set is ONE choice, not several requirements.
--
-- 0105 expanded "flowers" into {flowers, bouquet, rose, plant} and then fed
-- that array into the word splitter — which treats every element as a separate
-- word that must ALSO be present. So searching "flowers" demanded a product
-- containing the word flowers AND bouquet AND rose AND plant, and returned
-- nothing at all. Measured: 0 hits, worse than before the synonyms existed.
--
-- The distinction the code was missing: ANDing across the words a person
-- typed is right ("gold necklace" should mean both), but the alternates for
-- ONE of those words are an OR — any of them will do.
--
-- So the query resolves down one of two paths:
--
--   the whole string has a synonym entry  -> ONE group holding its alternates
--   it does not                            -> one group per typed word, each
--                                             holding that word's alternates
--
-- A product must satisfy every group, and any single alternate satisfies its
-- group. "best friend" becomes one group {friend}; "gold necklace" stays two
-- groups {gold} and {necklace}.

create or replace function search_products(p_query text, p_limit int default 40)
returns table (
  id uuid, title text, price numeric, compare_at_price numeric,
  partner_id uuid, partner_name text, partner_slug text,
  image_path text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with
  q as (select btrim(coalesce(p_query, '')) as text),
  -- Does the WHOLE string have an entry? `search_synonyms` returns the input
  -- unchanged when it does not, so comparing against that is the test.
  phrase as (
    select q.text, search_synonyms(q.text) as alts from q
  ),
  groups as (
    -- Path 1: a phrase or single word with synonyms. One group, many options.
    select 1 as ord, alt
    from phrase, unnest(phrase.alts) as alt
    where phrase.alts <> array[phrase.text]

    union all

    -- Path 2: no entry. One group per typed word, each with its own options
    -- (which for most words is just the word).
    select w.ord, alt
    from phrase,
         unnest(string_to_array(phrase.text, ' ')) with ordinality as w(word, ord),
         unnest(search_synonyms(w.word)) as alt
    where phrase.alts = array[phrase.text]
      and length(btrim(w.word)) > 0
  ),
  expanded as (
    select ord,
           '%' || replace(replace(replace(alt, '\', '\\'), '%', '\%'), '_', '\_') || '%' as term
    from groups
  ),
  hay as (
    select pr.id,
           pr.title || ' ' || coalesce(pr.description, '') || ' ' ||
           coalesce(array_to_string(pr.tags, ' '), '') || ' ' ||
           coalesce(array_to_string(pr.recipient_tags, ' '), '') || ' ' ||
           coalesce(array_to_string(pr.occasion_tags, ' '), '') || ' ' ||
           coalesce((select c.name from categories c where c.id = pr.category_id), '') || ' ' ||
           coalesce((select s.name from subcategories s where s.id = pr.subcategory_id), '') as blob
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
    and length((select text from q)) >= 2
    and (select count(*) from expanded) > 0
    and not exists (
      select 1
      from (select distinct ord from expanded) g
      where not exists (
        select 1 from expanded e
        where e.ord = g.ord and hay.blob ilike e.term escape '\'
      )
    )
  order by pr.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100))
$$;

revoke all on function search_products(text, int) from public;
grant execute on function search_products(text, int) to anon, authenticated;
