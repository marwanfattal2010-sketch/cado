-- ============================================================================
-- 0032 — RLS for the dashboard tables
--
-- Two roles, expressed in terms that already exist:
--   admin        = profiles.role 'admin'    -> is_admin()
--   store owner  = profiles.role 'partner' with profiles.partner_id set
--                                           -> my_partner_id()
--
-- The rule the whole dashboard rests on: a store owner may never see another
-- store's products, order lines, payables, payout periods or metrics. That is
-- enforced here, in the database, not in the Next.js app — the storefront
-- already proved that RLS is the only real authorization boundary in this
-- system, and the dashboard's server routes are just another client.
--
-- New tables are created RLS-OFF by default in Postgres, which on Supabase
-- means anon can read them over PostgREST. Every one is enabled below.
--
-- What is deliberately NOT granted:
--   * admin gets no direct read on orders / sub_orders / order_items. 0020
--     removed that on purpose (an admin browsing their own order page was
--     seeing every order in the system). Admin reporting goes through
--     SECURITY DEFINER functions instead. Nothing here reopens it.
--   * nobody gets INSERT/UPDATE/DELETE on store_payables, store_metrics or
--     order_events from the client. Those are written by definer functions
--     and by place_order().
-- ============================================================================


-- ----------------------------------------------------------------------------
-- store_payables — the ledger that already existed with RLS on and ZERO
-- policies, i.e. invisible to everyone including the store it belongs to.
-- That is why partners have never been able to see what they are owed.
-- Read-only for both roles; status changes stay with admin_* functions and are
-- already audited by audit_payable_status_changes().
-- ----------------------------------------------------------------------------
drop policy if exists "partner reads own payables" on store_payables;
create policy "partner reads own payables" on store_payables
  for select using (store_id = my_partner_id());

drop policy if exists "admin reads payables" on store_payables;
create policy "admin reads payables" on store_payables
  for select using (is_admin());


-- ----------------------------------------------------------------------------
-- payout_periods
-- ----------------------------------------------------------------------------
alter table payout_periods enable row level security;

drop policy if exists "partner reads own payout periods" on payout_periods;
create policy "partner reads own payout periods" on payout_periods
  for select using (partner_id = my_partner_id());

drop policy if exists "admin manages payout periods" on payout_periods;
create policy "admin manages payout periods" on payout_periods
  for all using (is_admin()) with check (is_admin());


-- ----------------------------------------------------------------------------
-- store_metrics — read-only for the store it describes, read-only for admin.
-- Written only by rebuild_store_metrics().
-- ----------------------------------------------------------------------------
alter table store_metrics enable row level security;

drop policy if exists "partner reads own metrics" on store_metrics;
create policy "partner reads own metrics" on store_metrics
  for select using (partner_id = my_partner_id());

drop policy if exists "admin reads all metrics" on store_metrics;
create policy "admin reads all metrics" on store_metrics
  for select using (is_admin());


-- ----------------------------------------------------------------------------
-- product_variants — reachable through the product, so the policy has to
-- resolve the product's partner_id rather than trusting a denormalised column.
-- Public read matches "public reads active products": a variant of a hidden
-- product stays hidden.
-- ----------------------------------------------------------------------------
alter table product_variants enable row level security;

drop policy if exists "public reads variants of visible products" on product_variants;
create policy "public reads variants of visible products" on product_variants
  for select using (
    exists (
      select 1 from products p
      where p.id = product_variants.product_id
        and (p.is_active or p.partner_id = my_partner_id() or is_admin())
    )
  );

drop policy if exists "partner manages own variants" on product_variants;
create policy "partner manages own variants" on product_variants
  for all
  using (
    exists (select 1 from products p
            where p.id = product_variants.product_id and p.partner_id = my_partner_id())
  )
  with check (
    exists (select 1 from products p
            where p.id = product_variants.product_id and p.partner_id = my_partner_id())
  );

drop policy if exists "admin manages variants" on product_variants;
create policy "admin manages variants" on product_variants
  for all using (is_admin()) with check (is_admin());


-- ----------------------------------------------------------------------------
-- order_events — readable by whoever can already see the sub_order, plus
-- admin. Append-only from the client's point of view is enforced twice: no
-- INSERT/UPDATE/DELETE policy exists here at all, and the immutability
-- triggers from 0031 catch anything that reaches the table another way.
-- ----------------------------------------------------------------------------
alter table order_events enable row level security;

drop policy if exists "read order events via sub_order access" on order_events;
create policy "read order events via sub_order access" on order_events
  for select using (
    is_admin()
    or (partner_id is not null and partner_id = my_partner_id())
    or exists (
      select 1 from sub_orders so
      join orders o on o.id = so.order_id
      where so.id = order_events.sub_order_id
        and (o.customer_id = auth.uid() or so.partner_id = my_partner_id())
    )
  );


-- ----------------------------------------------------------------------------
-- notifications — a store sees what was sent about its own orders; admin sees
-- everything. No client writes.
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

drop policy if exists "partner reads own notifications" on notifications;
create policy "partner reads own notifications" on notifications
  for select using (partner_id = my_partner_id());

drop policy if exists "admin reads all notifications" on notifications;
create policy "admin reads all notifications" on notifications
  for select using (is_admin());


-- ----------------------------------------------------------------------------
-- store_owner_invites — admin only. The invited person never reads this table;
-- their account is provisioned server-side with the service role.
-- ----------------------------------------------------------------------------
alter table store_owner_invites enable row level security;

drop policy if exists "admin manages invites" on store_owner_invites;
create policy "admin manages invites" on store_owner_invites
  for all using (is_admin()) with check (is_admin());


-- ----------------------------------------------------------------------------
-- dashboard_seed_registry — admin only.
-- ----------------------------------------------------------------------------
alter table dashboard_seed_registry enable row level security;

drop policy if exists "admin reads seed registry" on dashboard_seed_registry;
create policy "admin reads seed registry" on dashboard_seed_registry
  for select using (is_admin());


-- ----------------------------------------------------------------------------
-- order_items: let a store confirm or reject its own lines.
--
-- order_items had a SELECT policy and nothing else — every write went through
-- place_order(). This adds the one write the dashboard needs. It is safe only
-- because of enforce_order_item_partner_update() in 0031, which is a BEFORE
-- UPDATE trigger that pins every money column: the policy alone would let a
-- store rewrite unit_price_snapshot on a placed order. A WITH CHECK cannot
-- express that, because it cannot see OLD — the same reason 0026 used
-- triggers.
-- ----------------------------------------------------------------------------
drop policy if exists "partner confirms own order items" on order_items;
create policy "partner confirms own order items" on order_items
  for update
  using (
    exists (select 1 from sub_orders so
            where so.id = order_items.sub_order_id and so.partner_id = my_partner_id())
  )
  with check (
    exists (select 1 from sub_orders so
            where so.id = order_items.sub_order_id and so.partner_id = my_partner_id())
  );
