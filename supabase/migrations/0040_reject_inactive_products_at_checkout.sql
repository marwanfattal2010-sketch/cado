-- Numbered 0040 deliberately: another agent owns 0031+ and is applying
-- migrations concurrently. Do not renumber this below 0040.
--
-- GAP: place_order() never checks products.is_active.
--
-- The cart loop is:
--     select ... from cart_items ci join products p on p.id = ci.product_id
--     where ci.profile_id = auth.uid()
-- There is no `and p.is_active` anywhere in the function. Deactivating a
-- product hides it from the catalogue (the "public reads active products"
-- policy filters on is_active) but does nothing to a cart that already holds
-- it. cart_items rows are not cleaned up when a product is withdrawn, and the
-- cart is read back through place_order's SECURITY DEFINER context, which
-- bypasses that policy entirely.
--
-- So a customer who added an item, then had the store withdraw it — pulled for
-- quality, discontinued, priced wrong, or seasonal — can still check out days
-- later. The store then owes a same-day delivery on something it deliberately
-- took off sale, and store_payables/commission rows are written for it.
--
-- Fixed with a BEFORE INSERT trigger on order_items rather than by editing
-- place_order(), following the pattern 0027 used for rate limiting: the money
-- function's body and its 12-parameter signature stay untouched. order_items
-- has no INSERT policy for anyone (checked live in pg_policies), so
-- place_order() is the only thing that ever inserts here — guarding the table
-- is equivalent to guarding the function, and it also covers any future
-- write path that forgets the check.
--
-- Raising inside the trigger aborts the whole transaction, so a cart with one
-- withdrawn item fails the entire order rather than silently dropping a line.
-- That is the correct trade: a partial order the customer did not agree to is
-- worse than an error telling them to remove the item.

create or replace function reject_inactive_product_at_checkout() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_active boolean;
  v_title text;
begin
  select p.is_active, p.title into v_active, v_title
  from products p where p.id = new.product_id;

  -- FK guarantees the row exists; treat a missing one as unorderable anyway
  -- rather than letting it through on a null.
  if v_active is null then
    raise exception 'That product is no longer available. Please remove it from your cart.';
  end if;

  if not v_active then
    raise exception '% is no longer available. Please remove it from your cart.',
      coalesce(v_title, 'An item in your cart');
  end if;

  return new;
end;
$$;

-- Fires after order_items_commission_snapshot (BEFORE INSERT triggers run in
-- alphabetical order by trigger name: "order_items_commission_snapshot" <
-- "order_items_reject_inactive"). Order does not matter here — this one only
-- reads products and either raises or returns NEW unchanged.
drop trigger if exists order_items_reject_inactive on order_items;
create trigger order_items_reject_inactive
  before insert on order_items
  for each row execute procedure reject_inactive_product_at_checkout();
