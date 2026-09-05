-- Calvin Klein and Zara into the Fashion brand rail, near the front.
--
-- Both were added as partners with their own uploaded logos but no
-- display_rank, so migration 0096's rule never put them in the row: a store
-- with no products only appears where it is PINNED, and neither was.
--
-- They take ranks 3 and 4, directly behind GS and Zahar, which puts them in
-- the rail's second column — the first pair a shopper sees without dragging.
-- Everything from Adidas down shifts two places to make room.
--
-- TWO STATEMENTS, and it has to be two. `partners_display_slot_unique` is on
-- (display_category_id, display_rank), and a single UPDATE that renumbers a
-- contiguous block collides with itself halfway through: Adidas tries to take
-- slot 5 while Pull & Bear is still sitting in it. Clearing the whole block to
-- NULL first empties every slot before any of them is reassigned.
--
-- Anchor & Oak and Cedar Street Fashion are deliberately LEFT IN the rail.
-- They are active shops with real Fashion stock, and dropping a live store off
-- a category row is a merchandising decision with revenue attached — not a
-- side effect of adding two brands. They simply sit further right now.
--
-- Additive and idempotent: re-running it sets the same numbers.

do $$
declare
  fashion_id uuid;
  slugs text[] := array[
    'gs', 'zahar', 'calvin-klein', 'zara', 'adidas',
    'nike', 'pull-and-bear', 'bershka', 'mango', 'lc-waikiki'
  ];
begin
  select id into fashion_id from categories where slug = 'fashion';
  if fashion_id is null then
    raise notice 'no fashion category; nothing pinned';
    return;
  end if;

  -- 1. empty every slot this migration is about to fill.
  --    BOTH columns, not just the rank: `partners_display_pin_complete` is a
  --    check that a pin is all-or-nothing, so a row left holding a category
  --    with no rank is rejected. Unpinning means clearing the pair.
  update partners
     set display_rank = null, display_category_id = null
   where slug = any(slugs);

  -- 2. fill them, in order
  update partners set display_rank = v.rank, display_category_id = fashion_id
  from (
    select s.slug, s.ord as rank
    from unnest(slugs) with ordinality as s(slug, ord)
  ) as v
  where partners.slug = v.slug;
end $$;
