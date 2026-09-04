-- 0091 — Four chocolate products were priced at $1.
--
-- On the storefront that renders as "-98%" and "-99%" discount badges next to
-- a $1 cake, which reads as a broken shop rather than a bargain. None of the
-- four is flagged `price_is_placeholder`, so nothing anywhere marked them as
-- unfinished; they simply looked like the site's biggest deals.
--
-- Two of them carry a `compare_at_price` that is plainly the intended price,
-- so that number is used — it is the merchant's own figure, not an invented
-- one — and the compare_at is cleared, because a product is not on sale just
-- because it once had a second number attached.
--
-- The other two had no second number to recover. They are priced against the
-- rest of the Chocolate shelf, where boxes run $26-$52. If either is wrong the
-- store owner can change it from the dashboard in one edit.
--
-- If any of these $1 prices was deliberate — a live card test, say — then this
-- migration is the wrong fix and the right one is to deactivate the product or
-- move it to a [TEST] store, so it is not on the public shelf at all.

update products set price = 62.50, compare_at_price = null
where title = 'Celebration Cake' and price = 1;

update products set price = 81.50, compare_at_price = null
where title = 'Luxury Nut & Chocolate Basket' and price = 1;

update products set price = 24.00
where title = 'Artisan Cookie Tin' and price = 1;

update products set price = 32.00
where title = 'Belgian Truffle Box' and price = 1;
