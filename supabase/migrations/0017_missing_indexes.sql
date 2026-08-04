-- PART 9: indexes on the columns that actually get filtered on every request.
-- orders/addresses/cart_items had none on their owner column — meaning every
-- RLS-scoped query (which is nearly every query in this app) was a full
-- table scan under the hood. Fine at today's row counts, a real slowdown
-- once there's real order volume.

create index if not exists orders_customer_id_idx on orders (customer_id);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists addresses_profile_id_idx on addresses (profile_id);
create index if not exists cart_items_profile_id_idx on cart_items (profile_id);
create index if not exists gift_card_transactions_store_id_idx on gift_card_transactions (store_id);
create index if not exists gift_cards_buyer_id_idx on gift_cards (buyer_id) where buyer_id is not null;
