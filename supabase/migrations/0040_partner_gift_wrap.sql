-- 0040 — partners.offers_gift_wrap: stop promising wrapping every store does not do.
--
-- The product page carried a flat line, "Gift wrap — free, on every order".
-- That is a promise made on behalf of every partner, and it is not true for
-- all of them — a phone-accessories shop is not going to wrap. Saying it
-- anyway is the sort of small lie a customer discovers at the door.
--
-- Default TRUE so nothing changes for existing stores: every partner today
-- was onboarded under that promise, so leaving them opted in is the honest
-- default. A store opts out in the dashboard.

alter table partners add column if not exists offers_gift_wrap boolean not null default true;

comment on column partners.offers_gift_wrap is
  'Does this store gift-wrap? Drives the wrap line on the product page. Default true, matching the promise every existing partner was onboarded under.';

-- The two coming-soon stores are not wrapping anything, since they are not
-- selling yet. Set explicitly rather than leaving them on the default, so the
-- flag reflects reality the moment they do go live and get products.
update partners set offers_gift_wrap = false where is_live = false;
