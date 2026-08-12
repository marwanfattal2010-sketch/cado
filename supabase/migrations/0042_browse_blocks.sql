-- ============================================================
-- 0042 — Browse blocks: the /shop tab experience, driven by data
--
-- Four additive tables. Nothing existing is altered or dropped.
--
-- The point of these tables is that adding a tab, a tile or a banner is a
-- database row, not a deploy. `browse_tabs` is the tab bar; `browse_blocks`
-- is the ordered list of sections inside one tab; `browse_tiles` and
-- `browse_banners` are the contents of the blocks that have contents.
--
-- Phase 1 seeds six tabs: All, Jewelry & Accessories, Shoes, Perfumes,
-- Chocolate, Flowers. Men and Women are deliberately NOT seeded (Marwan,
-- 2026-08: "dont add men and woman"). Their audience-tab machinery is not
-- built either — there is no `audience` column on products, so an audience
-- tab could not be filled with anything real today.
--
-- Every seeded tile points at a category or subcategory row that already
-- exists. No banner is seeded with an image URL: a banner row with only
-- headline/subcopy renders the typographic variant, so the page is honest
-- until real artwork exists.
-- ============================================================

create table browse_tabs (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  label        text not null,
  label_ar     text,
  position     int  not null,
  accent_token text not null,                          -- e.g. 'tab-shoes'
  filter       jsonb not null default '{}'::jsonb,     -- {"category_slug": "..."}
  is_active    boolean not null default true
);

create table browse_blocks (
  id        uuid primary key default gen_random_uuid(),
  tab_id    uuid not null references browse_tabs(id) on delete cascade,
  type      text not null check (type in
              ('banner_carousel','entry_cards','sub_tabs','category_circles',
               'deal_pair','stores','product_feed')),
  position  int  not null,
  title     text,
  config    jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  -- Doubles as the ordering guarantee and as the idempotency key for the
  -- seed below: re-running this migration cannot duplicate a section.
  unique (tab_id, position)
);

create table browse_tiles (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references browse_blocks(id) on delete cascade,
  label      text not null,
  image_url  text,
  link_type  text not null check (link_type in ('category','partner','collection','url','filter')),
  link_value text not null,
  position   int  not null,
  group_key  text,                                     -- which sub_tab this tile belongs to
  is_active  boolean not null default true,
  unique (block_id, position)
);

create table browse_banners (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references browse_blocks(id) on delete cascade,
  image_url  text,
  headline   text,                                     -- the typographic fallback uses this
  subcopy    text,
  cta_label  text,
  link_type  text not null check (link_type in ('category','partner','collection','url','filter')),
  link_value text not null,
  position   int  not null,
  starts_at  timestamptz,
  ends_at    timestamptz,
  unique (block_id, position)
);

create index on browse_blocks (tab_id, position);
create index on browse_tiles  (block_id, position);
create index on browse_banners(block_id, position);

-- ============================================================
-- RLS
--
-- Read: anyone, active rows only. Admins additionally see inactive rows so
-- a draft tab can be checked before it is switched on.
-- Write: admins only, via is_admin() — the same SECURITY DEFINER predicate
-- every other policy in this schema uses (0001, and 0026-0033). No new
-- admin check is invented here, and there is no always-true write policy.
-- ============================================================

alter table browse_tabs    enable row level security;
alter table browse_blocks  enable row level security;
alter table browse_tiles   enable row level security;
alter table browse_banners enable row level security;

create policy "public reads active browse tabs" on browse_tabs
  for select using (is_active or is_admin());
create policy "admin writes browse tabs" on browse_tabs
  for all using (is_admin()) with check (is_admin());

create policy "public reads active browse blocks" on browse_blocks
  for select using (is_active or is_admin());
create policy "admin writes browse blocks" on browse_blocks
  for all using (is_admin()) with check (is_admin());

create policy "public reads active browse tiles" on browse_tiles
  for select using (is_active or is_admin());
create policy "admin writes browse tiles" on browse_tiles
  for all using (is_admin()) with check (is_admin());

