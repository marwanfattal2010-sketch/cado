-- 0094 — Flowers: the two missing categories, plus flower type and colour.
--
-- NO NEW COLUMNS. Flower type rides in `products.tags` as `flower:roses`,
-- which is an existing text[] a store owner can already edit; colour uses the
-- existing `products.color` and its `color_is_placeholder` flag.
--
-- WHAT IS AND IS NOT CLASSIFIED, and why it matters.
--
-- A product gets a flower type or a colour only where its OWN title or
-- description says so. "Soft pink peonies" gives both. "A dozen premium roses,
-- hand-tied with seasonal greenery" gives the type and says nothing about
-- colour, so the colour stays unset — a rose bouquet is not necessarily red,
-- and a Colour filter that guesses is a filter that lies to someone buying a
-- gift. Unset means the product simply does not appear under any colour,
-- which is the honest outcome and is visible to the shopper as a smaller
-- result count rather than a wrong one.

-- 1 -------------------------------------------------------------------------
-- The two categories Flowers was missing. They start empty, so neither the
-- circle row nor the Category facet will show them until something is filed
-- there — both already skip a subcategory with no products.

insert into subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.sort_order
from categories c
cross join (values
  ('Vase arrangements', 'vase-arrangements', 40),
  ('Dried & preserved', 'dried-preserved', 50)
) as v(name, slug, sort_order)
where c.slug = 'flowers-gifts'
  and not exists (
    select 1 from subcategories s where s.category_id = c.id and s.slug = v.slug
  );

-- 2 -------------------------------------------------------------------------
-- Flower type, from what each product says about itself.
--
--   Signature Rose Bouquet   "A dozen premium roses"          -> roses
--   Peony Garden Bouquet     "Soft pink peonies"              -> peonies
--   Teddy & Tulips Set       "Fresh tulips"                   -> tulips
--   Luxury Orchid Arrangement"Statement white orchids"        -> orchids
--   Wildflower Meadow        "a mix of seasonal wildflowers"  -> mixed
--   Cedar & Wildflower Box   "local wildflowers"              -> mixed
--
-- Six of six classified. Nothing was inferred from a photograph.

update products set tags = array(select distinct unnest(tags || array['flower:roses']))
where title = 'Signature Rose Bouquet';

update products set tags = array(select distinct unnest(tags || array['flower:peonies']))
where title = 'Peony Garden Bouquet';

update products set tags = array(select distinct unnest(tags || array['flower:tulips']))
where title = 'Teddy & Tulips Set';

update products set tags = array(select distinct unnest(tags || array['flower:orchids']))
where title = 'Luxury Orchid Arrangement';

update products set tags = array(select distinct unnest(tags || array['flower:mixed']))
where title in ('Wildflower Meadow', 'Cedar & Wildflower Box');

-- 3 -------------------------------------------------------------------------
-- Colour, only where the product states one.
--
-- Every Flowers row currently carries `color_is_placeholder = true`, i.e. a
-- value somebody typed in without evidence. Four are recoverable from the
-- product's own words and are promoted to real; two are not and are cleared,
-- so they stop pretending to a colour nobody verified.

update products set color = 'White', color_is_placeholder = false
where title = 'Luxury Orchid Arrangement';               -- "Statement white orchids"

update products set color = 'Pink', color_is_placeholder = false
where title = 'Peony Garden Bouquet';                    -- "Soft pink peonies"

update products set color = 'Mixed', color_is_placeholder = false
where title in ('Wildflower Meadow', 'Cedar & Wildflower Box');  -- a mix, by definition

-- Not stated anywhere on the product. "Signature Rose Bouquet" was recorded as
-- Red and "Teddy & Tulips Set" as Pink; neither description says so.
update products set color = null, color_is_placeholder = false
where title in ('Signature Rose Bouquet', 'Teddy & Tulips Set');
