-- 0035 — a store owner can read its own order lines.
--
-- Found by the Stage 1 cross-store isolation test, which failed its POSITIVE
-- control: store A saw 0 of its own order_items. Verified against production
-- as a real logged-in store owner:
--
--     sub_orders visible : 7      (correct)
--     order_items visible: 0      (wrong -- ground truth is 14)
--     orders visible     : 0      (correct and deliberate, see 0020)
--
-- Cause. The SELECT policy from 0020 is:
--
--     exists (
--       select 1 from sub_orders so join orders o on o.id = so.order_id
--       where so.id = order_items.sub_order_id
--         and (o.customer_id = auth.uid() or so.partner_id = my_partner_id())
--     )
--
-- A policy's subquery is itself subject to the referenced table's RLS. The
-- subquery INNER JOINs orders, and 0020 deliberately left partners with no
-- read policy on orders, so for a partner the join produces no rows at all and
-- the whole EXISTS is false -- before the partner_id branch is ever evaluated.
-- The customer branch works only because a customer *can* read their own
-- orders, which is why this went unnoticed: the storefront was never affected.
--
-- Consequence: the store dashboard's orders screen renders every order with an
-- empty item list. It also silently invalidated an isolation assertion -- "sees
-- ZERO of store B's order items" passes trivially when the query returns
-- nothing for anybody.
--
-- Fix: split the two branches so the partner branch never touches orders. It
-- reaches its lines through sub_orders alone, which partners can already read
-- ("partner reads own sub_orders"). The customer branch is copied across
-- unchanged, orders join included.
--
-- This GRANTS no one anything new:
--   * partner branch is gated on so.partner_id = my_partner_id(), the same
--     predicate 0032's UPDATE policy already uses on this table.
--   * customer branch is byte-for-byte the old condition.
--   * admin is still excluded here on purpose (0020 removed direct admin read
--     because an admin browsing their own orders was seeing everyone's).
--     Admin reporting continues through SECURITY DEFINER functions.
--
-- Additive: replaces one SELECT policy. No column or table is altered.

drop policy if exists "read order_items via sub_order access" on order_items;
create policy "read order_items via sub_order access" on order_items
  for select using (
    -- The store that has to fulfil the line. Deliberately does NOT join orders.
    exists (
      select 1 from sub_orders so
      where so.id = order_items.sub_order_id
        and so.partner_id = my_partner_id()
    )
    -- The customer who bought it. Unchanged from 0020.
    or exists (
      select 1 from sub_orders so
      join orders o on o.id = so.order_id
      where so.id = order_items.sub_order_id
        and o.customer_id = auth.uid()
    )
  );
