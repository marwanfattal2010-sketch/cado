-- 0070: pausing a store actually hides it.
--
-- The dashboard offers "Pause" and tells the admin it hides the store's
-- products from the storefront while keeping all the data. That sentence was
-- not true. Product visibility was decided by products.is_active ALONE
-- (0001's "public reads active products"), and the storefront filters stores
-- by partners.is_live, never by partners.status. So a paused store kept
-- selling: its products stayed in the catalogue, in search, and orderable.
--
-- A control that lies about what it does is worse than no control, and this
-- one sits on the money path — so the rule moves into RLS, where it is the
-- security boundary rather than a filter some future query can forget.
--
-- BLAST RADIUS, measured against production before writing this:
--   active products                     101
--   ... belonging to an 'active' partner 101   (100%)
--   partners: 27 active, 4 pending (the [TEST] isolation fixtures, 0 products)
-- So today this hides nothing that is currently visible; 101 products before,
-- 101 after. It only changes what happens the NEXT time a store is paused.
-- Nothing gets stricter for the deployed storefront, so no deploy-first
-- safety window is needed (the 0046 lesson).

-- A SECURITY DEFINER helper, matching the is_admin() / my_partner_id() idiom
-- already used by these policies. It must be definer: a policy's subquery runs
-- under the CALLER's RLS, so reading partners inline would make product
-- visibility depend on whether the viewer can read the partner row — a
-- coupling that would fail quietly and differently for anon vs logged-in.
create or replace function partner_is_active(p_partner_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partners
     where id = p_partner_id
       and status = 'active'
  );
$$;

comment on function partner_is_active(uuid) is
  'True when the partner is trading. Used by the public product read policies so pausing a store removes its products from the storefront.';

-- The public catalogue: a product is public only if it is active AND its store
-- is trading. The owner's own view and the admin's view are untouched — a
-- paused store still sees and edits everything it has, which is the whole
-- point of pause rather than delete.
drop policy if exists "public reads active products" on products;
create policy "public reads active products" on products
  for select using (
    (is_active and partner_is_active(partner_id))
    or partner_id = my_partner_id()
    or is_admin()
  );

-- Variants follow the product, exactly as before; restated so the two policies
-- cannot drift apart.
drop policy if exists "public reads variants of visible products" on product_variants;
create policy "public reads variants of visible products" on product_variants
  for select using (
    exists (
      select 1 from products p
      where p.id = product_variants.product_id
        and (
          (p.is_active and partner_is_active(p.partner_id))
          or p.partner_id = my_partner_id()
          or is_admin()
        )
    )
  );
