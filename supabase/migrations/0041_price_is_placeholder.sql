-- 0041 — products.price_is_placeholder.
--
-- Marwan asked for a store to go up with invented prices while he waits on the
-- real ones from the owner. That is his call and there are no customers yet,
-- but an invented price is not the same kind of guess as an invented colour:
-- if an order is ever placed against one, somebody is out real money, and here
-- that somebody is family.
--
-- So the flag is not decoration. It exists so that:
--   * every fabricated price can be listed in one query before launch,
--   * the dashboard can mark them for the store owner to correct,
--   * and nobody later mistakes a placeholder for a supplier price.
--
-- Find them all:
--   select p.title, p.price, pa.name
--   from products p join partners pa on pa.id = p.partner_id
--   where p.price_is_placeholder;

alter table products add column if not exists price_is_placeholder boolean not null default false;

comment on column products.price_is_placeholder is
  'TRUE = price was invented as a stand-in, never confirmed by the store. MUST be resolved before the product can be sold: an order against a placeholder price is a real financial obligation on the partner.';

create index if not exists idx_products_price_placeholder
  on products(partner_id) where price_is_placeholder;
