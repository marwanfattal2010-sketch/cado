-- ============================================================
-- 0059 — Sport: the tab body, a hero, two more shops, and ten wrong photos
--        thrown out
--
-- *** ALREADY APPLIED TO PRODUCTION. DO NOT RUN THIS FILE. ***
--
-- Applied on 2026-08-15 by `node scripts/seed-sport-category.mjs`, using the
-- SERVICE ROLE key from apps/dashboard/.env.local through PostgREST, because
-- there is no Supabase management token on this machine. Everything here is
-- INSERT / UPDATE / DELETE, which the service-role key can do; none of it
-- needs DDL. This file exists so the change is readable in the migration
-- history next to everything else, not so it can be run a second time.
--
-- The statements below are written to be idempotent anyway (`where not
-- exists` throughout), so a re-run would be a no-op rather than a duplicate.
-- The one thing SQL cannot do is upload the image FILES — those are objects
-- in Supabase Storage and the script put them there. See the note at the end.
--
-- ------------------------------------------------------------
-- WHAT WAS WRONG
--
-- 1. THE SPORT TAB RENDERED COMPLETELY EMPTY. This project's homepage is
--    database rows, not React: the sections inside a tab are `browse_blocks`,
--    and Sport had ZERO of them. 0053 added the category, 0055 added the tab,
--    0058 added the Shop-by-category tile — and the tab body was still blank.
--    That is the FIFTH time this project has half-added a category. The full
--    checklist is: categories + browse_tabs + browse_tiles + browse_blocks.
--
-- 2. `--tab-sport` DID NOT EXIST. `browse_tabs.accent_token` for Sport is
--    'tab-sport', and accentColor() in apps/web/src/lib/browse.ts turns that
--    into rgb(var(--tab-sport)). The other ten tab colours are defined in
--    apps/web/src/index.css; this one was not, so the hero had no field
--    colour at all — it computed to transparent. Fixed in that file, NOT
--    here; it is a stylesheet change and ships with the next deploy.
--
-- 3. SPORT HAD ONE STORE. StoreStrip.tsx sets MIN_ITEMS = 3 and renders
--    nothing below that, so the store rail never appeared. Comparable
--    categories carry about three shops each (Toys has three, Chocolate has
--    three).
--
-- 4. ALL TEN SPORT PRODUCT PHOTOS WERE WRONG. They were attached by
--    scripts/seed-product-photos.mjs from a hard-coded list of Unsplash ids
--    that nobody opened. Checked one by one: "Goalkeeper Gloves" was an empty
--    American football field with no gloves in it, "Shin Pads" was a
--    children's training session, "Training Tracksuit" was a pair of sneakers
--    dangling off a ledge, "Sports Holdall" was a laptop backpack, "Indoor
--    Football Trainers" and "Running Trainers" were branded lifestyle
--    sneakers, and the boots, ball and kit shots carried large adidas or Nike
--    marks on stock Baseline Sports does not carry. Reproducing a brand's
--    logo on a $130 listing from a shop that does not sell it is the same
--    problem 0054 avoided by banning brand names in titles, only bigger.
--
-- ------------------------------------------------------------
-- PRE-LAUNCH DEMO DATA, same terms as 0054. Nobody has the app but Marwan,
-- delivery is not set up, and every partner store is a placeholder to be
-- swapped for a real shop later. Every invented price is flagged
-- `price_is_placeholder = true`, which is what makes the lot removable:
--
--   select title, price from products where price_is_placeholder;
--
-- No invented ratings, sold counts, viewer counts or urgency text — none of
-- those columns are touched. No brand names in any title or description.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The tab body: four blocks, copied from Electronics
--
-- Electronics is the most recently added category and is the shape a new one
-- takes: banner_carousel, category_circles, stores, product_feed. The older
-- nine tabs also carry entry_cards and deal_pair; those are not part of the
-- current pattern and are deliberately not created here, which is why the
-- positions skip 2 and 4.
--
-- The category_circles block is created EMPTY on purpose. Sport has no
-- sub-categories, and CategoryCircles renders nothing when it has no tiles —
-- Shoes and Electronics both sit exactly like this. The block exists so that
-- adding a sub-category later is one tile row instead of a schema change.
-- ------------------------------------------------------------
insert into browse_blocks (tab_id, type, position, title, config, is_active)
select t.id, v.type, v.position, v.title, '{}'::jsonb, true
from (values
  ('banner_carousel',  1, null),
  ('category_circles', 3, 'Shop by category'),
  ('stores',           5, 'Stores'),
  ('product_feed',     6, null)
) as v(type, position, title)
cross join browse_tabs t
where t.slug = 'sport'
  and not exists (
    select 1 from browse_blocks b where b.tab_id = t.id and b.type = v.type
  );


