-- ============================================================
-- 0057 — the two new tiles were on the wrong tab
--
-- 0053 deleted Same-day from EVERY entry_cards block but inserted Gift Cards
-- and Group Gift into only the tab whose slug is `home` — which, confusingly,
-- is the Gift Sets tab, not the homepage. The homepage is the tab slugged
-- `all`. So the delete worked everywhere and the insert worked nowhere the
-- shopper could see.
--
-- Caught by reading the rendered tile row rather than trusting the row count
-- from the insert.
-- ============================================================

update browse_tiles t
   set position = 6
  from browse_blocks b, browse_tabs tab
 where b.id = t.block_id and tab.id = b.tab_id
   and b.type = 'entry_cards' and tab.slug = 'all'
   and t.label = 'Occasions';

insert into browse_tiles (block_id, label, link_type, link_value, position, is_active)
select b.id, v.label, 'url', v.link, v.pos, true
from browse_blocks b
join browse_tabs tab on tab.id = b.tab_id
cross join (values
  ('Gift Cards', '/gift-cards',           4),
  ('Group Gift', '/gift-cards/group/new', 5)
) as v(label, link, pos)
where b.type = 'entry_cards' and tab.slug = 'all'
  and not exists (
    select 1 from browse_tiles x where x.block_id = b.id and x.label = v.label
  );
