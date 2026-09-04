-- 0095 — Fashion's Category values, as the brief names them.
--
-- The facet is meant to read Women · Men · Kids · Bags · Caps · Belts ·
-- Scarves. It read Women · Men · Kids · Accessories, with five different kinds
-- of thing in that last bucket — a bag, a belt and two scarves are not one
-- choice, and "Accessories" is the word you use when you have not decided.
--
-- Nothing moves category. Everything here is already Fashion; this only splits
-- one sub-bucket into the four it was standing in for, and lifts a cap out of
-- Kids where its shape rather than its wearer belongs.

insert into subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.sort_order
from categories c
cross join (values
  ('Bags',    'bags',    40),
  ('Caps',    'caps',    50),
  ('Belts',   'belts',   60),
  ('Scarves', 'scarves', 70)
) as v(name, slug, sort_order)
where c.slug = 'fashion'
  and not exists (
    select 1 from subcategories s where s.category_id = c.id and s.slug = v.slug
  );

-- Matched on title because these five are the whole of the old Accessories
-- bucket and each is a different kind of thing; there is no pattern to match on.
update products p set subcategory_id = (
  select s.id from subcategories s join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'bags')
where p.title in ('Bugatti Men Bag', 'Leather Weekend Bag');

update products p set subcategory_id = (
  select s.id from subcategories s join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'belts')
where p.title = 'Geox Men Belt';

update products p set subcategory_id = (
  select s.id from subcategories s join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'scarves')
where p.title in ('Bugatti Men Scarf', 'Cashmere Wrap Scarf');

-- A cap is a cap whoever wears it. Filed under Kids it was unreachable from
-- the Caps value the brief asks for, and Kids is about who it fits.
update products p set subcategory_id = (
  select s.id from subcategories s join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'caps')
where p.title = 'Zadig & Voltaire Kids Wing Cap';

-- Accessories is empty now. Deactivated, not deleted: an order line or a saved
-- link may still point at it, and it comes back by flipping one boolean.
update subcategories s set is_active = false
from categories c
where c.id = s.category_id and c.slug = 'fashion' and s.slug = 'accessories'
  and not exists (select 1 from products p where p.subcategory_id = s.id and p.is_active);
