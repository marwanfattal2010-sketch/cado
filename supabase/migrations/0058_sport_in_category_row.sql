-- ============================================================
-- 0058 — Sport was missing from the Shop-by-category row
--
-- 0053 added the Sport CATEGORY and 0055 added its TAB, but the
-- Shop-by-category circles are a third thing again: browse_tiles rows in a
-- `category_circles` block. So Sport appeared in the tab bar and nowhere in
-- the row below it. Spotted by Marwan, not by me.
--
-- Same lesson as 0055 and 0056, now for the fourth time: a category in this
-- project has to be added to categories, browse_tabs AND browse_tiles before
-- it is actually everywhere.
-- ============================================================

insert into browse_tiles (block_id, label, link_type, link_value, position, is_active)
select '4402eb56-fc41-4d69-aab2-2b650e58847b', 'Sport', 'category', 'sport', 10, true
where not exists (
  select 1 from browse_tiles
  where block_id = '4402eb56-fc41-4d69-aab2-2b650e58847b' and label = 'Sport'
);
