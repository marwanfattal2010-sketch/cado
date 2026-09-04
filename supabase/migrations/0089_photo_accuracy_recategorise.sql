-- 0089 — Photo accuracy: put products in the category the label promises.
--
-- WHY THIS IS A DATA MIGRATION AND NOT AN IMAGE SWAP.
--
-- Every decorative image on a category tab — the recipient circles, the entry
-- tiles, the shop-by-category circles, the hero — is a REAL photo of a REAL
-- product drawn from the pool that matches that label. Nothing is stock art.
-- So when the Fashion "Women" circle shows a kids t-shirt, the picture is not
-- wrong: the product is filed under Women and it is a kids t-shirt. Replacing
-- the picture would hide the fault and leave the grid behind the circle just
-- as wrong. Filing the product correctly fixes the circle, the tile, the
-- filter counts and the grid in one move.
--
-- Every row below was read title-by-title against its current bucket; nothing
-- is inferred from a pattern match, and no product is deleted or deactivated.

-- 1 -------------------------------------------------------------------------
-- Jewels & Accs gains the four types it was missing. Bags, belts and scarves
-- are accessories, not clothing, so they live here rather than in Fashion;
-- Earrings existed as products but had no bucket, so they were filed under
-- Necklaces and Rings.

insert into subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.sort_order
from categories c
cross join (values
  ('Earrings', 'earrings', 40),
  ('Bags',     'bags',     60),
  ('Belts',    'belts',    70),
  ('Scarves',  'scarves',  80)
) as v(name, slug, sort_order)
where c.slug = 'jewelry-accessories'
  and not exists (
    select 1 from subcategories s
    where s.category_id = c.id and s.slug = v.slug
  );

-- 2 -------------------------------------------------------------------------
-- Fashion: the kids clothing filed under Men and Women.
--
-- This is what put a kids t-shirt on the "Men" circle and a kids pinafore on
-- "Women". Fashion keeps them — they are clothing — they just move to Kids.

update products p
set subcategory_id = (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'kids-fashion'
)
where p.title in (
  'Aigner Kids Logo T-Shirt',
  'Aigner Kids Summer Print T-Shirt',
  'DKNY Kids Graphic T-Shirt',
  'Girls'' Butterfly Print T-Shirt',
  'Kids Pinstripe Pinafore Dress',
  'Kids Floral Tee and Shorts Set',
  'Kids Mesh Top and Denim Look',
  'Zadig & Voltaire Kids Wing Cap'
)
and p.category_id = (select id from categories where slug = 'fashion');

-- 3 -------------------------------------------------------------------------
-- Fashion -> Jewels & Accs: bags, belts and scarves.
--
-- The reported "duffel bag on a Fashion recipient circle" and "black bag used
-- for Her" are both this: a bag sitting in the clothing category, so the
-- clothing circles could pick it.

update products p
set category_id = (select id from categories where slug = 'jewelry-accessories'),
    subcategory_id = (
      select s.id from subcategories s
      join categories c on c.id = s.category_id
      where c.slug = 'jewelry-accessories' and s.slug = 'bags'
    )
where p.title in ('Bugatti Men Bag', 'Leather Weekend Bag')
  and p.category_id = (select id from categories where slug = 'fashion');

update products p
set category_id = (select id from categories where slug = 'jewelry-accessories'),
    subcategory_id = (
      select s.id from subcategories s
      join categories c on c.id = s.category_id
      where c.slug = 'jewelry-accessories' and s.slug = 'scarves'
    )
where p.title in ('Bugatti Men Scarf', 'Cashmere Wrap Scarf')
  and p.category_id = (select id from categories where slug = 'fashion');

update products p
set category_id = (select id from categories where slug = 'jewelry-accessories'),
    subcategory_id = (
      select s.id from subcategories s
      join categories c on c.id = s.category_id
      where c.slug = 'jewelry-accessories' and s.slug = 'belts'
    )
where p.title = 'Geox Men Belt'
  and p.category_id = (select id from categories where slug = 'fashion');

-- 4 -------------------------------------------------------------------------
-- Jewels & Accs: earrings filed under Necklaces and Rings, and a bracelet set
-- filed under Watches. The "Watches" circle was showing a cord bracelet.

update products p
set subcategory_id = (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'jewelry-accessories' and s.slug = 'earrings'
)
where p.title in ('Classic Pearl Earrings', 'Cortefiel Women Earrings')
  and p.category_id = (select id from categories where slug = 'jewelry-accessories');

update products p
set subcategory_id = (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'jewelry-accessories' and s.slug = 'bracelets'
)
where p.title = 'Woven Cord Bracelet Set'
  and p.category_id = (select id from categories where slug = 'jewelry-accessories');

-- 5 -------------------------------------------------------------------------
-- Chocolate -> Gift Sets: the two baskets that contain no chocolate.
--
-- This is the reported "Chocolate tiles showing breakfast/pastry scenes". The
-- photos are accurate — a Breakfast in Bed Basket really is a breakfast scene
-- — they were simply in the wrong category. Both are hampers, which is a real
-- Gift Sets bucket, so nothing is lost from the catalogue.
--
-- The Luxury Nut & Chocolate Basket and the Artisan Cookie Tin stay: one
-- contains chocolate, the other is confectionery from the same shelf.

update products p
set category_id = (select id from categories where slug = 'gift-sets'),
    subcategory_id = (
      select s.id from subcategories s
      join categories c on c.id = s.category_id
      where c.slug = 'gift-sets' and s.slug = 'hampers-and-baskets'
    )
where p.title in ('Breakfast in Bed Basket', 'Gourmet Cheese & Wine Basket')
  and p.category_id = (select id from categories where slug = 'chocolate');
