-- 0101 — "Tops" becomes "T-shirts", so the tag has to mean t-shirts.
--
-- The tile was relabelled at Marwan's request. `type:tops` was deliberately
-- broad — anything worn on the upper body — and under the new label that reads
-- as a lie: of the ten Fashion products carrying it, four are not t-shirts.
--
--   Piqué Cotton Polo          a polo
--   Everyday Hoodie            a hoodie
--   Merino Crewneck            a knit sweater
--   Kids Mesh Top and Denim Look   a top, not a tee
--
-- Filing a hoodie under "T-shirts" is the same class of mistake as a photograph
-- that shows the wrong item: the shopper taps a word and gets something else.
--
-- So a narrower tag is added, matched only where the title actually says tee or
-- t-shirt. Six products qualify:
--
--   Heavyweight Cotton Tee
--   Kids Floral Tee and Shorts Set
--   Aigner Kids Logo T-Shirt
--   Aigner Kids Summer Print T-Shirt
--   Girls' Butterfly Print T-Shirt
--   DKNY Kids Graphic T-Shirt
--
-- `type:tops` is left in place rather than stripped. It is additive, it costs
-- nothing, and if a broader "Tops" row is ever wanted back the classification
-- is already there. Nothing else about any product changes.

update products
set tags = array_append(coalesce(tags, '{}'), 'type:tshirts')
where is_active
  and category_id = (select id from categories where slug = 'fashion')
  and not coalesce(tags, '{}') @> array['type:tshirts']
  and (
    title ilike '%t-shirt%'
    or title ilike '%tshirt%'
    or title ~* '\mtee\M'
  );
