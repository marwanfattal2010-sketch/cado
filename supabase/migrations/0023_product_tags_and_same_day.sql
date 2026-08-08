-- PROMPT 1 (build spec Part 2): make homepage sections real filters over one
-- product list, so a product can only ever have one price.
--
-- The homepage previously rendered Trending / Most Gifted / New from a
-- hardcoded array with three different price arrays over the same 8 items —
-- so "Bouquet of Red Roses" showed $42, $45 and $40 on one screen. The fix
-- is not a mock catalogue (the real table already has 47 products with real
-- prices, images and stores); it's the two fields the table was missing so
-- those sections can be genuine filters.

-- 'trending' | 'most-gifted' | 'new' | 'staff-pick'
alter table products add column if not exists tags text[] not null default '{}';

-- Drives the green "Arrives today" badge and the Need It Today section.
-- Default true: most of the catalogue is stocked locally.
alter table products add column if not exists same_day boolean not null default true;

create index if not exists products_tags_idx on products using gin (tags);
create index if not exists products_same_day_idx on products (same_day) where same_day;

-- Idempotent: clear before assigning so re-running can't duplicate tags.
update products set tags = '{}';

update products set tags = array_append(tags, 'trending') where title in (
  'Signature Rose Bouquet', 'Belgian Truffle Box', 'Layered Chain Necklace',
  'Signature Eau de Parfum', 'Cashmere Wrap Scarf', 'Glow Ritual Set',
  'Celebration Cake', 'Classic Steel Watch'
);

update products set tags = array_append(tags, 'most-gifted') where title in (
  'Peony Garden Bouquet', 'Red Velvet Celebration Cake', 'Birthstone Pendant',
  'Citrus Bloom Eau de Toilette', 'Self-Care Skincare Set', 'Classic Pearl Earrings',
  'Luxury Orchid Arrangement', 'Chocolate Fudge Cake'
);

update products set tags = array_append(tags, 'new') where title in (
  'Cedar & Wildflower Box', 'Artisan Cookie Tin', 'Woven Cord Bracelet Set',
  'Amber Oud Eau de Parfum', 'Merino Crewneck', 'Rose Clay Mask Duo',
  'Minimalist Chain Bracelet', 'Wildflower Meadow'
);

update products set tags = array_append(tags, 'staff-pick') where title in (
  'Gold Vermeil Pendant', 'Gourmet Cheese & Wine Basket', 'Silk Wrap Dress',
  'Deluxe Makeup Palette', 'Leather Weekend Bag', 'The Housewarming Box'
);

-- Keep is_trending consistent with the new tag so nothing reads stale.
update products set is_trending = (tags @> array['trending']);

-- A few genuinely aren't same-day (made to order / not held in stock). The
-- badge has to be true or it's a promise the business can't keep.
update products set same_day = false
where title in ('Classic Pearl Earrings', 'Leather Weekend Bag', 'Tailored Blazer', 'Canvas Weekend Bag');

-- Two low-stock products so the "Only N left" state is actually reachable.
update products set stock_quantity = 2
where title in ('Luxury Orchid Arrangement', 'Engraved Signet Ring');
