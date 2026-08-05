-- "customer reads own orders" included "OR is_admin()", added for the money
-- dashboard. But the admin dashboard reads through admin_money_summary() /
-- reconcile_gift_cards() (SECURITY DEFINER, bypasses RLS on its own) — it
-- never queries these tables directly via PostgREST. The only direct query
-- against orders/sub_orders/order_items is the customer-facing "My orders"
-- hook, so an admin account (which is also a regular customer) was seeing
-- every order in the system on their own orders page. Drop the admin
-- carve-out; nothing needs it.
drop policy if exists "customer reads own orders" on orders;
create policy "customer reads own orders" on orders
  for select using (customer_id = auth.uid());

-- The separate "admin full access to orders" policy (FOR ALL) grants the
-- same leak independently of the SELECT policy above, and also grants
-- direct-table INSERT/UPDATE/DELETE. Nothing reads or writes orders/
-- sub_orders directly as an admin — the admin dashboard goes through
-- admin_money_summary()/reconcile_gift_cards()/confirm_gift_card_payment()
-- etc., all SECURITY DEFINER and unaffected by RLS. Drop both.
drop policy if exists "admin full access to orders" on orders;
drop policy if exists "admin full access to sub_orders" on sub_orders;

drop policy if exists "customer reads own sub_orders" on sub_orders;
create policy "customer reads own sub_orders" on sub_orders
  for select using (
    exists (select 1 from orders o where o.id = sub_orders.order_id and o.customer_id = auth.uid())
    or partner_id = my_partner_id()
  );

drop policy if exists "read order_items via sub_order access" on order_items;
create policy "read order_items via sub_order access" on order_items
  for select using (
    exists (
      select 1 from sub_orders so join orders o on o.id = so.order_id
      where so.id = order_items.sub_order_id
        and (o.customer_id = auth.uid() or so.partner_id = my_partner_id())
    )
  );

-- Separate, worse bug: this INSERT policy's check was "is_admin() or true" —
-- always true, for any role. Anyone hitting PostgREST directly could insert
-- arbitrary order_items (any price, any quantity, any sub_order) bypassing
-- place_order() entirely: no stock check, no pricing, no caps. The RPC
-- doesn't need a permissive policy to write here — SECURITY DEFINER runs as
-- the function owner, which bypasses RLS via table ownership regardless of
-- policy. Drop client-side insert access completely.
drop policy if exists "admin writes order_items" on order_items;
