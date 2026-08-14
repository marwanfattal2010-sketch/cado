-- ============================================================
-- 0047 — Per-store checkout, Perfume & Beauty, and two fixes to 0045
--
-- NOT APPLIED. Written for review first.
--
-- Runs AFTER 0045 and 0046, both of which are also unapplied. Apply in
-- order: 0045, then 0046, then this.
--
-- ONE STATEMENT HERE IS NOT PURELY ADDITIVE and it is called out rather than
-- buried: `drop function place_order(...)` on line ~120, immediately followed
-- by a create of the same function with one extra argument. Postgres cannot
-- add a parameter to an existing function in place — `create or replace`
-- with a new argument list makes a SECOND overload, and two overloads that
-- both accept the same named arguments make every checkout call ambiguous
-- and fail. Dropping and recreating inside one transaction is the only way
-- to change the signature. It destroys no data: a function is code, not
-- rows, and the new body below is the old body with the store filter added.
--
-- Everything else is an insert, an update to two display labels, or a
-- `create or replace` of a function that 0045 created moments earlier.
-- Nothing is dropped, no column is removed, no order, product, cart or
-- gift card row is touched.
-- ============================================================

-- ============================================================
-- PART A — Perfume & Beauty (spec part 6)
--
-- The category holds skincare and makeup too, so "Perfumes" was wrong. The
-- slug stays `perfumes`: product rows point at it, and it is no longer
-- user-visible anyway — /category/:slug is now only a redirect for old
-- links, and the real page is a tab on "/".
--
-- The four sub-categories are created empty. Nothing is auto-assigned:
-- deciding whether a given bottle is Perfume or Bath & Body is a judgement
-- about real stock, and guessing it would put products under the wrong chip.
-- The chips are already driven by this table (useSubcategories), so each one
-- starts showing the moment products are tagged into it.
-- ============================================================

update categories set name = 'Perfume & Beauty' where slug = 'perfumes';
update browse_tabs  set label = 'Perfume & Beauty' where slug = 'perfumes';

insert into subcategories (category_id, name, slug, sort_order, is_active)
select c.id, v.name, v.slug, v.sort_order, true
from categories c
cross join (values
  ('Perfume',     'perfume',     1),
  ('Skincare',    'skincare',    2),
  ('Makeup',      'makeup',      3),
  ('Bath & Body', 'bath-body',   4)
) as v(name, slug, sort_order)
where c.slug = 'perfumes'
  and not exists (
    select 1 from subcategories s where s.category_id = c.id and s.slug = v.slug
  );

-- ============================================================
-- PART B — two corrections to 0045, which has never been run
--
-- B1. get_pool_by_slug returned each contributor's name exactly as typed.
-- The group page is public to anyone holding the link, so a contributor who
-- typed their full name had it published to everyone in the group. Only the
-- first word is returned now. The full name stays in the table for the admin
-- confirming the OMT transfer.
--
-- B2. issue_pool_gift_card hardcoded 'digital'. The organizer picks digital
-- or a real posted card on the same screen a single card uses, so the method
-- is now an argument. It is still validated inside issue_gift_card_internal.
-- ============================================================

create or replace function get_pool_by_slug(p_slug text)
returns table (
  slug text,
  recipient_name text,
  occasion text,
  goal_cents integer,
  confirmed_cents bigint,
  pending_cents bigint,
  contributor_count integer,
  status text,
  deadline date,
  is_organizer boolean,
  contributors jsonb
)
language sql stable security definer set search_path = public as $$
  select
    p.slug,
    -- First name only, on both the recipient and every contributor.
    split_part(btrim(p.recipient_name), ' ', 1),
    p.occasion,
    p.goal_cents,
    coalesce((select sum(c.amount_cents) from gift_card_pool_contributions c
               where c.pool_id = p.id and c.payment_status = 'confirmed'), 0)::bigint,
    coalesce((select sum(c.amount_cents) from gift_card_pool_contributions c
               where c.pool_id = p.id and c.payment_status = 'pending'), 0)::bigint,
    (select count(*) from gift_card_pool_contributions c
      where c.pool_id = p.id and c.payment_status = 'confirmed')::integer,
    p.status,
    p.deadline,
    (p.organizer_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', split_part(btrim(c.contributor_name), ' ', 1),
               'amount_cents', case when c.hide_amount then null else c.amount_cents end,
               'hidden', c.hide_amount,
               'message', c.message,
               'status', c.payment_status
             ) order by c.created_at desc)
      from gift_card_pool_contributions c
      where c.pool_id = p.id and c.payment_status in ('confirmed','pending')
    ), '[]'::jsonb)
  from gift_card_pools p
  where p.slug = p_slug
$$;

grant execute on function get_pool_by_slug(text) to anon, authenticated;

