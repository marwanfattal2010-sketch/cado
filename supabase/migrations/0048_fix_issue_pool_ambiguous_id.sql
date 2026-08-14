-- ============================================================
-- 0048 — issue_pool_gift_card: qualify the ambiguous `id`
--
-- Purely a bug fix. Nothing is created, dropped or altered except the body
-- of one function that 0045/0047 already created.
--
-- WHAT WAS WRONG
--
-- The function returns `table (code text, id uuid, original_amount numeric)`,
-- so `id` is an OUT variable inside the body. Every bare `where id = ...`
-- against gift_card_pools then matched two things — the OUT variable and the
-- table's own column — and Postgres refused with:
--
--   42702: column reference "id" is ambiguous
--
-- It failed on the very first statement, which means the organizer got that
-- raw error instead of "this group gift is not fully funded yet", and a
-- genuinely funded pool could not be sent at all. Caught by verification
-- step 7.
--
-- THE FIX
--
-- Every column reference is table-qualified. No logic changes: the same
-- organizer check, the same funded check, the same recomputed total, the
-- same call into issue_gift_card_internal.
-- ============================================================

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
  select p.* into v_pool from gift_card_pools p where p.id = p_pool_id for update;
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
  select coalesce(sum(c.amount_cents), 0) into v_confirmed
    from gift_card_pool_contributions c
   where c.pool_id = v_pool.id and c.payment_status = 'confirmed';
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

  update gift_card_pools p
     set status = 'sent', gift_card_id = v_card.id, updated_at = now()
   where p.id = v_pool.id;

  return query select v_card.code, v_card.id, v_card.original_amount;
end;
$$;

revoke all on function issue_pool_gift_card(uuid, text) from public, anon;
grant execute on function issue_pool_gift_card(uuid, text) to authenticated;
