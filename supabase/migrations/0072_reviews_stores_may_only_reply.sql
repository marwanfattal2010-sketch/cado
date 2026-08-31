-- 0072: a store may reply to a review. It may not rewrite one.
--
-- 0068 gave partners UPDATE on their own reviews rows so they could answer a
-- customer publicly. Postgres row-level security has no notion of columns, so
-- `reviews_store_reply` — correct about WHICH rows — says nothing about WHICH
-- COLUMNS, and a partner calling PostgREST directly could therefore:
--
--   * flip status to 'hidden' and bury every bad review;
--   * edit `text`, putting words in a customer's mouth;
--   * change `rating`, turning one star into five.
--
-- The dashboard's own action only ever writes store_reply, but the project rule
-- is that RLS is the security boundary and the UI is not — a review system a
-- store can quietly edit is worse than having none, because it looks like
-- evidence.
--
-- Same shape as 0026's enforce_partner_privilege_columns(): a BEFORE UPDATE
-- trigger naming exactly what a non-admin may move. Admins keep writing status
-- directly, which is what the moderation screen does.

create or replace function enforce_review_reply_only() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role / triggers with no JWT, and CADO staff, are unrestricted.
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  -- Everything a review IS, as opposed to the store's answer to it.
  if new.id            is distinct from old.id
  or new.order_item_id is distinct from old.order_item_id
  or new.product_id    is distinct from old.product_id
  or new.partner_id    is distinct from old.partner_id
  or new.customer_id   is distinct from old.customer_id
  or new.rating        is distinct from old.rating
  or new.text          is distinct from old.text
  or new.created_at    is distinct from old.created_at then
    raise exception 'a store can only add a reply to a review, not change it';
  end if;

  -- Hiding a review is a CADO moderation decision, never the store's.
  if new.status is distinct from old.status then
    raise exception 'only CADO can hide or restore a review';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_enforce_reply_only on reviews;
create trigger reviews_enforce_reply_only
  before update on reviews
  for each row execute procedure enforce_review_reply_only();

comment on function enforce_review_reply_only() is
  'Row-level policies cannot restrict columns. This keeps a partner UPDATE on reviews to store_reply alone; rating, text and status stay CADO-only.';
