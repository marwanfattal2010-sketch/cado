-- The gifting step at checkout (spec §6).
--
-- Most of what the step needs already exists, from 0024: is_gift,
-- recipient_name, recipient_phone, address_source, gift_message,
-- delivery_slot, and hide_price — which is what keeps the price off anything
-- the recipient sees.
--
-- Four things it cannot express yet:
--
--   1. WHERE THE GIFT GOES. "Straight to them" and "to me, I'm giving it in
--      person" are both gifting, and the difference changes the whole
--      journey: who the courier calls, whose address is used, and what the
--      tracking says. `address_source` can't carry this — it only says
--      whether we have an address or must go ask for one.
--
--   2. WHETHER IT IS A SURPRISE. If it is, the courier calls the SENDER to
--      arrange timing, never the recipient. Getting this wrong ruins the
--      one thing the buyer was paying for.
--
--   3. WRAPPING. Asked per order, and answered honestly: a seller who
--      cannot wrap should say so at checkout rather than fail afterwards.
--
--   4. WHO IT IS FROM, and WHEN IT IS NEEDED BY. The note has a message but
--      no signature, and "before the party" is a real constraint that
--      delivery_slot (a time-of-day string) does not hold.
--
-- All additive, all nullable or defaulted, so existing orders stay valid.

alter table orders
  -- 'recipient' = straight to them · 'buyer' = to me, I'm handing it over
  add column if not exists gift_destination text not null default 'recipient'
    check (gift_destination in ('recipient', 'buyer')),
  add column if not exists is_surprise boolean not null default false,
  add column if not exists gift_wrap boolean not null default false,
  add column if not exists gift_from text,
  add column if not exists needed_by date;

alter table orders
  add constraint orders_gift_from_len
    check (gift_from is null or char_length(gift_from) <= 120);

-- A surprise only means anything when the gift goes straight to the
-- recipient — there is nobody to keep it from if it is coming to you.
alter table orders
  add constraint orders_surprise_needs_recipient
    check (not is_surprise or gift_destination = 'recipient');

comment on column orders.gift_destination is
  'recipient = delivered to them; buyer = delivered to the buyer, who gives it in person. Both are gifts.';
comment on column orders.is_surprise is
  'When true the courier calls the SENDER to arrange timing, never the recipient.';

-- Whether a shop can wrap at all. Offering wrapping and then failing is
-- worse than not offering it, so checkout reads this before it asks.
alter table partners
  add column if not exists can_gift_wrap boolean not null default true;

comment on column partners.can_gift_wrap is
  'False hides the wrapping question at checkout for this store rather than promising something it cannot do.';
