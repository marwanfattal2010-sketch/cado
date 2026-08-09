-- place_order() and the orders table disagree about what a payment method is.
--
-- 0010 put this on the table:
--     check (payment_method in ('cod', 'whish'))
-- 0024 widened the function to accept 'cod', 'whish', 'omt', 'card', and the
-- checkout page offers OMT. So choosing OMT passes the function's own check,
-- then dies on the table constraint — the customer gets a raw Postgres error
-- and no order. Nothing is unsafe here; the order simply cannot be placed.
--
-- The constraint catches up to the function. Kept as a whitelist rather than
-- dropped: payment_method is written straight from a client-supplied string,
-- and an unconstrained text column there is how free-text junk ends up in
-- financial records.
--
-- 'card' is included only because place_order accepts it. There is no card
-- processor, no webhook, and no signature verification anywhere in this
-- project — an order marked 'card' means nothing has been charged. Every
-- order is still born payment_status = 'unpaid' and only an admin moves it,
-- which remains the only thing that makes a payment real here.

alter table orders drop constraint if exists orders_payment_method_check;

alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'whish', 'omt', 'card'));
