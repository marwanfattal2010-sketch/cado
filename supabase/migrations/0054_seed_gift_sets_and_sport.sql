-- ============================================================
-- 0054 — demo stock for Gift Sets and Sport
--
-- PRE-LAUNCH DEMO DATA. Nobody has the app but Marwan, delivery is not set
-- up, and the partner stores are placeholders to be swapped for real shops.
-- These products exist so the two new categories are not empty when he shows
-- the app to store owners.
--
-- Every row is flagged `price_is_placeholder = true`, which is the flag this
-- project already uses for invented prices. That is what makes them findable
-- and deletable in one query when the real shops come on:
--
--   delete from products where price_is_placeholder;
--
-- No invented ratings, sold counts, viewer counts or urgency text — none of
-- those columns are touched.
--
-- NO BRAND NAMES. Titles describe the item, never a brand. Reproducing a
-- brand's name on stock that shop does not actually carry is the one thing
-- that could cause real trouble, and it is not needed for a preview.
--
-- No photos are attached. A missing photo reads as "not shot yet", which is
-- true. A borrowed photo of something else reads as a promise about what
-- arrives in the box, which is not.
-- ============================================================

-- A sports shop to hang the Sport stock on. Same placeholder status as the
-- other demo stores.
insert into partners (name, slug, description, status, is_live, commission_rate)
select 'Baseline Sports', 'baseline-sports',
       'Football, training and everyday sportswear.', 'active', true, 0.15
where not exists (select 1 from partners where slug = 'baseline-sports');

-- ------------------------------------------------------------
-- Gift Sets — boxed, multi-item, the unboxing kind of thing.
--
-- Deliberately NOT single objects: a lone candle under a "Gift Sets" label
-- reads wrong. Each of these is genuinely several things in one box.
--
-- Gift baskets stay in Chocolate where they already live; nothing here
-- duplicates them.
-- ------------------------------------------------------------
insert into products (
  title, slug, description, price, currency, category_id, partner_id,
  stock_quantity, is_active, same_day, price_is_placeholder
)
select v.title, trim(both '-' from lower(regexp_replace(v.title, '[^a-zA-Z0-9]+', '-', 'g'))), v.description, v.price, 'USD', c.id, pa.id, 12, true, true, true
from (values
  ('Teddy, Mug & Chocolates Box',
   'A soft teddy bear, a stoneware mug and a box of chocolates, packed together in a ribboned gift box.', 65.00),
  ('Big Hug Bear Box',
   'An extra-large teddy bear with a chocolate selection and a handwritten note card, boxed and ribboned.', 95.00),
  ('Coffee Lover Set',
   'A ceramic mug, a bag of roasted beans and two chocolate bars in a lidded gift box.', 55.00),
  ('Secret Santa Box',
   'A small mug, socks, a chocolate bar and a mini plush, wrapped for a name draw.', 35.00),
  ('Movie Night In Box',
   'Popcorn, two chocolate bars, a candle and a soft blanket, boxed together.', 75.00),
  ('Sweet Dreams Set',
   'A plush bear, a scented candle and a chocolate selection in a keepsake box.', 70.00),
  ('New Home Box',
   'A mug pair, a candle and a chocolate box, put together for someone who has just moved.', 85.00),
  ('Little One Gift Box',
   'A plush toy, a soft blanket and a milk chocolate selection, boxed for a new arrival.', 60.00)
) as v(title, description, price)
cross join categories c
cross join partners pa
where c.slug = 'gift-sets' and pa.slug = 'the-gift-atelier'
  and not exists (select 1 from products p where p.title = v.title);

-- ------------------------------------------------------------
-- Sport — the stock a football and activewear shop carries.
-- ------------------------------------------------------------
insert into products (
  title, slug, description, price, currency, category_id, partner_id,
  stock_quantity, is_active, same_day, price_is_placeholder
)
select v.title, trim(both '-' from lower(regexp_replace(v.title, '[^a-zA-Z0-9]+', '-', 'g'))), v.description, v.price, 'USD', c.id, pa.id, 15, true, true, true
from (values
  ('Football Kit — Shirt, Shorts & Socks',
   'A full match kit in breathable fabric: shirt, shorts and socks.', 85.00),
  ('Firm Ground Football Boots',
   'Studded boots for grass pitches, with a moulded soleplate and a padded collar.', 120.00),
  ('Indoor Football Trainers',
   'Flat-soled trainers for indoor courts and five-a-side.', 95.00),
  ('Match Football',
   'A stitched size 5 match ball.', 40.00),
  ('Training Tracksuit',
   'A zip jacket and matching bottoms in lightweight training fabric.', 110.00),
  ('Running Trainers',
   'Cushioned road-running shoes with a breathable mesh upper.', 130.00),
  ('Sports Holdall',
   'A gym and match bag with a separate boot compartment.', 55.00),
  ('Training Tee & Shorts Set',
   'A quick-dry training top with matching shorts.', 60.00),
  ('Goalkeeper Gloves',
   'Latex-palmed gloves with a wrap-around wrist strap.', 45.00),
  ('Shin Pads',
   'Lightweight shin guards with ankle protection and retention sleeves.', 25.00)
) as v(title, description, price)
cross join categories c
cross join partners pa
where c.slug = 'sport' and pa.slug = 'baseline-sports'
  and not exists (select 1 from products p where p.title = v.title);
