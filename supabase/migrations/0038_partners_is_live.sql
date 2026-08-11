-- 0038 — partners.is_live: listed on the storefront vs actually shoppable.
--
-- The homepage stores row wants to show signed-but-not-launched stores as
-- "Coming soon" — visible, not clickable, no products. That is a real state a
-- marketplace has, so it gets a real column instead of a naming convention.
--
-- Default TRUE so every existing store keeps behaving exactly as today.
-- is_live=false stores are still readable through "public reads active
-- partners" on purpose: the storefront needs to render the badge. They sell
-- nothing because they have no products, not because of a policy trick.

alter table partners add column if not exists is_live boolean not null default true;

-- The two coming-soon stores Marwan asked for (GS, Zahar). Deterministic ids
-- so re-running is a no-op. No products are created for them, deliberately.
insert into partners (id, name, slug, status, is_live, city, commission_rate)
values
  ('c05e9f1e-0038-4c05-9f1e-000000000001', 'GS',    'gs',    'active', false, 'Tripoli', 0.15),
  ('c05e9f1e-0038-4c05-9f1e-000000000002', 'Zahar', 'zahar', 'active', false, 'Tripoli', 0.15)
on conflict (id) do nothing;
