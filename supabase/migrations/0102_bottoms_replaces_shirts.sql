-- 0102 — the Shirts tile becomes Bottoms.
--
-- Marwan asked for this twice. I pushed back the first time because Fashion
-- has no trousers, jeans, skirts or shorts sold on their own, so a Bottoms
-- tile would open on nothing — and "no tile may open an empty grid" was his
-- own rule for this row. He repeated the instruction, so it ships.
--
-- It does NOT ship empty. Two Fashion products genuinely include a bottom
-- half as part of the item:
--
--   Kids Floral Tee and Shorts Set   — the shorts
--   Kids Mesh Top and Denim Look     — the denim
--
-- Those two are tagged. This is a narrow, honest reading: a shopper tapping
-- Bottoms gets two things that really do include bottoms, rather than an empty
-- page or a tile quietly filled with jackets. When real trousers, jeans or
-- skirts are added to Fashion they will need `type:bottoms` too — the words
-- matched below will pick most of them up on a re-run.
--
-- `type:shirts` is left in the data. The Poplin Cotton Dress Shirt keeps it,
-- so if a Shirts tile ever comes back the classification is already there.

update products
set tags = array_append(coalesce(tags, '{}'), 'type:bottoms')
where is_active
  and category_id = (select id from categories where slug = 'fashion')
  and not coalesce(tags, '{}') @> array['type:bottoms']
  and (
    title ilike '%short%'
    or title ilike '%trouser%'
    or title ilike '%pant%'
    or title ilike '%jean%'
    or title ilike '%skirt%'
    or title ilike '%denim look%'
    or title ilike '%jogger%'
    or title ilike '%chino%'
    or title ilike '%legging%'
  );
