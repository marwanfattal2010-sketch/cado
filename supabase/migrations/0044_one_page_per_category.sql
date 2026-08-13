-- ============================================================
-- 0044 — One page per category
--
-- Data only; no schema change. Applied to production on 2026-08-13.
--
-- Every "Shop by category" circle on Home now lands on a category tab, and a
-- category tab is the category page — there is no separate /category/:slug
-- layout any more. Two consequences for the data:
--
--   1. Electronics needs a tab, because it was the only active category
--      without one. It has no products yet, so its page shows the honest
--      empty state and its banner is the typographic variant.
--   2. Entry cards and the deal pair belong to the All landing page, not to a
--      category page, whose shape is banner -> sub-category circles -> filter
--      bar -> grid -> stores. Deactivated rather than deleted, so switching
--      them back on is one update.
-- ============================================================

insert into browse_tabs (slug, label, position, accent_token, filter) values
  ('electronics', 'Electronics', 10, 'tab-electronics', '{"category_slug":"electronics"}'::jsonb)
on conflict (slug) do nothing;

-- The four blocks a category page has. Deliberately not the six the original
-- seed gave every tab.
insert into browse_blocks (tab_id, type, position, title)
select t.id, b.type, b.position, b.title
from browse_tabs t
cross join (values
  ('banner_carousel',  1, null::text),
  ('category_circles', 3, 'Shop by category'),
  ('stores',           5, 'Stores'),
  ('product_feed',     6, null)
) as b(type, position, title)
where t.slug = 'electronics'
on conflict (tab_id, position) do nothing;

insert into browse_banners (block_id, headline, subcopy, cta_label, link_type, link_value, position)
select b.id, 'Electronics, coming soon', 'No CADO store stocks these yet.', 'BROWSE GIFTS', 'url', '/', 1
from browse_blocks b
join browse_tabs t on t.id = b.tab_id
where t.slug = 'electronics' and b.type = 'banner_carousel'
on conflict (block_id, position) do nothing;

update browse_blocks b
   set is_active = false
  from browse_tabs t
 where b.tab_id = t.id
   and t.slug <> 'all'
   and b.type in ('entry_cards', 'deal_pair');
