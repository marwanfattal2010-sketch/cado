-- ============================================================
-- 0056 — the last three "Home & Gifts"
--
-- Found by loading the live page and then grepping EVERY table that holds a
-- display string, not just the obvious one. A label in this project lives in
-- up to five places: categories, browse_tabs, browse_tiles, browse_blocks
-- and browse_banners. 0053 and 0055 each fixed one and left the rest.
--
--   1. the category circle in the Shop-by-category row (browse_tiles)
--   2. the deactivated category itself, still named the old thing
--   3. the hero banner copy for that tab
-- ============================================================

update browse_tiles
   set label = 'Gift Sets',
       link_value = replace(coalesce(link_value, ''), 'home-gifts', 'gift-sets')
 where id = '389d1791-bdad-4a52-b908-8c782b7fc0e8';

-- The category keeps GS's switched-off products, so it is renamed rather
-- than left sitting there under the old name.
update categories
   set name = 'Gift Sets (old home decor — switched off)'
 where id = 'df139635-b2fa-4d1e-beb2-c60ec351caff';

update browse_banners
   set headline = 'Boxed up, ready to give',
       subcopy  = 'Teddies, mugs and chocolates, made up as one gift.'
 where id = '242c5dba-5876-48e9-b67a-8d1730fa03b1';
