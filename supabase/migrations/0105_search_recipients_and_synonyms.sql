-- 0105: search learns who a gift is FOR, and the words people actually type.
--
-- Two measured failures on the live catalogue, both in a gift shop's most
-- important box:
--
--   "mom"          -> 0 results, while 27 products are tagged `mother` and 5
--                     `mom`. `recipient_tags` was simply not in the haystack.
--   "best friend"  -> 0 results, while 56 products are tagged `friend`. Terms
--                     are ANDed word by word, so it demanded a product
--                     containing both "best" and "friend".
--
-- Being told a gift shop has nothing for your mother is the worst answer this
-- function can give, and it was wrong rather than empty.
--
-- TWO CHANGES, both additive. The blob gains `recipient_tags`; and the query
-- is expanded through a small synonym table BEFORE it is split into words, so
-- a phrase like "best friend" is replaced whole rather than fought word by
-- word.
--
-- THE SYNONYM LIST IS A LIST OF MEASURED GAPS, not a guess at what people
-- might mean. Every row was checked against real products first. It is
-- deliberately tiny: this is not a thesaurus, and a fuzzy match that returns
-- vaguely-related gifts is a worse failure than an honest empty page.
--
-- The client carries the same list (SEARCH_SYNONYMS in hooks/useProducts.ts)
-- for the inline results on the home page. Two copies, and they must change
-- together — noted in both.

create or replace function search_synonyms(p_word text)
returns text[]
language sql
immutable
as $$
  select case lower(btrim(p_word))
    -- 27 products carry `mother`, only 5 `mom`.
    when 'mom'    then array['mom', 'mother']
    when 'mum'    then array['mum', 'mother', 'mom']
    when 'mother' then array['mother', 'mom']
    -- 9 carry `father`, 4 `dad`.
    when 'dad'    then array['dad', 'father']
    when 'father' then array['father', 'dad']
    -- What people call a best friend. 56 products carry `friend`.
    when 'best friend' then array['friend']
    when 'bestfriend'  then array['friend']
    when 'bff'    then array['friend']
    when 'bsf'    then array['friend']
    when 'bestie' then array['friend']
    -- `kids` is on 1 product, `child` on 34.
    when 'kids' then array['kids', 'child']
    when 'kid'  then array['kid', 'child']
    -- The Flowers category has six products and not one has "flowers" in its
    -- title; they are bouquets, roses and plants. The category NAME is already
    -- in the blob, so this is belt and braces for a catalogue that is
    -- recategorised later.
    when 'flowers' then array['flowers', 'bouquet', 'rose', 'plant']
    when 'flower'  then array['flower', 'bouquet', 'rose', 'plant']
    else array[btrim(p_word)]
  end
$$;

comment on function search_synonyms is
  'Measured query gaps only. Mirrored in apps/web/src/hooks/useProducts.ts — change both.';

create or replace function search_products(p_query text, p_limit int default 40)
returns table (
  id uuid, title text, price numeric, compare_at_price numeric,
  partner_id uuid, partner_name text, partner_slug text,
  image_path text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with
  -- The whole query first, so a PHRASE can be replaced before it is split.
  -- "best friend" becomes "friend" here rather than becoming two words that
  -- must both appear.
  phrase as (
    select search_synonyms(btrim(coalesce(p_query, ''))) as words
  ),
  raw as (
    select btrim(t) as word, ord
    from phrase, unnest(phrase.words) with ordinality as u(t, ord)
    where length(btrim(t)) > 0
  ),
  -- Each word becomes a GROUP of acceptable alternates. A product has to
  -- satisfy every group, but any one alternate inside a group will do.
  expanded as (
    select r.ord,
           '%' || replace(replace(replace(alt, '\', '\\'), '%', '\%'), '_', '\_') || '%' as term
    from raw r, unnest(search_synonyms(r.word)) as alt
  ),
  hay as (
    select pr.id,
           pr.title || ' ' || coalesce(pr.description, '') || ' ' ||
           coalesce(array_to_string(pr.tags, ' '), '') || ' ' ||
           -- WHO IT IS FOR. The column this function was missing.
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
    and length(btrim(coalesce(p_query, ''))) >= 2
    and (select count(*) from raw) > 0
    -- Every group must be satisfied by at least one of its alternates.
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
revoke all on function search_synonyms(text) from public;
grant execute on function search_synonyms(text) to anon, authenticated;
