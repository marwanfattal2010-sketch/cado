-- 0093 — Fashion > Accessories holds five products and was switched off.
--
-- It was deactivated when 0089 emptied it by moving bags, belts and scarves to
-- Jewelry. 0092 moved them back, but a deactivated subcategory is invisible
-- everywhere: no circle in Shop by category, no option in the Category facet,
-- and no way to reach those five products except by scrolling the whole grid.
--
-- Deactivating an empty bucket is right; leaving it deactivated once it refills
-- is the bug. Fashion > Shoes stays off, because it genuinely has nothing in it
-- and Shoes is its own category.

update subcategories s
set is_active = true
from categories c
where c.id = s.category_id
  and c.slug = 'fashion'
  and s.slug = 'accessories'
  and exists (
    select 1 from products p
    where p.subcategory_id = s.id and p.is_active
  );
