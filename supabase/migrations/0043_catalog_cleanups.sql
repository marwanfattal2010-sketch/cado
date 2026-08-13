-- ============================================================
-- 0043 — Catalogue cleanups
--
-- Four changes Marwan asked for (2026-08). All of them are edits to labels
-- and to browse configuration; no product row is moved, deleted or reparented
-- by this migration, and nothing is dropped.
-- ============================================================

-- ------------------------------------------------------------
-- 1. "Flowers & Gifts" is just Flowers.
--
-- The tab already read "Flowers"; this is the category itself and the circle
-- tile, which were both still carrying the longer name.
-- ------------------------------------------------------------
update categories set name = 'Flowers' where slug = 'flowers-gifts';

update browse_tiles
   set label = 'Flowers'
 where link_type = 'category' and link_value = 'flowers-gifts';

-- ------------------------------------------------------------
-- 2. Fashion is clothing only.
--
-- Shoes and Jewelry & Accessories are top-level categories in their own
-- right, and duplicating them as Fashion subcategories gave the same kind of
-- product two paths. Deactivated rather than deleted: they are referenced by
-- products.subcategory_id, and switching them off is reversible where a
-- delete is not.
--
-- Nothing is stranded by this. Every active Fashion product is either
-- unassigned or in women / men / kids-fashion — zero use either of these two
-- (checked against production before writing this), so no product changes
-- category and none can end up on both paths.
-- ------------------------------------------------------------
update subcategories s
   set is_active = false
  from categories c
 where s.category_id = c.id
   and c.slug = 'fashion'
   and s.slug in ('shoes', 'accessories');

-- The circle tiles were seeded from those rows, so they have to go too —
-- browse_tiles holds its own copy of the label and does not follow.
update browse_tiles t
   set is_active = false
  from browse_blocks b
  join browse_tabs tb on tb.id = b.tab_id
 where t.block_id = b.id
   and b.type = 'category_circles'
   and tb.slug = 'fashion'
   and t.link_type = 'collection'
   and t.link_value in ('shoes', 'accessories');

-- ------------------------------------------------------------
-- 3. Gift Cards joins the category row.
--
-- A real destination that already exists (/gift-cards) and a real image the
-- project already ships, so this is not a placeholder tile. It goes last,
-- after Electronics.
-- ------------------------------------------------------------
insert into browse_tiles (block_id, label, image_url, link_type, link_value, position)
select b.id,
       'Gift Cards',
       '/categories/gift-card.jpg',
       'url',
       '/gift-cards',
       coalesce(max(t.position), 0) + 1
  from browse_blocks b
  join browse_tabs tb on tb.id = b.tab_id
  left join browse_tiles t on t.block_id = b.id
 where b.type = 'category_circles' and tb.slug = 'all'
 group by b.id
on conflict (block_id, position) do nothing;

-- ------------------------------------------------------------
-- 4. "Under $25" becomes "Under $50".
--
-- The band moved in lib/filters.ts at the same time, and the tile now routes
-- straight to the filtered grid rather than narrowing the feed in place, so
-- the label, the band and the results page all say the same thing.
--
-- Worth recording, because the brief assumed otherwise: three active products
-- do sit under $25 today ($14.25, $14.50, $19). "Under $50" covers 23 of the
-- 72 active products.
-- ------------------------------------------------------------
update browse_tiles
   set label = 'Under $50',
       link_type = 'url',
       link_value = '/gift-finder?budget=under-50'
 where label = 'Under $25';