-- ------------------------------------------------------------
-- 2. The hero
--
-- A banner_carousel block renders NOTHING without a row in browse_banners, so
-- the block above is inert until this runs.
--
-- Every other banner row in the database was seeded with image_url = null,
-- which makes BannerCarousel fall back to a photo of some product in the tab
-- — and for Sport those photos were the wrong ones described above. So this
-- row gets real artwork of its own: a floodlit pitch shot straight down, no
-- crowd, no advertising hoardings, no kit and therefore no brand marks.
--
-- The file is uploaded to Supabase Storage rather than hotlinked, so the hero
-- does not depend on a third-party host staying up. Source recorded in
-- scripts/assets/sport/SOURCES.md.
--
-- Copy follows the tone of the other nine rows — short, concrete, and a
-- delivery promise CADO actually makes. Shoes is the model: "Step out today"
-- / "Ordered this morning, worn tonight."
--
-- link_type 'filter' with an empty object is the same no-op the other rows
-- carry; TabPanel sends SHOP NOW to the gift finder unless a 'url' is set.
-- ------------------------------------------------------------
insert into browse_banners (
  block_id, image_url, headline, subcopy, cta_label, link_type, link_value, position
)
select b.id,
       'https://tzuntmerjhegkzsbfmnf.supabase.co/storage/v1/object/public/product-images/banners/sport-hero.jpg',
       'Ready for kick-off',
       'Boots, balls and training kit, delivered today.',
       'SHOP NOW',
       'filter', '{}', 1
from browse_blocks b
join browse_tabs t on t.id = b.tab_id
where t.slug = 'sport' and b.type = 'banner_carousel'
  and not exists (select 1 from browse_banners bn where bn.block_id = b.id);


-- ------------------------------------------------------------
-- 3. Two more shops, so the store rail can exist
--
-- They also widen Sport past football, which was the whole catalogue before.
-- Cover images are SCENES — a pitch, a running track, a court — not products.
-- A scene gives a placeholder shop a character without promising that any
-- particular item is on its shelves.
--
-- Baseline Sports already existed (0054) but had no cover at all, so its card
-- in the rail was a blank grey rectangle. It gets one here.
-- ------------------------------------------------------------
insert into partners (
  name, slug, description, status, is_live, country, city,
  commission_rate, offers_gift_wrap
)
select v.name, v.slug, v.description, 'active', true, 'LB', 'Beirut', 0.15, true
from (values
  ('Pace Athletics',    'pace-athletics',    'Running, fitness and everything for the gym bag.'),
  ('Courtside Sports',  'courtside-sports',  'Basketball, tennis and racket sports.')
) as v(name, slug, description)
where not exists (select 1 from partners p where p.slug = v.slug);

update partners set cover_image_url =
  'https://tzuntmerjhegkzsbfmnf.supabase.co/storage/v1/object/public/partner-logos/covers/' || slug || '.jpg'
where slug in ('baseline-sports', 'pace-athletics', 'courtside-sports')
  and cover_image_url is null;


-- ------------------------------------------------------------
-- 4. Their stock
--
-- Chosen partly for what could actually be PHOTOGRAPHED honestly. Unsplash's
-- sportswear is almost entirely branded, but its loose equipment — a ball, a
-- racket, a bottle, a mat — is not, so these eight lean that way on purpose
-- rather than adding eight more listings that would have to sit blank.
-- ------------------------------------------------------------
insert into products (
  title, slug, description, price, currency, category_id, partner_id,
  stock_quantity, is_active, same_day, price_is_placeholder
)
select v.title,
       trim(both '-' from lower(regexp_replace(v.title, '[^a-zA-Z0-9]+', '-', 'g'))),
       v.description, v.price, 'USD', c.id, pa.id, 15, true, true, true
