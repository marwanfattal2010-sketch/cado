-- ============================================================
-- 0060 — the Gift Sets page: sub-categories, two more stores, stock
--
-- ALREADY APPLIED TO PRODUCTION on 2026-08-15, through the SERVICE ROLE key
-- in apps/dashboard/.env.local, by scripts/seed-gift-sets-page.mjs. There is
-- no Supabase management token on this machine, so the script is what ran and
-- this file is the record of it. DO NOT APPLY IT AGAIN — every statement is
-- guarded with `not exists` so a second run is harmless, but the photographs
-- and the store covers are Storage objects and cannot be written from SQL at
-- all. If this ever has to be replayed, run the script, not this file.
--
-- WHY. Gift Sets is the category closest to what CADO actually is, and the
-- tab was rendering as a hero plus eight product cards and nothing else. Two
-- blocks were switched ON but drew nothing, because nothing was behind them:
--
--   * `category_circles` ("Shop by category") had ZERO tiles — Gift Sets was
--     the only stocked category with no sub-categories at all. Every other
--     one has three or four. CategoryCircles returns null on an empty list.
--   * the store strip never appeared, for two separate reasons at once:
--     StoreStrip has MIN_ITEMS = 3 and only ONE partner had active Gift Sets
--     stock, and on a category tab the strip is slotted into ProductFeed's
--     `renderAfter`, which only renders once there are MORE than eight
--     products. There were exactly eight.
--
-- So nothing here is a component change. These are the rows the components
-- were already asking for.
--
-- PLACEHOLDER DATA, and flagged as such. `wrap-and-co` and
-- `the-keepsake-room` are stand-in stores in the same sense as
-- `the-gift-atelier`, `the-basket-house` and `baseline-sports`: CADO is
-- pre-launch, nobody has the app but Marwan, and every partner is a stand-in
-- until real shops sign. All five prices are invented and carry
-- `price_is_placeholder = true`, which is what makes the lot removable:
--
--   select title, price from products where price_is_placeholder;
--
-- The one REAL partner in this category, Surprise Gifts Shop, is not touched
-- here except to file its eight listings under a sub-category and to give it
-- a cover image taken from its OWN photograph already in the repo. Its
-- products, prices and photos are exactly as seed-surprise-gifts.mjs left
-- them.
--
-- Rules kept, all inherited from 0054:
--   * NO BRAND NAMES in any title or description. This is also why most stock
--     "gift hamper" photography was unusable — see
--     scripts/assets/gift-sets/SOURCES.md for the twenty-odd rejects.
--   * a gift set is genuinely SEVERAL THINGS IN ONE BOX.
--   * no ratings, sold counts, viewer counts or urgency text; those columns
--     are untouched. No `compare_at_price` either — an invented discount is
--     the only thing that would make the Super Deals card appear, and it
--     would be a lie.
--   * every photo was downloaded and LOOKED AT, and each listing was written
--     from its photograph rather than from the search that found it.
-- ============================================================

-- ------------------------------------------------------------
-- Three sub-categories. Three is what Flowers, Chocolate and Toys have.
--
-- Every one of the thirteen active Gift Sets products falls into exactly one,
-- and none has fewer than four behind it: a circle that opens onto a single
-- product is worse than no circle at all.
-- ------------------------------------------------------------
insert into subcategories (category_id, name, slug, sort_order, is_active)
select c.id, v.name, v.slug, v.sort_order, true
from (values
  ('Hampers & Baskets', 'hampers-and-baskets', 1),
  ('Boxed Sets',        'boxed-sets',          2),
  ('Candles & Scents',  'candles-and-scents',  3)
) as v(name, slug, sort_order)
cross join categories c
where c.slug = 'gift-sets'
  and not exists (
    select 1 from subcategories s where s.slug = v.slug and s.category_id = c.id
  );

-- The circles that filter by them. `collection` tiles narrow the grid in
-- place rather than navigating — link_value is the sub-category SLUG.
--
-- No image_url on purpose: useTileImages() gives each circle the photo of a
-- product genuinely inside it, which cannot drift from the catalogue the way
-- uploaded artwork can.
--
-- NOTE the tab slug is `home`, NOT `gift-sets`. That mismatch is what made
-- 0053's insert land on a tab no shopper could see.
insert into browse_tiles (block_id, label, link_type, link_value, position, is_active)
select b.id, v.label, 'collection', v.slug, v.pos, true
from browse_blocks b
join browse_tabs tab on tab.id = b.tab_id
cross join (values
  ('Hampers & Baskets', 'hampers-and-baskets', 1),
  ('Boxed Sets',        'boxed-sets',          2),
  ('Candles & Scents',  'candles-and-scents',  3)
) as v(label, slug, pos)
where b.type = 'category_circles' and tab.slug = 'home'
  and not exists (
    select 1 from browse_tiles t where t.block_id = b.id and t.link_value = v.slug
  );

-- ------------------------------------------------------------
-- Two more placeholder stores, so the strip has three shops to offer.
--
-- Named to sit alongside the-gift-atelier, the-basket-house, cocoa-and-co and
-- sucre-bakehouse rather than beside them looking like a different project.
-- ------------------------------------------------------------
insert into partners (name, slug, description, status, is_live, country, city, commission_rate, offers_gift_wrap)
select v.name, v.slug, v.description, 'active', true, 'LB', v.city, 0.15, true
from (values
  ('Wrap & Co.', 'wrap-and-co', 'Ready-wrapped gift boxes, made up and ribboned to order.', 'Beirut'),
  ('The Keepsake Room', 'the-keepsake-room', 'Keepsake baskets for new babies, new homes and thank-yous.', 'Jounieh')
) as v(name, slug, description, city)
where not exists (select 1 from partners p where p.slug = v.slug);

