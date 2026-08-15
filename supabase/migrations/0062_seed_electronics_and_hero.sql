-- ============================================================
-- 0062 — Electronics: a store, eight products, and a real hero banner
--
-- ALREADY APPLIED TO PRODUCTION on 2026-08-15, through the SERVICE ROLE key
-- in apps/dashboard/.env.local, by scripts/seed-electronics.mjs. DO NOT RUN
-- IT AGAIN — it is recorded here so the change is in the migration history
-- like everything else, not because it is waiting to be applied. Every
-- statement below is written to be a no-op if the rows already exist, so a
-- re-run would be harmless, but it is still not needed.
--
-- Numbered 0062 rather than 0060: two other sessions were adding migrations
-- in the same range on the same night, and a gap is cheaper than a collision.
--
-- ------------------------------------------------------------
-- WHY THIS EXISTS
--
-- Marwan asked for "some photos and the hero for Electronics". The honest
-- situation was bigger than that sounds: Electronics contained ZERO products,
-- had no partner store and no sub-categories. There was nothing for a photo
-- to sit on. So the category had to be stocked first, then photographed, then
-- given a hero.
--
-- The tab's browse_blocks were already in place (banner_carousel, category
-- circles, stores, product_feed), so no blocks are created here.
--
-- ------------------------------------------------------------
-- WHAT IS INVENTED, PLAINLY
--
-- The shop and every price. CADO is PRE-LAUNCH — nobody has the app but
-- Marwan, delivery is not set up, and every partner store is a placeholder to
-- be swapped for a real shop later — so a placeholder electronics store is
-- expected and correct here. Modelled on how 0054 created Baseline Sports for
-- the Sport category, and named to match the register of the other
-- placeholder stores: cedar-street-fashion, little-explorers-toys,
-- solstice-studio, baseline-sports.
--
-- Every product row is flagged `price_is_placeholder = true`. That flag is
-- what makes the whole lot findable and removable in one query:
--
--   select title, price from products where price_is_placeholder;
--
-- No invented ratings, sold counts, viewer counts or urgency text — none of
-- those columns are touched.
--
-- NO BRAND NAMES in titles or descriptions, the rule 0054 set. It matters
-- double in electronics: reproducing a brand's name on stock that shop does
-- not actually carry is the one thing that could cause real trouble.
--
-- ------------------------------------------------------------
-- THE BANNER COPY WAS TRUE AND THIS MAKES IT FALSE
--
-- Somebody deliberately wrote the Electronics banner as an honest empty
-- state:
--
--   headline "Electronics, coming soon"
--   subcopy  "No CADO store stocks these yet."
--   cta      "BROWSE GIFTS" -> link_type 'url', link_value '/'
--
-- The moment stock exists that copy is a lie, so it is rewritten in the same
-- migration. Never leave a "coming soon" line sitting above a full grid.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The store.
--
-- Same placeholder status as every other demo shop. Not is_live = false:
-- coming-soon partners are rendered as a non-clickable card and their stock
-- is filtered out of the store strip, which is the opposite of what is wanted
-- here.
-- ------------------------------------------------------------
insert into partners (name, slug, description, status, is_live, commission_rate)
select 'Bright Spark Electronics', 'bright-spark-electronics',
       'Headphones, speakers, cameras and small gadgets worth wrapping.',
       'active', true, 0.15
where not exists (select 1 from partners where slug = 'bright-spark-electronics');


-- ------------------------------------------------------------
-- 2. Eight products.
--
-- Chosen to be GIFTABLE, because that is what this marketplace is for —
-- headphones, a speaker, a camera, a watch, a lamp, earbuds, a power bank, a
-- photo frame. Not fridges and laptops.
--
-- stock_quantity is a real number and not zero on purpose: the store strip
-- filters on `stock_quantity > 0 and is_active = true`, so a zero-stock
-- product would make the whole shop vanish from the strip.
-- ------------------------------------------------------------
insert into products (
  title, slug, description, price, currency, category_id, partner_id,
  stock_quantity, is_active, same_day, price_is_placeholder
)
select v.title,
       trim(both '-' from lower(regexp_replace(v.title, '[^a-zA-Z0-9]+', '-', 'g'))),
       v.description, v.price, 'USD', c.id, pa.id, 12, true, true, true
from (values
  ('Over-Ear Wireless Headphones',
   'Padded over-ear headphones with a folding headband, soft leatherette cushions and an on-cup control for calls and volume.', 90.00),
  ('Wireless Earbuds & Charging Case',
   'A pair of in-ear buds in a pocket charging case that tops them up between uses, with a four-light battery gauge on the front.', 55.00),
  ('Portable Bluetooth Speaker',
   'A palm-sized square speaker with a perforated front grille and a leather carry loop, small enough for a bag or a bedside table.', 45.00),
  ('Instant Print Camera',
   'A pocket camera that prints the picture straight away on credit-card sized film, with a built-in flash and a wrist strap. Film sold separately.', 110.00),
  ('Round Smart Watch',
   'A round-face smart watch with a soft silicone strap, showing time, steps, distance and heart rate, and buzzing for calls and messages.', 95.00),
  ('Compact Power Bank',
   'A slim battery pack with a marbled shell, a fast USB port and a USB-C input, sized to charge a phone through a full day out.', 35.00),
  ('Adjustable Desk Lamp',
   'A jointed metal desk lamp in polished chrome, with two hinged arms and a weighted round base so it stays put wherever it is aimed.', 60.00),
  ('Digital Photo Frame',
   'A framed screen that cycles through a set of photographs, sitting on a shelf or a desk like an ordinary frame.', 80.00)
) as v(title, description, price)
cross join categories c
cross join partners pa
where c.slug = 'electronics' and pa.slug = 'bright-spark-electronics'
  and not exists (select 1 from products p where p.title = v.title);


