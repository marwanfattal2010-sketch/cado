-- 0099 — Tops, Sets and Shirts, as tags rather than subcategories.
--
-- The "What are you looking for?" row wants seven types: Tops, Sets, Shirts,
-- Bags, Caps, Belts, Scarves. Four of those are real Fashion subcategories.
-- The other three are not, and CANNOT be, because `products.subcategory_id`
-- holds one value: filing the Merino Crewneck under a new `tops` subcategory
-- would take it out of `men`, and doing that across the catalogue would empty
-- the Women / Men / Kids circles the row sits directly beneath. Women would
-- drop from 3 products to 2, Men from 5 to 1.
--
-- So a garment's CUT is recorded as a tag, alongside the department it is
-- filed under. `products.tags` already carries this kind of secondary axis —
-- migration 0094 put `flower:roses` and friends there for the same reason.
--
-- Every assignment below is read off the product's own title. Nothing is
-- guessed: a product whose title does not say what it is keeps no type tag
-- and simply does not appear behind those three tiles.

-- TOPS — anything worn on the upper body that is not a shirt or part of a set.
update products set tags = array_append(coalesce(tags, '{}'), 'type:tops')
where is_active
  and not coalesce(tags, '{}') @> array['type:tops']
  and (
    title ilike '%hoodie%'
    or title ilike '%crewneck%'
    or title ilike '%tee%'
    or title ilike '%t-shirt%'
    or title ilike '%polo%'
    or title ilike '%mesh top%'
  );

-- SETS — sold as more than one piece together.
update products set tags = array_append(coalesce(tags, '{}'), 'type:sets')
where is_active
  and not coalesce(tags, '{}') @> array['type:sets']
  and (title ilike '%set%' or title ilike '%and denim look%');

-- SHIRTS — a shirt proper. `%shirt%` alone would sweep in every T-shirt, so
-- the T-shirts are excluded explicitly; they are tops.
update products set tags = array_append(coalesce(tags, '{}'), 'type:shirts')
where is_active
  and not coalesce(tags, '{}') @> array['type:shirts']
  and title ilike '%shirt%'
  and title not ilike '%t-shirt%'
  and title not ilike '%tee%';
