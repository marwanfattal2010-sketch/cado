-- ============================================================
-- 0053 — homepage tile row, Gift Sets, Sport
--
-- Reversible by design. Nothing is deleted except tile rows, which are
-- presentation and are recreated by this file. No product is deleted.
--
-- GS'S PRODUCTS ARE DEACTIVATED, NOT DELETED.
--
-- The eleven products in Home & Gifts are NOT seed data — checked against
-- dashboard_seed_registry: none seeded, none with placeholder prices, all
-- belonging to GS, a real partner, with real stock. So they are switched off
-- rather than removed. `is_active = false` is undone with one update; a
-- delete is not. Marwan chose this explicitly.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Home & Gifts becomes Gift Sets
--
-- A new category rather than a rename in place, so the old contents do not
-- come along with the new name. Home & Gifts is switched off and keeps its
-- products; Gift Sets starts empty and takes its slot in the row.
-- ------------------------------------------------------------

update products p
   set is_active = false
  from categories c
 where c.id = p.category_id
   and c.slug = 'home-gifts';

update categories set is_active = false where slug = 'home-gifts';

insert into categories (name, slug, icon_name, sort_order, is_active)
select 'Gift Sets', 'gift-sets', 'gift', 7, true
where not exists (select 1 from categories where slug = 'gift-sets');

-- ------------------------------------------------------------
-- 2. Sport, after Electronics
--
-- Football kits, boots, activewear, trainers, bags, equipment. Brands appear
-- only as real stock in a product title — no brand logo, wordmark or
-- branding is ever reproduced in the UI.
-- ------------------------------------------------------------

insert into categories (name, slug, icon_name, sort_order, is_active)
select 'Sport', 'sport', 'sport', 10, true
where not exists (select 1 from categories where slug = 'sport');

-- ------------------------------------------------------------
-- 3. The entry tile row
--
-- Same-day goes from EVERY tab, not just home: it applies to every order, so
-- it is not a differentiator anywhere. Gift Cards and Group Gift are added
-- to the home row only, because that is the row Marwan specified.
--
-- Group Gift deep-links into the group flow rather than the Gift Cards tab —
-- landing on the tab would make it a duplicate of the tile beside it.
-- ------------------------------------------------------------

delete from browse_tiles t
 using browse_blocks b
 where b.id = t.block_id
   and b.type = 'entry_cards'
   and t.label = 'Same-day';

-- Gift Cards also comes out of the Shop-by-category row wherever it appears:
-- it is already the bottom-nav tab and now an entry tile too, and three
-- doors into one screen is two too many.
delete from browse_tiles t
 using browse_blocks b
 where b.id = t.block_id
   and b.type <> 'entry_cards'
   and t.label in ('Gift Cards', 'Gift cards');

-- Occasions moves to the end so the two new tiles sit before it.
update browse_tiles t
   set position = 6
  from browse_blocks b, browse_tabs tab
 where b.id = t.block_id and tab.id = b.tab_id
   and b.type = 'entry_cards' and tab.slug = 'home'
   and t.label = 'Occasions';

insert into browse_tiles (block_id, label, link_type, link_value, position, is_active)
select b.id, v.label, 'url', v.link, v.pos, true
from browse_blocks b
join browse_tabs tab on tab.id = b.tab_id
cross join (values
  ('Gift Cards', '/gift-cards',            4),
  ('Group Gift', '/gift-cards/group/new',  5)
) as v(label, link, pos)
where b.type = 'entry_cards' and tab.slug = 'home'
  and not exists (
    select 1 from browse_tiles x where x.block_id = b.id and x.label = v.label
  );
