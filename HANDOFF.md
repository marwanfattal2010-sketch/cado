# CADO — where the work stands

Read this first. It replaces having to re-explain anything.

Last updated: 2026-08-14.

---

## The one-line summary

The storefront is live and working. The **database half** of the group
gift-card feature is written but switched off. The **screens** for it are not
built yet.

Live site: https://cado-web.vercel.app
Branch everything is on: `prompt-10-storefront` (also pushed to `main` and
`master` — all three are identical).

---

## Recently finished and live

- Home is the tabbed browse page. Nine category tabs, swipeable, tab bar
  follows the swipe. `/category/:slug` and `/shop` both redirect into it.
- Every store has its own page at `/store/<name>`.
- One shared product card everywhere, masonry grid, Persimmon accent.
- Gift finder at `/find` — three questions, all skippable.
- Browse filter bar and filter panel — the old Filter/Sort pills are deleted.
- Nightly backup at 3am: all 28 tables **and** all photos from Supabase
  Storage, to `C:\Users\Marwan\cado-backups`. Writes
  `LAST-BACKUP-STATUS.txt` saying in words whether the last run worked, and
  warns as storage fills toward the free 1 GB.

---

## Session of 2026-08-14 — the gift-card design pass

Built and verified against a local dev server (Parts 1, 3, 4, 5, 6, 7 and the
group screens of Part 2 from Marwan's 12-part spec):

- Gift Cards tab is three cards — Send, Group (with a "New" pill), Redeem.
- Group gift card: create form, public pool page at
  `/gift-cards/group/:slug`, and the chip-in flow with the OMT reference.
  All three screens exist and render; **none of them can work until 0045 and
  0047 are applied**, because every pool function lives in those migrations.
- Delivery choice is two stacked cards with drawn artwork — a Persimmon card
  face showing `XXXX-XXXX-XXXX`, and the printed card in a cream envelope.
  Both in `components/giftcard/GiftCardArt.tsx`.
- The little note (To / From / one-line message, 120 chars) with an
  occasion-based suggestion and a live preview, shared by the single and
  group flows: `components/giftcard/GiftNote.tsx`.
- Account header is a cream card with a 56px Persimmon monogram — the black
  block is gone. Persimmon pass over Account's icons and buttons via a new
  `accent` Button variant. Home is untouched.
- Filter chips are 4px rectangles: cream with a near-black hairline when
  off, solid Persimmon with white text when on. Home's round chips untouched.
- Every customer-facing amount now goes through `formatMoney` — "$50", never
  "USD 50".

**Parts 8 and 9 are NOT built.** Separate carts, the "Your carts" screen, the
gift-card cart line, and the checkout rework ("Where should it go?", the
delivery window, hiding cash-on-delivery for a gift going straight to the
recipient) are all still to do. `Checkout.tsx:405` still says "Pick a date".
The database half of both — the per-store `place_order` and the trigger that
rejects a two-store order — is written in 0046/0047 and waiting.

## Written but NOT applied — do not apply without asking Marwan

Three migration files exist. They are inert until run. Apply in order:
0045, then 0046, then 0047.

- `supabase/migrations/0047_per_store_checkout_and_beauty.sql`
  - Renames the category and tab label to "Perfume & Beauty" and creates the
    four sub-categories (Perfume / Skincare / Makeup / Bath & Body) empty —
    the chips are already DB-driven, so each appears as products are tagged
    into it. Slug stays `perfumes`.
  - `get_pool_by_slug` returns first names only, on a public page.
  - `issue_pool_gift_card` takes a delivery method instead of assuming
    digital.
  - `place_order` gains a last argument `p_partner_id`. Null behaves exactly
    as today; set, it orders and empties one store's cart only.
  - **One statement is not additive**: `drop function place_order(...)`
    followed immediately by a create with the extra argument. Postgres
    cannot add a parameter in place, and two overloads would make every
    checkout call ambiguous. No data is touched.

- `supabase/migrations/0045_group_gift_cards_and_hours.sql`
  - `gift_card_pools` + `gift_card_pool_contributions` tables
  - Six functions: create / read-by-slug / contribute / confirm / issue /
    cancel, plus an admin refund list
  - `app_settings` — ONE row holding CADO's global opening window
    (09:00 placeholder, 21:00 close, Asia/Beirut). Not per-store hours.

- `supabase/migrations/0046_one_store_per_order.sql`
  - Trigger rejecting any order that spans two stores
  - Trigger rejecting a "Now" delivery while CADO is closed

Neither is destructive: no drops, no deletes, two `create or replace`.

**Applying them needs a Supabase access token from Marwan** — he generates one
per use at supabase.com/dashboard/account/tokens and revokes it after.
Data-only changes can instead go through the service-role key already in
`apps/dashboard/.env.local` (see `scripts/` for how the backup reads it) —
that works for INSERT/UPDATE but NOT for creating tables or functions.

---

## Still to build — the gift-card spec

Marwan's spec had 12 parts. Parts 2 (database) and 8.1/8.3 (database) are
done as the migrations above. Everything below is **not started**:

1. **Part 1** — Gift Cards tab: three option cards in a vertical stack, 48px
   Persimmon icon tiles, "New" pill on Group gift card.
   Files: `apps/web/src/pages/GiftCards.tsx`
2. **Part 3** — Delivery choice: Digital card vs Real card in an envelope,
   both drawn as inline SVG. *Marwan confirmed physical cards are real and
   delivered, so both options ship.*
3. **Part 4** — The little note: To / From / one-line message with an
   occasion-based suggestion, live preview card.
4. **Part 5** — Account header: no black rectangle; cream card, 56px circle
   with initials in Persimmon. Then a Persimmon pass over Account, Orders,
   Favorites, Gift Cards. **Do not touch Home's colours.**
5. **Part 6** — Rename "Perfumes" to "Perfume & Beauty" (display label only —
   Marwan agreed the slug stays `perfumes`, since it is user-visible in the
   URL). Sub-chips become All / Perfume / Skincare / Makeup / Bath & Body.
6. **Part 7** — Filter chips: radius 4px, cream + hairline when inactive,
   solid Persimmon + white text when active. Home category chips stay round.
7. **Part 2 screens** — Create group form, public group page at
   `/gift-cards/group/:slug`, and the Chip-in flow with OMT reference.
8. **Part 8 screens** — "Your carts": one card per store, cart count on the
   nav badge, open/closed strip from `app_settings`.
9. **Part 9** — Gift card "Add to cart", `$50` not `US$50`, and the checkout
   question "Where should it go? To me / Straight to them".

Suggested order: the six quick visual ones (1, 3, 4, 5, 6, 7), then the
group screens, then carts and checkout last because those touch live money.

---

## Facts worth knowing before touching anything

- **Payment is manual.** Card is not live ("we'll call you with a link").
  Whish and OMT are real but manual — the customer transfers to 81 900 002
  and a human confirms. There is no payment processor.
- **`place_order` currently allows an order to span two stores.** It loops
  `select distinct partner_id` and writes one sub_order per partner. 0046
  closes that with a trigger rather than rewriting the money function.
- **`purchase_gift_card` caps at $500.** Pool cards can exceed that, so 0045
  lifts the card-writing half into `issue_gift_card_internal` and both paths
  call it. Pool cards are still created `pending_payment`, so a pool cannot
  mint a spendable card without the normal admin activation.
- **No fake content, ever.** No invented contributor names, no fake progress,
  no placeholder ratings or sold counts. Empty states read as empty.
- **Repo uses CRLF.** Patches written against LF newlines silently match
  nothing — this has bitten several times.
- **Tailwind class names must be written out in full.** A class built from a
  variable produces no CSS at all.
- **Verify by reading the page's text/DOM.** Screenshots time out. There is a
  real Chromium available via `playwright-core` for checking things properly.

---

## Naming traps in this repo

- stores are `partners`; products link by `products.partner_id`
- product title is `products.title`, not `name`
- order to store goes through `sub_orders.partner_id`
- tab slug is not always the category slug: the category
  `jewelry-accessories` lives on the tab `jewelry`

---

## Still open, unrelated to the spec

- Zahar's nine prices are invented placeholders flagged
  `price_is_placeholder = true`. They must be replaced with real ones before
  real traffic.
- Backups exist only on Marwan's laptop. Copying that folder to a USB stick
  or a cloud drive would cover the laptop dying.