-- ------------------------------------------------------------
-- 3. Six photos, and two listings deliberately left bare.
--
-- Product photos are Supabase STORAGE OBJECTS, not repo files, so the bytes
-- cannot live in a migration. scripts/seed-electronics.mjs uploaded each JPEG
-- to the `product-images` bucket at `electronics/<product uuid>.jpg` and then
-- wrote the rows below. The source files and their Unsplash URLs are kept in
-- scripts/assets/electronics/ with SOURCES.md.
--
-- EVERY IMAGE WAS OPENED AND LOOKED AT before being attached, and the
-- finalists were fetched again zoomed in on the product to catch a logo the
-- full-size view hid — one flat-lay was rejected only at that second look
-- (JBL embossed on the ear cup). This is not ceremony: a previous session
-- attached ten Sport photos from a hard-coded list of Unsplash ids without
-- opening any of them, and put an empty American football field on
-- "Goalkeeper Gloves" and a lifestyle sneaker on "Running Trainers".
--
-- TWO PRODUCTS HAVE NO PHOTO AND THAT IS THE DECISION, NOT AN OMISSION:
--
--   Instant Print Camera — every free instant-camera photograph on Unsplash
--     is of a Fujifilm Instax or a Polaroid with the wordmark plainly
--     readable on the front. Six were downloaded and opened; all six showed
--     the brand. That is exactly what 0054 banned.
--   Digital Photo Frame — Unsplash has no photograph of one. The searches
--     return ordinary wooden picture frames, tablets and laptops.
--
-- A missing photo reads as "not shot yet", which is true. A near-enough photo
-- is a promise about what arrives in the box, and mismatched photos cause
-- refunds.
-- ------------------------------------------------------------
insert into product_images (product_id, partner_id, storage_path, is_primary, sort_order)
select p.id, p.partner_id, 'electronics/' || p.id || '.jpg', true, 0
from products p
join partners pa on pa.id = p.partner_id
where pa.slug = 'bright-spark-electronics'
  and p.title in (
    'Over-Ear Wireless Headphones',
    'Wireless Earbuds & Charging Case',
    'Portable Bluetooth Speaker',
    'Round Smart Watch',
    'Compact Power Bank',
    'Adjustable Desk Lamp'
  )
  and not exists (select 1 from product_images pi where pi.product_id = p.id);


-- ------------------------------------------------------------
-- 4. The hero, and the copy that had to change with it.
--
-- THE IMAGE. Until now every browse_banners row in the entire database had
-- `image_url = null`, so heroes fell back to a photo of some product in that
-- tab (see fallbackImage in TabPanel.tsx). This is the first row to carry
-- artwork of its own.
--
-- The file was uploaded to the SAME Supabase Storage bucket as the product
-- photos rather than hot-linked from Unsplash, so the hero does not depend on
-- a third-party host staying up. `banner.image_url` is used directly as an
-- <img src>, so it takes a full public URL.
--
-- The photograph is cropped to 2:1 with the headphones pushed right of
-- centre, because BannerCarousel lays the tab's accent — navy,
-- --tab-electronics — over the left ~60% for the white headline to sit on.
-- Source: https://unsplash.com/photos/black-wireless-headphones-dBwadhWa-lI
--
-- THE COPY. Rewritten in the register of the other tabs. Shoes reads "Step
-- out today" / "Ordered this morning, worn tonight." / "SHOP NOW" — short,
-- concrete, about getting it today.
--
-- link_type moves from 'url' to 'filter' with an empty object, matching every
-- other seeded tab. '/' was the right destination while the category was
-- empty; now that it has stock, sending people away from it is wrong.
-- TabPanel reads an empty filter as "no explicit destination" and opens the
-- gift finder, which is where SHOP NOW goes everywhere else.
-- ------------------------------------------------------------
update browse_banners
set image_url  = 'https://tzuntmerjhegkzsbfmnf.supabase.co/storage/v1/object/public/product-images/electronics/hero-electronics.jpg',
    headline   = 'Unboxed tonight',
    subcopy    = 'Ordered this morning, plugged in by dinner.',
    cta_label  = 'SHOP NOW',
    link_type  = 'filter',
    link_value = '{}'
where block_id = '5116d218-05f8-458b-95b7-f5a0df266264';


-- ------------------------------------------------------------
-- What this migration does NOT do, on purpose
--
-- * No sub-categories for Electronics. The "Shop by category" block on the
--   tab therefore still renders nothing. Adding them means touching a label
--   that lives in five tables, and it was not what was asked for.
-- * The "Stores" strip on the Electronics tab still shows nothing either, and
--   that is correct behaviour rather than a fault: StoreStrip has
--   MIN_ITEMS = 3 ("two shops is not a rail, it is two cards with a gap") and
--   Electronics has one shop. It will appear by itself when a third real
--   electronics partner is added. Inventing two more placeholder shops to
--   trip the threshold would be worse than an empty row.
-- * Nothing is deleted. If Marwan wants this stock gone, the reversible move
--   is `update products set is_active = false where ...`, the same call made
--   for GS's Home & Gifts products and the Gift Atelier boxes.
-- ============================================================
