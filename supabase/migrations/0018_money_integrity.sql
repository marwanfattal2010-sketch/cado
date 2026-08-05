-- PART 10: money integrity.
--
-- 1. Redemption (spending from a card during checkout) was writing to
--    gift_card_transactions but not audit_log — every OTHER balance change
--    (purchase, confirm, cancel, refund) does. Fixed for consistency: every
--    balance change now has both the domain ledger row and the general audit
--    trail row.
-- 2. A reconciliation function: sum(gift_card_transactions.amount_used) must
--    equal sum(original_amount - current_balance) across all cards. If it
--    doesn't, something is wrong and this says so by name.
-- 3. An admin-only liability summary: total money you owe on outstanding
--    gift card balances, and total owed to each store after commission.

create or replace function place_order(
  p_delivery_address_id uuid,
  p_delivery_date date default null,
  p_delivery_time_slot text default null,
  p_notes text default null,
  p_gift_card_code text default null,
  p_payment_method text default 'cod',
  p_gift_card_pin text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_partner_id uuid;
  v_sub_order_id uuid;
  v_partner_subtotal numeric(10,2);
  v_order_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_card gift_cards;
  v_gc_err constant text := 'That gift card code or PIN is not valid.';
  v_card_share numeric(10,2);
  v_commission_rate numeric(4,3);
  v_commission_amount numeric(10,2);
  rec record;
begin
  if p_payment_method not in ('cod', 'whish') then
    raise exception 'unknown payment method';
  end if;
  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Order notes are too long (1000 characters max)';
  end if;
  if p_delivery_time_slot is not null and length(p_delivery_time_slot) > 100 then
    raise exception 'Invalid delivery time slot';
  end if;

  if not exists (select 1 from addresses where id = p_delivery_address_id and profile_id = auth.uid()) then
    raise exception 'delivery address does not belong to the current user';
  end if;

  if not exists (select 1 from cart_items where profile_id = auth.uid()) then
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

    if p_gift_card_pin is null or crypt(p_gift_card_pin, v_card.pin_hash) <> v_card.pin_hash then
      update gift_cards set
        failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
      where id = v_card.id;
      raise exception '%', v_gc_err;
    end if;

    update gift_cards set failed_pin_attempts = 0 where id = v_card.id;
  end if;

  v_order_number := 'CADO-' || nextval('order_number_seq')::text;

  insert into orders (
    order_number, customer_id, delivery_address_id, subtotal, delivery_fee,
    discount_amount, total, notes, gift_card_code, payment_method, payment_status
  )
  values (
    v_order_number, auth.uid(), p_delivery_address_id, 0, 0,
    0, 0, p_notes, p_gift_card_code, p_payment_method, 'unpaid'
  )
  returning id into v_order_id;

  for v_partner_id in
    select distinct p.partner_id
    from cart_items ci join products p on p.id = ci.product_id
    where ci.profile_id = auth.uid()
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
      select ci.id as cart_item_id, ci.product_id, ci.quantity, ci.customization,
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

    insert into audit_log (actor, action, table_name, record_id, old_value, new_value)
    values (auth.uid()::text, 'redeem', 'gift_cards', v_card.id::text,
      jsonb_build_object('balance_before', v_card.current_balance + v_discount),
      jsonb_build_object('balance_after', v_card.current_balance, 'amount_used', v_discount, 'order_id', v_order_id));
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

  delete from cart_items where profile_id = auth.uid();

  return v_order_id;
end;
$$;

-- Reconciliation: the fundamental identity that must always hold is
--   sum(amount_used across all transactions for a card) = original_amount - current_balance
-- for every non-pending card. Returns only cards where it DOESN'T hold —
-- an empty result is the "everything is fine" answer.
create or replace function reconcile_gift_cards()
returns table (gift_card_id uuid, code text, expected_spent numeric, actual_spent numeric, discrepancy numeric)
language sql security definer set search_path = public as $$
  select
    gc.id,
    gc.code,
    gc.original_amount - gc.current_balance as expected_spent,
    coalesce(sum(t.amount_used), 0) as actual_spent,
    (gc.original_amount - gc.current_balance) - coalesce(sum(t.amount_used), 0) as discrepancy
  from gift_cards gc
  left join gift_card_transactions t on t.gift_card_id = gc.id
  where is_admin()
  group by gc.id, gc.code, gc.original_amount, gc.current_balance
  having (gc.original_amount - gc.current_balance) <> coalesce(sum(t.amount_used), 0);
$$;

revoke all on function reconcile_gift_cards() from public, anon;
grant execute on function reconcile_gift_cards() to authenticated;

-- Admin liability + payables summary in one call.
create or replace function admin_money_summary()
returns table (
  gift_cards_outstanding_liability numeric,
  gift_cards_pending_payment_total numeric,
  gift_cards_active_count bigint,
  store_id uuid,
  store_name text,
  store_gross_total numeric,
  store_commission_total numeric,
  store_net_owed_total numeric,
  store_net_paid_total numeric,
  store_net_unpaid_total numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  return query
  with gc_summary as (
    select
      coalesce(sum(current_balance) filter (where status = 'active'), 0) as outstanding,
      coalesce(sum(original_amount) filter (where status = 'pending_payment'), 0) as pending,
      count(*) filter (where status = 'active') as active_count
    from gift_cards
  )
  select
    gc_summary.outstanding,
    gc_summary.pending,
    gc_summary.active_count,
    p.id,
    p.name,
    coalesce(sum(sp.gross_amount), 0),
    coalesce(sum(sp.commission_amount), 0),
    coalesce(sum(sp.net_owed), 0),
    coalesce(sum(sp.net_owed) filter (where sp.status = 'paid'), 0),
    coalesce(sum(sp.net_owed) filter (where sp.status = 'pending'), 0)
  from gc_summary, partners p
  left join store_payables sp on sp.store_id = p.id
  where p.status = 'active'
  group by gc_summary.outstanding, gc_summary.pending, gc_summary.active_count, p.id, p.name
  order by p.name;
end;
$$;

revoke all on function admin_money_summary() from public, anon;
grant execute on function admin_money_summary() to authenticated;
