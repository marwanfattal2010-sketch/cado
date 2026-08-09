-- 0017 caught the owner columns (orders.customer_id, addresses.profile_id,
-- cart_items.profile_id). These are the ones still missing.
--
-- order_items and order_status_history are the worst of them: their
-- sub_order_id is both the join column and the column the RLS policy's
-- EXISTS(...) subquery filters on, so every read of an order's contents was
-- a sequential scan of the whole table for every row considered.

create index if not exists order_items_sub_order_idx
  on order_items (sub_order_id);

create index if not exists order_status_history_sub_order_idx
  on order_status_history (sub_order_id);

create index if not exists user_reminders_profile_idx
  on user_reminders (profile_id);

-- Category pages sort by "newest" over active products only.
create index if not exists products_active_created_idx
  on products (created_at desc) where is_active;

-- admin_money_summary() aggregates gift_cards with FILTER (WHERE status = ...)
-- across the entire table, and store_payables the same way by status.
create index if not exists gift_cards_status_idx
  on gift_cards (status);

create index if not exists store_payables_status_idx
  on store_payables (status);

-- The audit log is only ever read newest-first.
create index if not exists audit_log_created_at_idx
  on audit_log (created_at desc);
