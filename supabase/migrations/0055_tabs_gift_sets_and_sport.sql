-- ============================================================
-- 0055 — the tab row was missed by 0053
--
-- 0053 renamed the CATEGORY but the tab bar and the Shop-by-category row are
-- drawn from `browse_tabs`, which is a separate table with its own labels and
-- its own filter. So the category became Gift Sets while every tab still said
-- Home & Gifts, and Sport had no tab at all. Caught by loading the live page
-- at 375px rather than trusting the migration.
--
-- The same trap as 0047/0049: a display label in this project usually lives
-- in more than one table. Always check browse_tabs AND browse_tiles AND
-- categories before calling a rename done.
-- ============================================================

update browse_tabs
   set label = 'Gift Sets',
       filter = '{"category_slug":"gift-sets"}'::jsonb
 where slug = 'home-gifts';

update browse_tabs set slug = 'gift-sets' where slug = 'home-gifts';

insert into browse_tabs (slug, label, position, accent_token, filter, is_active)
select 'sport', 'Sport',
       (select coalesce(max(position), 0) + 1 from browse_tabs),
       'tab-sport', '{"category_slug":"sport"}'::jsonb, true
where not exists (select 1 from browse_tabs where slug = 'sport');
