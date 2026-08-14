-- ============================================================
-- 0051 — a cart line can be a gift card
--
-- Additive. No row is rewritten, no column is removed, and every cart line
-- that exists today stays valid exactly as it is.
--
-- NO FAKE PRODUCT, NO FAKE STORE. Marwan's rule, and it is also the right
-- design: a gift card is not sold by a partner, so inventing a "CADO" store
-- row to hang it off would put a fake shop in the partners table, a fake
-- product in the catalogue, and a fake payable in the payouts.
--
-- WHAT CHANGES
--
-- A cart line becomes one of two things: it points at a product, or it is a
-- gift card for an amount. Never both, never neither — the CHECK enforces
-- that, so a malformed line cannot exist at all.
--
-- WHY EXISTING CARTS AND ORDERS ARE UNAFFECTED
--
-- Every line in the cart today has a product_id, which satisfies the new
-- CHECK unchanged. Nothing is backfilled. And every query that reads the
-- cart today does it as `cart_items ci join products p on p.id =
-- ci.product_id` — an inner join, which simply does not see a line whose
-- product_id is null. So the existing checkout keeps working on store items
-- and steps straight over gift card lines without knowing they exist. That
-- is also why a store checkout cannot accidentally sweep up a gift card, and
-- why the final `delete from cart_items ... using products` leaves gift card
-- lines sitting in the cart where they belong.
--
-- The deployed frontend cannot create one of these lines, so nothing in this
-- migration can be tripped by the code that is live right now.
-- ============================================================

-- ------------------------------------------------------------
-- The cart
-- ------------------------------------------------------------

alter table cart_items alter column product_id drop not null;

alter table cart_items
  add column if not exists gift_card_amount_cents integer;

comment on column cart_items.gift_card_amount_cents is
  'Set only on gift card lines. The face value in cents. Bounded to the same $10-$500 range purchase_gift_card enforces, so the two ways of buying a card cannot disagree.';

alter table cart_items
  add constraint cart_items_gift_card_amount_range
  check (
    gift_card_amount_cents is null
    or (gift_card_amount_cents >= 1000 and gift_card_amount_cents <= 50000)
  );

-- Exactly one of the two. A line is a product or a gift card, never both and
-- never neither.
alter table cart_items
  add constraint cart_items_product_xor_gift_card
  check (
    (product_id is not null and gift_card_amount_cents is null)
    or (product_id is null and gift_card_amount_cents is not null)
  );

-- ------------------------------------------------------------
-- Which cards an order minted
--
-- These cannot be order_items: an order_item hangs off a sub_order, and
-- sub_orders.partner_id is NOT NULL — there is no store here. Their own
-- table keeps store_payables honest too, because CADO owes no partner
-- anything for its own gift card.
-- ------------------------------------------------------------

create table order_gift_cards (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  gift_card_id  uuid not null references gift_cards(id),
  amount_cents  integer not null check (amount_cents > 0),
  created_at    timestamptz not null default now(),
  unique (gift_card_id)
);

create index on order_gift_cards (order_id);

alter table order_gift_cards enable row level security;

-- The buyer can see which cards their own order produced. Nobody writes
-- here from a client: place_order is the only thing that inserts, and it is
-- SECURITY DEFINER.
create policy "buyer reads own order gift cards" on order_gift_cards
  for select using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_gift_cards.order_id and o.customer_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- An order is store items OR gift cards. Never both.
--
-- Enforced in the database and in both directions, so neither order of
-- insertion can slip through. Same shape as the one-store-per-order guard
-- in 0046, and for the same reason: the screen is not a boundary.
-- ------------------------------------------------------------

create or replace function enforce_no_gift_card_with_store_items()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from sub_orders so where so.order_id = new.order_id) then
    raise exception
      'A gift card cannot share an order with store items. Check them out separately.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists order_gift_cards_no_store_items on order_gift_cards;
create trigger order_gift_cards_no_store_items
  before insert on order_gift_cards
  for each row execute function enforce_no_gift_card_with_store_items();

-- The other direction. 0046's trigger already rejects a second store; this
-- replaces it with the same check plus the gift card one, so sub_orders has
-- one guard rather than two competing ones.
create or replace function enforce_one_store_per_order()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
begin
  select so.partner_id into v_other
    from sub_orders so
   where so.order_id = new.order_id
     and so.partner_id is distinct from new.partner_id
   limit 1;

  if v_other is not null then
    raise exception
      'An order can only contain items from one store. Check out each store separately.'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from order_gift_cards g where g.order_id = new.order_id) then
    raise exception
      'Store items cannot share an order with a gift card. Check them out separately.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
