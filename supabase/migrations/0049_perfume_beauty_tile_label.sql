-- ============================================================
-- 0049 — the last visible "Perfumes"
--
-- 0047 renamed the category and the tab, but the home page's category
-- circles are their own rows in browse_tiles and kept the old label. So the
-- tab bar said "Perfume & Beauty" while the circle under it still said
-- "Perfumes" — caught by verification step 11.
--
-- One update to one display label. Nothing else, and no slug is touched.
-- ============================================================

update browse_tiles
   set label = 'Perfume & Beauty'
 where label = 'Perfumes';