-- Banners have no is_active flag; the schedule window is the switch. A row
-- with both bounds null is always on, which is what an unscheduled banner
-- should be.
create policy "public reads scheduled browse banners" on browse_banners
  for select using (
    (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    or is_admin()
  );
create policy "admin writes browse banners" on browse_banners
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Seed — Phase 1 tabs
--
-- `flowers` the tab maps to `flowers-gifts` the category: the tab label is
-- what a shopper reads, the filter is what the database calls it.
-- ============================================================

insert into browse_tabs (slug, label, position, accent_token, filter) values
  ('all',       'All',                    1, 'tab-all',       '{}'::jsonb),
  ('jewelry',   'Jewelry & Accessories',  2, 'tab-jewelry',   '{"category_slug":"jewelry-accessories"}'::jsonb),
  ('shoes',     'Shoes',                  3, 'tab-shoes',     '{"category_slug":"shoes"}'::jsonb),
  ('perfumes',  'Perfumes',               4, 'tab-perfumes',  '{"category_slug":"perfumes"}'::jsonb),
  ('chocolate', 'Chocolate',              5, 'tab-chocolate', '{"category_slug":"chocolate"}'::jsonb),
  ('flowers',   'Flowers',                6, 'tab-flowers',   '{"category_slug":"flowers-gifts"}'::jsonb)
on conflict (slug) do nothing;

-- Every tab gets the same six sections in the same order. A section that has
-- nothing real to show renders nothing at all — that decision lives in the
-- components, not here, so switching a tab's stock on turns its sections on
-- without another migration.
insert into browse_blocks (tab_id, type, position, title)
select t.id, b.type, b.position, b.title
from browse_tabs t
cross join (values
  ('banner_carousel',  1, null::text),
  ('entry_cards',      2, null),
  ('category_circles', 3, 'Shop by category'),
  ('deal_pair',        4, null),
  ('stores',           5, 'Stores'),
  ('product_feed',     6, null)
) as b(type, position, title)
on conflict (tab_id, position) do nothing;

-- ------------------------------------------------------------
-- Entry cards — the same five on every tab. These are routes and feed
-- filters that already exist; none of them is a promise CADO does not keep.
-- ------------------------------------------------------------
insert into browse_tiles (block_id, label, link_type, link_value, position)
select bl.id, e.label, e.link_type, e.link_value, e.position
from browse_blocks bl
cross join (values
  ('Stores',      'url',    '/browse',            1),
  ('New on CADO', 'filter', '{"sort":"new"}',     2),
  ('Under $25',   'filter', '{"max_price":25}',   3),
  ('Same-day',    'filter', '{"same_day":true}',  4),
  ('Occasions',   'url',    '/occasions',         5)
) as e(label, link_type, link_value, position)
where bl.type = 'entry_cards'
on conflict (block_id, position) do nothing;

-- ------------------------------------------------------------
-- Category circles
--
-- The All tab shows the real category list. Every other tab shows its own
-- category's real subcategories. Shoes has no subcategory rows, so its
-- circles block seeds zero tiles and the block will not render — that is
-- the intended behaviour, not an oversight.
-- ------------------------------------------------------------
insert into browse_tiles (block_id, label, link_type, link_value, position)
select bl.id, c.name, 'category', c.slug, row_number() over (order by c.sort_order, c.name)::int
from browse_blocks bl
join browse_tabs t on t.id = bl.tab_id and t.slug = 'all'
cross join categories c
where bl.type = 'category_circles' and c.is_active
on conflict (block_id, position) do nothing;

insert into browse_tiles (block_id, label, link_type, link_value, position)
select bl.id,
       s.name,
       'collection',
       s.slug,
       row_number() over (partition by bl.id order by s.sort_order, s.name)::int
from browse_blocks bl
join browse_tabs t on t.id = bl.tab_id
join categories cat on cat.slug = t.filter->>'category_slug'
join subcategories s on s.category_id = cat.id and s.is_active
where bl.type = 'category_circles' and t.slug <> 'all'
on conflict (block_id, position) do nothing;

-- ------------------------------------------------------------
-- Banners — headline and subcopy only, on purpose. No image_url means the
-- typographic variant renders: the tab's accent colour, the headline, one
-- line of copy. Nothing here is a claim CADO does not already make on the
-- homepage (same-day, real Lebanese stores).
-- ------------------------------------------------------------
insert into browse_banners (block_id, headline, subcopy, cta_label, link_type, link_value, position)
select bl.id, v.headline, v.subcopy, 'SHOP NOW', 'filter', '{}', 1
from browse_blocks bl
join browse_tabs t on t.id = bl.tab_id
join (values
  ('all',       'Chosen now, there by tonight', 'Gifts from real Lebanese stores.'),
  ('jewelry',   'Something that lasts',         'Rings, necklaces, watches — delivered today.'),
  ('shoes',     'Step out today',               'Ordered this morning, worn tonight.'),
  ('perfumes',  'A scent they keep',            'Perfume, skincare and makeup, same-day.'),
  ('chocolate', 'Sweet, and on time',           'Boxes, cakes and baskets across Lebanon.'),
  ('flowers',   'Flowers that arrive fresh',    'Bouquets and plants, delivered the same day.')
) as v(slug, headline, subcopy) on v.slug = t.slug
where bl.type = 'banner_carousel'
on conflict (block_id, position) do nothing;
