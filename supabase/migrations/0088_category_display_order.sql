-- Bring the three ordering columns into step with lib/categories.ts.
--
-- The storefront no longer READS any of these for order — it sorts by the
-- CATEGORY_ORDER array — but the dashboard, any direct query and anything
-- built later still do, so leaving them stale would be a trap for the next
-- person. The array remains the source of truth; this keeps the rows honest.
--
-- Purely additive: no column added, dropped or made stricter, no row created
-- or deleted. It writes existing integer columns only, so the deployed site is
-- correct on both sides of it whichever lands first.
--
-- Order (left to right): All, Fashion, Flowers, Chocolate, Perfume & Beauty,
-- Jewels & Accs, Gift Sets, Toys, Shoes, Electronics, Sport, Home & Appliances.
--
-- Matched on SLUG, never on name — "Jewelry & Accessories" was renamed to
-- "Jewels & Accs" and a rename must not be able to reorder the shop.

create temporary table _cat_order (slug text primary key, pos int) on commit drop;

insert into _cat_order (slug, pos) values
  ('fashion',             2),
  ('flowers-gifts',       3),
  ('chocolate',           4),
  ('perfumes',            5),
  ('jewelry-accessories', 6),
  ('gift-sets',           7),
  ('toys',                8),
  ('shoes',               9),
  ('electronics',        10),
  ('sport',              11),
  ('home-appliances',    12);

-- 1. categories.sort_order — read by useCategories: chip rows, Browse,
--    Wishlist, the gift assistant, the category pages.
update categories c
set sort_order = o.pos
from _cat_order o
where c.slug = o.slug;

-- 2. browse_tabs.position — the tab bar and the swipe order. The All tab has
--    no category filter and keeps position 1.
update browse_tabs t
set position = 1
where t.slug = 'all';

update browse_tabs t
set position = o.pos
from _cat_order o
where (t.filter ->> 'category_slug') = o.slug;

-- 3. browse_tiles.position — the "Shop by category" circles on the All tab and
--    the grid in the all-categories sheet.
--
--    (block_id, position) is UNIQUE, so the new numbers are parked out of the
--    way first; assigning them directly collides with whatever still holds the
--    slot. Offset by 100 rather than negated because the column is a plain int
--    with no sign constraint but the rest of the app assumes positives.
update browse_tiles t
set position = t.position + 100
from browse_blocks b, _cat_order o
where t.block_id = b.id
  and b.type = 'category_circles'
  and t.link_type = 'category'
  and t.link_value = o.slug;

update browse_tiles t
set position = o.pos
from browse_blocks b, _cat_order o
where t.block_id = b.id
  and b.type = 'category_circles'
  and t.link_type = 'category'
  and t.link_value = o.slug;
