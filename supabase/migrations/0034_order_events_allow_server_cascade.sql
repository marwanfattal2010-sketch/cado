-- 0034 — order_events: append-only for clients, deletable by the server.
--
-- Bug this fixes, found while building the Stage 1 teardown and reproduced in
-- psql: 0031 made order_events append-only with two triggers that raise
-- unconditionally (order_events_no_update, order_events_no_delete).
--
-- Row-level triggers also fire for rows removed by a foreign-key CASCADE and
-- for rows changed by a foreign-key SET NULL. order_events declares:
--     order_id      references orders(id)        on delete cascade
--     sub_order_id  references sub_orders(id)    on delete cascade
--     order_item_id references order_items(id)   on delete set null
--
-- So once a single event exists for an order, deleting that order, its
-- sub_orders or its items fails outright with 'order_events is append-only'.
-- Any order with a timeline becomes permanently undeletable — including the
-- seeded test orders this project must be able to tear down.
--
-- The fix follows the convention already set by 0026 and by
-- enforce_order_item_partner_update() in 0031: the guard applies to sessions
-- that have an identity and steps aside when auth.uid() is null, i.e. the
-- service role or psql. Those are already fully privileged — a caller that can
-- reach this trigger with a null uid could equally drop the trigger. The
-- guard's real job is stopping a browser session from rewriting the timeline,
-- and that is unchanged:
--
--   * order_events has no insert/update/delete policy at all, so no anon or
--     authenticated session can reach the table to write in the first place.
--   * If one somehow did, the trigger still raises for any non-null auth.uid().
--   * No client can trigger the cascade either: orders, sub_orders and
--     order_items have no DELETE policy for any role, admin included.
--
-- Additive: this replaces a function body. Nothing is dropped or retyped.

create or replace function order_events_are_immutable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'order_events is append-only: rows cannot be deleted';
  else
    raise exception 'order_events is append-only: rows cannot be modified';
  end if;
end;
$$;

drop trigger if exists order_events_no_update on order_events;
create trigger order_events_no_update
  before update on order_events
  for each row execute procedure order_events_are_immutable();

drop trigger if exists order_events_no_delete on order_events;
create trigger order_events_no_delete
  before delete on order_events
  for each row execute procedure order_events_are_immutable();
