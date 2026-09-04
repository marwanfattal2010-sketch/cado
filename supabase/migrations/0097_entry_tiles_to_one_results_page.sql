-- 0097 — point the recipient and budget entry tiles at the one results page.
--
-- WHY THIS IS A DATA MIGRATION AND NOT A CODE CHANGE.
--
-- "For Her", "For Him" and the budget shortcuts are rows in `browse_tiles`,
-- not links in a component. Their link_value pointed at /gift-finder, which is
-- not an old results page — it is the gift QUIZ, a different feature with its
-- own filter UI. So every one of those taps landed a shopper on a screen whose
-- filters behave nothing like the ones on a category tab.
--
-- /browse is the one results page: sort row, facet chips, bottom-sheet filter
-- with counts, and a removable chip for whatever the tile pre-applied.
--
-- THE CATEGORY IS PRESERVED. "For Her" under Jewellery is a different tile
-- from "For Her" under Perfume, and dropping the category would have dumped
-- both into all 121 products. `category=<slug>` becomes `tab=<slug>`, which is
-- the param the results page reads for the category it is standing in — see
-- PARAM in apps/web/src/lib/browseParams.ts.
--
-- /gift-finder itself is untouched: it is still routed, still reachable, and
-- still the destination of the quiz. This migration only stops entry TILES
-- from using it as a results grid.
--
-- Nothing is deleted and no row is deactivated. Every statement is an UPDATE
-- keyed on the shape of the value rather than on a uuid, so it is idempotent
-- and it catches any tile of the same shape added since this was written.

begin;

-- 1. Recipient tiles: /gift-finder?category=<cat>&recipient=<who>
--    -> /browse?tab=<cat>&for=<who>
update browse_tiles
set link_value =
      '/browse?tab=' || substring(link_value from 'category=([a-z0-9_-]+)') ||
      '&for=' || substring(link_value from 'recipient=([a-z0-9_-]+)')
where link_type = 'url'
  and link_value like '/gift-finder?category=%'
  and link_value like '%recipient=%'
  and substring(link_value from 'category=([a-z0-9_-]+)') is not null
  and substring(link_value from 'recipient=([a-z0-9_-]+)') is not null;

-- 2. Budget tiles: /gift-finder?budget=<band> -> /browse?budget=<band>
--    The band slug is carried through unchanged; the results page validates it
--    against the real band list and tests it with inBudgetRange, whose upper
--    bound is exclusive because these four bands share their edges.
update browse_tiles
set link_value = '/browse?budget=' || substring(link_value from 'budget=([a-z0-9_-]+)')
where link_type = 'url'
  and link_value like '/gift-finder?budget=%'
  and substring(link_value from 'budget=([a-z0-9_-]+)') is not null;

-- 3. "New on CADO": a link_type 'filter' tile, which is the OLD in-page filter
--    mechanism — it set a client-side filter object on the home panel instead
--    of navigating. /new is the New arrivals results page it always meant.
update browse_tiles
set link_type = 'url',
    link_value = '/new'
where link_type = 'filter'
  and btrim(link_value) = '{"sort":"new"}';

commit;

-- Deliberately NOT changed, and why:
--
--   * the `{"max_price":N}` budget tiles on the ten CATEGORY tabs. Category
--     tabs stopped reading browse_blocks entirely (see TabPanel), so those
--     rows render nowhere today. Rewriting a link nobody can tap would be
--     changing data on a guess about a layout that has not been designed yet.
--   * `{"sort":"popular"}` ("Best sellers") on the All tab. There is no
--     best-sellers results page in this round, and `sort=popular` ranks by
--     real delivered orders — of which the catalogue has none — so pointing it
--     at /browse would promise an ordering that does not exist yet.
--   * the occasion tiles (`/gift-finder?category=X&occasion=Y`). /browse reads
--     `occasion` natively so the change is a one-liner of the same shape as
--     statement 1, but occasions were not in this round's brief and those
--     tiles are on category tabs, which render no blocks.
