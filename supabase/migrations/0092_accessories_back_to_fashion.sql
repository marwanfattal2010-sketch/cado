-- 0092 — Accessories belong to Fashion, not to Jewelry.
--
-- REVERSING PART OF 0089, ON INSTRUCTION.
--
-- 0089 moved bags, belts and scarves out of Fashion into Jewels & Accs on the
-- reading that they are accessories rather than clothing. The effect on the
-- page was the opposite of what was wanted: a jewellery tab whose circles and
-- recipient photos were black bags and belts, because those are the products
-- the tab now held.
--
-- The rule from here: Jewelry & Accessories is jewellery and watches only —
-- rings, necklaces, bracelets, earrings, watches. Everything you wear that is
-- not jewellery — bags, belts, scarves, wallets, hats — is Fashion, under a
-- single Accessories bucket.
--
-- NOTHING IS DELETED OR DEACTIVATED. Every product named here stays in its
-- store's inventory at the same price; only which tab it appears on changes.
-- The catalogue count before and after this migration is identical.

-- 1 -------------------------------------------------------------------------
-- The tab label goes back to the full name. It was shortened to fit the tab
-- strip, but the strip scrolls, so the abbreviation bought nothing and cost
-- the shopper a word they recognise.

update categories set name = 'Jewelry & Accessories' where slug = 'jewelry-accessories';
update browse_tabs set label = 'Jewelry & Accessories' where slug = 'jewelry';

-- 2 -------------------------------------------------------------------------
-- Bags, belts and scarves back to Fashion > Accessories.
--
-- Matched on subcategory rather than on a list of titles, so anything a store
-- files under Bags/Belts/Scarves later moves with them instead of being
-- stranded in the wrong tab.

update products p
set category_id = (select id from categories where slug = 'fashion'),
    subcategory_id = (
      select s.id from subcategories s
      join categories c on c.id = s.category_id
      where c.slug = 'fashion' and s.slug = 'accessories'
    )
where p.subcategory_id in (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'jewelry-accessories' and s.slug in ('bags', 'belts', 'scarves')
);

-- 3 -------------------------------------------------------------------------
-- The three empty buckets are deactivated, not dropped.
--
-- Deleting them would break any order line or saved link that still points at
-- one. Deactivated, they stop appearing in circles and filters immediately and
-- can be switched back on if the rule changes again.

update subcategories s
set is_active = false
from categories c
where c.id = s.category_id
  and c.slug = 'jewelry-accessories'
  and s.slug in ('bags', 'belts', 'scarves');
