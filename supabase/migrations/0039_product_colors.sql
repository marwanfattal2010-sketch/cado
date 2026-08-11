-- 0039 — products.color, so the storefront's Colors filter runs on real data.
--
-- Marwan asked for a Colors filter now, before any store has entered colour
-- information. The choice was between hardcoding fake options in the UI or
-- giving the column a real home and seeding placeholder values. This is the
-- second: the filter genuinely reads the database, and a real store replaces
-- the value by editing its product like any other field.
--
-- IMPORTANT, and stated plainly because it will be forgotten otherwise: the
-- values seeded below are PLACEHOLDERS chosen to match each product's photo
-- as closely as possible. They are not supplier data. Before a real customer
-- can order on colour, a store owner has to confirm them, or someone will buy
-- "blue" and receive beige. `color_is_placeholder` marks every seeded row so
-- the dashboard can flag them and so they can be found again in one query.

alter table products add column if not exists color text;
alter table products add column if not exists color_is_placeholder boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_color_len') then
    alter table products add constraint products_color_len
      check (color is null or char_length(color) between 2 and 30);
  end if;
end $$;

create index if not exists idx_products_color on products(color) where color is not null;

-- Seed placeholders, matched to each product's actual photo where the photo
-- makes a colour obvious, and to the most ordinary version of the item where
-- it doesn't. Only rows with no colour yet, so re-running never overwrites a
-- store's real answer.
update products p set color = v.color, color_is_placeholder = true
from (values
  -- flowers: the colour is the flower, and these are unambiguous
  ('Signature Rose Bouquet', 'Red'),
  ('Peony Garden Bouquet', 'Pink'),
  ('Luxury Orchid Arrangement', 'White'),
  ('Wildflower Meadow', 'Multicolour'),
  ('Teddy & Tulips Set', 'Pink'),
  ('Cedar & Wildflower Box', 'Green'),
  ('New Beginnings Box', 'White'),
  ('The Housewarming Box', 'Beige'),
  -- fashion
  ('Cashmere Wrap Scarf', 'Beige'),
  ('Everyday Hoodie', 'Grey'),
  ('Kids Denim Jacket', 'Blue'),
  ('Leather Weekend Bag', 'Brown'),
  ('Merino Crewneck', 'Navy'),
  ('Silk Wrap Dress', 'Black'),
  ('Tailored Blazer', 'Black'),
  ('Classic Runner Sneakers', 'White'),
  -- jewellery: metal is the colour customers shop by
  ('Birthstone Pendant', 'Gold'),
  ('Classic Pearl Earrings', 'White'),
  ('Classic Steel Watch', 'Silver'),
  ('Engraved Signet Ring', 'Gold'),
  ('Gold Vermeil Pendant', 'Gold'),
  ('Layered Chain Necklace', 'Gold'),
  ('Minimalist Chain Bracelet', 'Silver'),
  ('Woven Cord Bracelet Set', 'Multicolour'),
  -- toys
  ('Alphabet Puzzle Board', 'Multicolour'),
  ('Dress-Up Trunk', 'Multicolour'),
  ('First Words Flashcards', 'Multicolour'),
  ('Plush Bear Companion', 'Brown'),
  ('Remote Control Race Car', 'Red'),
  ('STEM Robot Kit', 'Blue'),
  ('Storybook Collection Box', 'Multicolour'),
  ('Wooden Building Blocks Set', 'Multicolour')
) as v(title, color)
where p.title = v.title and p.color is null;

comment on column products.color is
  'Single dominant colour, shopper-facing. See color_is_placeholder.';
comment on column products.color_is_placeholder is
  'TRUE = seeded by migration 0039, never confirmed by the store. Must be verified before colour is treated as a promise to a customer.';