create or replace function issue_pool_gift_card(
  p_pool_id uuid,
  p_delivery_method text default 'digital'
)
returns table (code text, id uuid, original_amount numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pool gift_card_pools;
  v_confirmed bigint;
  v_card record;
begin
  select * into v_pool from gift_card_pools where id = p_pool_id for update;
  if not found then
    raise exception 'Group gift not found.';
  end if;
  if v_pool.organizer_id <> auth.uid() then
    raise exception 'Only the organizer can send this gift card.';
  end if;
  if v_pool.status <> 'funded' then
    raise exception 'This group gift is not fully funded yet.';
  end if;

  -- Recomputed rather than trusted, even though status already says funded.
  select coalesce(sum(amount_cents), 0) into v_confirmed
    from gift_card_pool_contributions
   where pool_id = v_pool.id and payment_status = 'confirmed';
  if v_confirmed < v_pool.goal_cents then
    raise exception 'The confirmed total is below the goal.';
  end if;

  select * into v_card from issue_gift_card_internal(
    (v_pool.goal_cents / 100.0)::numeric,
    v_pool.organizer_id,
    coalesce(v_pool.note_to, v_pool.recipient_name),
    null,
    v_pool.note_message,
    coalesce(p_delivery_method, 'digital'),
    v_pool.note_from,
    null
  );

  update gift_card_pools
     set status = 'sent', gift_card_id = v_card.id, updated_at = now()
   where id = v_pool.id;

  return query select v_card.code, v_card.id, v_card.original_amount;
end;
$$;

revoke all on function issue_pool_gift_card(uuid, text) from public, anon;
grant execute on function issue_pool_gift_card(uuid, text) to authenticated;

-- The single-argument version 0045 created is now shadowed by the two-arg
-- one above. Dropped so there is exactly one, and no ambiguity about which
-- a client call resolves to.
drop function if exists issue_pool_gift_card(uuid);

-- ============================================================
-- PART C — place_order takes one store at a time (spec part 8)
--
-- WHAT WAS WRONG
--
-- place_order read the WHOLE cart: `select distinct p.partner_id ... where
-- ci.profile_id = auth.uid()`, one sub_order per partner, then
-- `delete from cart_items where profile_id = auth.uid()` — every item, every
-- store. With separate carts in the app, checking out the GS cart would have
-- ordered the Zahar cart too and then emptied both. 0046's trigger would
-- have rejected the result, so nothing would have been silently mis-shipped
-- — but checkout would simply have failed for anyone holding two carts.
--
-- WHAT CHANGES
--
-- One new last argument, `p_partner_id`. When it is null the function
-- behaves exactly as before, so nothing that calls it today breaks. When it
-- is set, all four cart reads and the final delete are filtered to that one
-- store. The money arithmetic, the gift card logic, the commission split,
-- the stock decrement and the audit rows are byte-for-byte the 0024 body.
-- ============================================================

drop function if exists place_order(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text);

create function place_order(
  p_delivery_address_id uuid default null,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod',
  p_is_gift boolean default true,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_address_source text default 'buyer',
  p_hide_price boolean default false,
  p_gift_message text default null,
  p_partner_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 5.00;
  v_discount numeric(10,2) := 0;
  v_card gift_cards;
  v_gc_err constant text := 'That gift card code is not valid.';
  v_card_share numeric(10,2);
  v_commission_rate numeric(4,3);
  v_commission_amount numeric(10,2);
  rec record;
begin
  if auth.uid() is null then
    raise exception 'must be logged in to place an order';
  end if;
  if p_payment_method not in ('cod', 'whish', 'omt', 'card') then
    raise exception 'unknown payment method';
  end if;
  if p_address_source not in ('buyer', 'recipient_whatsapp') then
    raise exception 'unknown address source';
  end if;
  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Order notes are too long (1000 characters max)';
  end if;
  if p_gift_message is not null and length(p_gift_message) > 500 then
    raise exception 'Gift message is too long (500 characters max)';
  end if;

  -- Deliverability, enforced here as well as by the CHECK so the error the
  -- customer sees is a sentence rather than a constraint name.
  if p_address_source = 'buyer' then
    if p_delivery_address_id is null then
      raise exception 'Choose a delivery address';
    end if;
    if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
      raise exception 'delivery address does not belong to the current user';
    end if;
  else
    if p_recipient_phone is null or length(trim(p_recipient_phone)) < 6 then
      raise exception 'Add their phone number so we can ask where to deliver';
    end if;
  end if;

  -- "Empty" now means empty *for the store being checked out*.
  if not exists (
    select 1 from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
      and (p_partner_id is null or p.partner_id = p_partner_id)
  ) then
    raise exception 'cart is empty';
  end if;

  if p_gift_card_code is not null then
    perform check_rate_limit('gift_card_redeem', 5);
    select * into v_card from gift_cards where code = p_gift_card_code for update;
    if not found or v_card.status != 'active'
       or (v_card.locked_until is not null and v_card.locked_until > now())
    then
      raise exception '%', v_gc_err;
    end if;
    if v_card.expires_at is not null and v_card.expires_at < now() then
      update gift_cards set status = 'expired' where id = v_card.id;
      raise exception '%', v_gc_err;
    end if;
  end if;

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (
    order_number, customer_id, delivery_address_id, subtotal, delivery_fee,
    discount_amount, total, notes, gift_card_code, payment_method, payment_status,
    is_gift, recipient_name, recipient_phone, address_source, hide_price, gift_message, delivery_slot
  )
  values (
    v_order_number, auth.uid(),
    case when p_address_source = 'buyer' then p_delivery_address_id else null end,
    0, 0, 0, 0, p_notes, p_gift_card_code, p_payment_method, 'unpaid',
    p_is_gift, nullif(trim(coalesce(p_recipient_name, '')), ''), nullif(trim(coalesce(p_recipient_phone, '')), ''),
    p_address_source, p_hide_price, nullif(trim(coalesce(p_gift_message, '')), ''), p_delivery_time_slot
  )
  returning id into v_order_id;

  for v_partner_id in
    select distinct p.partner_id
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
      and (p_partner_id is null or p.partner_id = p_partner_id)
  loop
    select coalesce(sum(
      (p.price + case when (ci.customization->>'gift_wrap')::boolean is true then p.gift_wrap_price else 0 end)
      * ci.quantity
    ), 0)
    into v_partner_subtotal
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid() and p.partner_id = v_partner_id;

    insert into sub_orders (order_id, partner_id, delivery_date, delivery_time_slot, subtotal, delivery_fee, total)
    values (v_order_id, v_partner_id, p_delivery_date, p_delivery_time_slot, v_partner_subtotal, 0, v_partner_subtotal)
    returning id into v_sub_order_id;

    for rec in
      select ci.product_id, ci.quantity, ci.customization,
             p.title, p.price, p.gift_wrap_price, p.stock_quantity
      from cart_items ci join products p on p.id = ci.product_id
      where ci.profile_id = auth.uid() and p.partner_id = v_partner_id
    loop
      if rec.stock_quantity < rec.quantity then
        raise exception 'insufficient stock for product %', rec.product_id;
      end if;

      insert into order_items (
        sub_order_id, product_id, product_title_snapshot, unit_price_snapshot,
        quantity, customization, line_total
      ) values (
        v_sub_order_id, rec.product_id, rec.title,
        rec.price + case when (rec.customization->>'gift_wrap')::boolean is true then rec.gift_wrap_price else 0 end,
        rec.quantity, rec.customization,
        (rec.price + case when (rec.customization->>'gift_wrap')::boolean is true then rec.gift_wrap_price else 0 end) * rec.quantity
      );

      update products set stock_quantity = stock_quantity - rec.quantity where id = rec.product_id;
    end loop;

    v_order_subtotal := v_order_subtotal + v_partner_subtotal;
  end loop;

  if v_card.id is not null then
    v_discount := least(v_card.current_balance, v_order_subtotal + v_delivery_fee);
    update gift_cards
      set current_balance = current_balance - v_discount,
          status = case when current_balance - v_discount <= 0 then 'depleted' else status end
      where id = v_card.id
      returning current_balance into v_card.current_balance;

    insert into audit_log (actor, action, table_name, record_id, new_value)
    values (auth.uid()::text, 'gift_card_redeemed', 'gift_cards', v_card.id::text,
      jsonb_build_object('order_id', v_order_id, 'amount_used', v_discount));
  end if;

  update orders
  set subtotal = v_order_subtotal, delivery_fee = v_delivery_fee, discount_amount = v_discount,
      total = greatest(v_order_subtotal + v_delivery_fee - v_discount, 0)
  where id = v_order_id;

  for v_partner_id, v_partner_subtotal in
    select so.partner_id, so.subtotal from sub_orders so where so.order_id = v_order_id
  loop
    v_commission_rate := (select commission_rate from partners where id = v_partner_id);
    v_commission_amount := round(v_partner_subtotal * v_commission_rate, 2);

    insert into store_payables (store_id, order_id, gross_amount, commission_rate, commission_amount, net_owed)
    values (v_partner_id, v_order_id, v_partner_subtotal, v_commission_rate, v_commission_amount,
            v_partner_subtotal - v_commission_amount);

    if v_card.id is not null and v_discount > 0 and v_order_subtotal > 0 then
      v_card_share := round(v_discount * (v_partner_subtotal / v_order_subtotal), 2);
      if v_card_share > 0 then
        insert into gift_card_transactions (gift_card_id, order_id, amount_used, balance_after, store_id)
        values (v_card.id, v_order_id, v_card_share, v_card.current_balance, v_partner_id);
      end if;
    end if;
  end loop;

  -- Only the store that was just ordered is emptied. The shopper's other
  -- carts are still sitting there when they come back.
  delete from cart_items ci
   using products p
   where ci.product_id = p.id
     and ci.profile_id = auth.uid()
     and (p_partner_id is null or p.partner_id = p_partner_id);

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid)
  from public, anon;
grant execute on function place_order(uuid, date, text, text, text, text, boolean, text, text, text, boolean, text, uuid)
  to authenticated;