-- ------------------------------------------------------------
-- Their stock. Each description is a description of the PHOTOGRAPH — what is
-- actually in the frame — which is the only way a listing and its picture
-- cannot drift apart.
-- ------------------------------------------------------------
insert into products (
  title, slug, description, price, currency, category_id, subcategory_id, partner_id,
  stock_quantity, is_active, same_day, price_is_placeholder
)
select v.title,
       trim(both '-' from lower(regexp_replace(v.title, '[^a-zA-Z0-9]+', '-', 'g'))),
       v.description, v.price, 'USD', c.id, s.id, pa.id, 10, true, true, true
from (values
  ('wrap-and-co', 'boxed-sets', 'Ribboned Gift Box Set with Candle',
   'Two kraft gift boxes stacked and tied together with red ribbon under a printed floral card, sent with a scented candle in a glass jar.', 45.00),
  ('wrap-and-co', 'candles-and-scents', 'Tea & Candle Evening Box',
   'A glazed stoneware teapot and a matching wide cup, boxed with a scented candle and wrapped in floral paper tied with garden twine.', 40.00),
  ('wrap-and-co', 'candles-and-scents', 'Candle & Towel Calm Set',
   'A scented candle in an amber glass jar with two rolled cotton hand towels and a bunch of dried flowers, presented on a turned wooden dish.', 35.00),
  ('the-keepsake-room', 'hampers-and-baskets', 'Notebook & Candle Keepsake Basket',
   'A hardback notebook, a scented candle and two small keepsake boxes packed into a woven tray on wood-wool, tied across with a wide cream ribbon.', 55.00),
  ('the-keepsake-room', 'hampers-and-baskets', 'New Baby Keepsake Crate',
   'A small wooden crate lined with a spotted muslin wrap, holding cotton scratch-free mittens, folded washcloths, a natural bath sponge, a drawstring pouch and a giraffe teether.', 50.00)
) as v(store, sub, title, description, price)
join partners pa on pa.slug = v.store
join subcategories s on s.slug = v.sub
cross join categories c
where c.slug = 'gift-sets' and s.category_id = c.id
  and not exists (select 1 from products p where p.title = v.title);

-- ------------------------------------------------------------
-- File the eight REAL Surprise Gifts Shop listings under a sub-category too.
--
-- This is the only change made to that shop's rows. It changes nothing a
-- shopper sees except that the circles above the grid now narrow it, and it
-- reverses with one update.
-- ------------------------------------------------------------
update products p
   set subcategory_id = s.id
  from subcategories s, categories c, (values
  ('Make Your Own Gift Basket',       'hampers-and-baskets'),
  ('Chocolate Lovers Hamper',         'hampers-and-baskets'),
  ('Picnic Basket & Blanket Set',     'hampers-and-baskets'),
  ('Pink Bunny Gift Box',             'boxed-sets'),
  ('Birthday Wish Box',               'boxed-sets'),
  ('Executive Notebook & Pen Set',    'boxed-sets'),
  ('Candle & Diffuser Cage Set',      'candles-and-scents'),
  ('Birdcage Candle & Diffuser Set',  'candles-and-scents')
) as v(title, sub)
 where c.slug = 'gift-sets'
   and s.slug = v.sub and s.category_id = c.id
   and p.title = v.title and p.category_id = c.id
   and p.subcategory_id is null;

-- ------------------------------------------------------------
-- The hero.
--
-- Every browse_banners row in the whole database had image_url = null, so
-- this banner fell through to TabPanel's `fallbackImage` and borrowed a
-- square product photo stretched to 2:1. It has artwork of its own now.
--
-- The subcopy had to change as well: it read "Teddies, mugs and chocolates,
-- made up as one gift", which described the Gift Atelier stock that was
-- retired the moment Surprise came on. It now describes what is in the tab.
--
-- The URL below is a Storage object uploaded by the script — SQL cannot put
-- the file there, which is the other reason not to replay this file.
-- ------------------------------------------------------------
update browse_banners b
   set image_url = 'https://tzuntmerjhegkzsbfmnf.supabase.co/storage/v1/object/public/product-images/banners/gift-sets-hero.jpg',
       headline  = 'Boxed up, ready to give',
       subcopy   = 'Hampers, candle sets and ready-made boxes from Lebanese shops.'
  from browse_blocks bl, browse_tabs tab
 where bl.id = b.block_id and tab.id = bl.tab_id
   and bl.type = 'banner_carousel' and tab.slug = 'home';

-- ------------------------------------------------------------
-- Store covers. The strip draws each shop as a 160x110 photo card, so a shop
-- without one leads with a grey rectangle — and Surprise leads the strip,
-- because it has the most stock.
--
-- Surprise's cover is one of the shop's OWN photographs (already in the repo
-- at scripts/assets/surprise/01_pink_bunny_box.jpg). Marwan closed the deal
-- by phone on 2026-08-15 and the shop said CADO can use anything from their
-- Instagram. The other two are stock, sourced and recorded in
-- scripts/assets/gift-sets/SOURCES.md.
-- ------------------------------------------------------------
update partners
   set cover_image_url = 'https://tzuntmerjhegkzsbfmnf.supabase.co/storage/v1/object/public/partner-logos/covers/' || slug || '.jpg'
 where slug in ('wrap-and-co', 'the-keepsake-room', 'surprise-gifts-shop')
   and cover_image_url is null;
