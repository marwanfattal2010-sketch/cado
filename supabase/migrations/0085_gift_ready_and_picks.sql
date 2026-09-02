-- 0085: the flags the category-tab template needs (spec 2.12, 2.8, 2.9).
--
-- Additive only. Three flags that let the storefront say true things it
-- currently cannot:
--
--   products.is_gift_ready  boxed / wrapped / a set — drives "Ready to gift"
--   products.is_pick        the store owner's own pick — drives the honest
--                           fallback when "Best sellers" has no real orders
--                           behind it
--   partners.wraps_gifts    already exists as `offers_gift_wrap`; this adds a
--                           view-friendly alias comment rather than a second
--                           column, because two columns meaning the same thing
--                           drift apart within a month.

alter table products
  add column if not exists is_gift_ready boolean not null default false,
  add column if not exists is_pick boolean not null default false;

create index if not exists products_gift_ready_idx on products (category_id) where is_gift_ready;
create index if not exists products_pick_idx on products (category_id) where is_pick;

comment on column products.is_gift_ready is
  'Boxed, wrapped, or a set — set by the store owner or CADO. Drives the "Ready to gift" row; never inferred at render time.';
comment on column products.is_pick is
  'The store owner''s own pick. Shown as "Store picks" when there are not enough real orders to call anything a best seller.';

-- `offers_gift_wrap` is the existing column and the one place the answer lives.
comment on column partners.offers_gift_wrap is
  'Whether this shop can gift-wrap. The spec calls it wraps_gifts; the column keeps its original name so nothing has to be migrated twice.';

-- The storefront reads partners through explicit column grants (0081), so any
-- column a shopper's browser needs must be handed to anon by name.
grant select (offers_gift_wrap) on partners to anon;

-- ------------------------------------------------------------- backfill ----
-- Only where the answer is genuinely derivable from what a product already is.
-- A gift set IS boxed; that is what the category means. Nothing else is
-- guessed — an unflagged product simply does not appear in "Ready to gift",
-- which is the honest default.
update products p
   set is_gift_ready = true
  from categories c
 where c.id = p.category_id
   and c.slug = 'gift-sets'
   and not p.is_gift_ready;

-- Titles that say so themselves.
update products
   set is_gift_ready = true
 where not is_gift_ready
   and (title ilike '%gift set%' or title ilike '%hamper%' or title ilike '%gift box%'
        or title ilike '%boxed%' or title ilike '%bundle%');
