-- PART 3: gift_cards, gift_card_transactions, store_payables, and audit_log get
-- ZERO browser-facing policies — not even "read your own". RLS was already
-- enabled on all four (confirmed by querying pg_class before writing this),
-- but each had a SELECT policy for a legitimate current user. Per the stricter
-- spec: no browser session should ever see these tables directly, full stop.
-- The service role (which bypasses RLS entirely) and the SECURITY DEFINER
-- functions already built (purchase_gift_card, check_gift_card_balance,
-- place_order) remain the only ways in or out.
--
-- Practical effect: a browser querying `select * from gift_cards` now gets an
-- empty result no matter who is logged in, admin included. If you need an
-- admin-facing gift card list or a "my purchases" screen, that will need a
-- dedicated function that checks admin/ownership explicitly and returns only
-- the safe columns (never pin_hash) — not a table policy. Say the word when
-- you want that screen and I'll build it that way.

drop policy if exists "buyer reads own gift cards" on gift_cards;
drop policy if exists "buyer or store reads own gift card transactions" on gift_card_transactions;
drop policy if exists "store reads own payables" on store_payables;
drop policy if exists "admin updates payables" on store_payables;
drop policy if exists "admin reads audit log" on audit_log;
