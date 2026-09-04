-- 0100 — the type: tags belong to Fashion, and only to Fashion.
--
-- 0099 wrote `type:tops`, `type:sets` and `type:shirts` by matching product
-- TITLES across the entire catalogue. The words it matched are not specific to
-- clothing, so the tags landed far outside Fashion:
--
--   type:sets  caught 21 rows — Linen Bedding Set, Pour-Over Coffee Set,
--              Wooden Building Blocks Set, Yoga Mat & Cork Blocks Set,
--              Turkish Cotton Towel Set, six Gift Sets boxes, and
--              Teddy & Tulips (a bouquet).
--   type:tops  caught a Classic Steel Watch.
--
-- These tags exist for one thing: the "What are you looking for?" tiles on the
-- FASHION tab. A shopper tapping "Sets" there is asking for a coordinated
-- outfit, and would have been shown bedding.
--
-- So the tags are stripped everywhere outside Fashion. Nothing else about
-- those products changes — they keep their category, their own tags and their
-- place in every other surface. This is additive in the sense that matters:
-- no row is deleted and no product is deactivated.
--
-- After this runs, within Fashion:
--   type:tops    10 products
--   type:sets     2 products
--   type:shirts   1 product
-- Every tile still has something behind it, so none opens an empty grid.

update products p
set tags = (
  select coalesce(array_agg(t), '{}')
  from unnest(coalesce(p.tags, '{}')) as t
  where t not in ('type:tops', 'type:sets', 'type:shirts')
)
where coalesce(p.tags, '{}') && array['type:tops', 'type:sets', 'type:shirts']
  and p.category_id is distinct from (
    select id from categories where slug = 'fashion'
  );