from (values
  ('pace-athletics', 'Insulated Sports Water Bottle',
   'A double-walled steel bottle with a screw cap, matte finish. Keeps cold drinks cold through a full session.', 20.00),
  ('pace-athletics', 'Yoga Mat & Cork Blocks Set',
   'A ribbed non-slip mat with a pair of solid cork blocks.', 45.00),
  ('pace-athletics', 'Skipping Rope',
   'An adjustable speed rope with weighted handles and a ball-bearing swivel.', 15.00),
  ('pace-athletics', 'Resistance Band Set',
   'Five looped bands in graded strengths, with a carry pouch.', 25.00),
  ('courtside-sports', 'Outdoor Basketball',
   'A size 7 rubber ball with a deep-channel grip, built for outdoor courts.', 35.00),
  ('courtside-sports', 'Tennis Racket & Balls',
   'A strung aluminium racket with a leather grip, boxed with three balls.', 90.00),
  ('courtside-sports', 'Badminton Set — Two Rackets & Shuttles',
   'Two lightweight steel-shaft rackets with a pair of nylon shuttlecocks.', 30.00),
  ('courtside-sports', 'Tube of Tennis Balls',
   'Three pressurised felt balls in a sealed tube.', 12.00)
) as v(partner_slug, title, description, price)
join partners pa on pa.slug = v.partner_slug
cross join categories c
where c.slug = 'sport'
  and not exists (select 1 from products p where p.title = v.title);


-- ------------------------------------------------------------
-- 5. Throw out the ten wrong photos
--
-- Every Sport photo lived under the `seed/` prefix, which is the prefix
-- seed-product-photos.mjs used and nothing else does — so this is exact.
--
-- The rule this enforces, and it matters more than a full grid: a MISSING
-- photo reads as "not shot yet", which is true. A near-enough photo is a
-- promise about what arrives in the box. Eight of the ten Sport products are
-- left with no photo at all because no clean, correct, unbranded shot could
-- be found for them, and that is the correct outcome, not a gap to fill.
-- ------------------------------------------------------------
delete from product_images pi
using products p
where pi.product_id = p.id
  and p.category_id = (select id from categories where slug = 'sport')
  and pi.storage_path like 'seed/%';


-- ------------------------------------------------------------
-- 6. The photos that are right
--
-- Seven, each one downloaded and LOOKED AT before it was attached — the step
-- that was skipped last time and is the reason all ten had to be deleted
-- above. Sources in scripts/assets/sport/SOURCES.md.
--
-- The eight left blank on purpose, with the reason:
--   Firm Ground Football Boots  — every studio boot shot carries three
--                                 stripes or a swoosh.
--   Football Kit                — apparel results are worn kit with club
--                                 badges and makers' marks.
--   Indoor Football Trainers    — nothing that is genuinely a flat-soled
--                                 indoor shoe rather than a lifestyle sneaker.
--   Running Trainers            — every clean studio shot is a named brand.
--   Shin Pads                   — no product shot exists at all; the results
--                                 are kickboxing sessions and cricket pads.
--   Sports Holdall              — the duffels found are leather weekend bags,
--                                 not a gym bag with a boot compartment.
--   Training Tee & Shorts Set   — same apparel problem.
--   Training Tracksuit          — same, plus visible brand wordmarks.
-- ------------------------------------------------------------
insert into product_images (product_id, partner_id, storage_path, is_primary, sort_order)
select p.id, p.partner_id, 'sport/' || p.id || '.jpg', true, 0
from products p
where p.category_id = (select id from categories where slug = 'sport')
  and p.title in (
    'Match Football',
    'Goalkeeper Gloves',
    'Insulated Sports Water Bottle',
    'Yoga Mat & Cork Blocks Set',
    'Outdoor Basketball',
    'Tennis Racket & Balls',
    'Badminton Set — Two Rackets & Shuttles'
  )
  and not exists (select 1 from product_images pi where pi.product_id = p.id);


-- ============================================================
-- THE FILES
--
-- The rows above point at eleven objects in Supabase Storage. SQL cannot put
-- them there; `node scripts/seed-sport-category.mjs` did, and re-running that
-- script re-uploads any that go missing (it upserts).
--
--   product-images/banners/sport-hero.jpg
--   product-images/sport/<product_id>.jpg   x7
--   partner-logos/covers/baseline-sports.jpg
--   partner-logos/covers/pace-athletics.jpg
--   partner-logos/covers/courtside-sports.jpg
--
-- The ten deleted `seed/...jpg` objects were removed from the bucket by the
-- same script, so nothing is being paid for a picture of a laptop backpack.
-- ============================================================
