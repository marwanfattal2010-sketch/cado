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

## TASK A — homepage batch: tiles, Gift Sets, Sport, splash pattern

Marwan's spec is the "CADO homepage — tile row, category row, Gift Sets,
Sport, photos" message plus a section 8 on the splash. Decisions he has
ALREADY made — do not re-ask:

- **GS's eleven Home & Gifts products: DEACTIVATE, never delete.** They are
  NOT seed data. Checked against dashboard_seed_registry: none seeded, none
  with placeholder prices, all belong to GS, a real partner, with real stock.
  Deleting them would wipe a live store's catalogue. `is_active = false` is
  reversible in one update; deletion is not. He chose this himself (option 3).
- **Draw the eighteen splash icons by hand**, no icon dependency. Already
  done — `apps/web/src/components/SplashPattern.tsx`, house style matching
  components/Icons.tsx, flat line only, offset rows, radial mask so the
  wordmark stays readable. Not yet wired to anything.
- **Placeholder photos are allowed for now**, but only reuse images already
  in the project. A mismatched photo on a product listing (a teacup on a
  football boot) causes refunds — prefer no photo on seed products and use
  stand-ins only for the three tile images.

**Where the homepage actually lives — this is the answer to his section 5:**
almost none of it is code.
- the tile row (Stores / New on CADO / Under $50 / Same-day / Occasions) is
  rows in `browse_tiles`
- the top chip row and the Shop-by-category row both read `categories` and
  `browse_tabs`, which is why they cannot currently disagree
- the hero headline, subcopy and CTA are rows in `browse_banners`
So sections 1-5 are a migration plus seed products, not a React change.

**Android 12+ and the splash, already settled:** the system splash on
Android 12+ is locked to a centred icon on a solid colour — a full-bleed
tiled pattern is impossible there. Route: keep the system splash plain
persimmon with the wordmark, and show the patterned screen as a brief in-app
launch screen after it. Keep it UNDER ONE SECOND: the previous in-app splash
was 4.8 seconds and Marwan reported it as a bug tonight.

### ✅ The splash pattern is BUILT and wired — 2026-08-15

Done exactly on the route above, and it lives in the ANDROID APP, not on the
website. Layout.tsx still has no splash and should keep none — the web is not
where this belongs.

- `scripts/make-splash-pattern.mjs` renders the artwork. It reads the eighteen
  glyphs straight out of `apps/web/src/components/SplashPattern.tsx`, so that
  file stays the one place they are drawn, and writes
  `apps/mobile/assets/splash-pattern.png` (1242x2688) and
  `splash-wordmark.png` (1024, transparent). Re-run it after any edit to the
  component. It also drops the SVG and three phone-shaped previews in
  `scripts/assets/` and prints an ink-density check.
- `apps/mobile/app/index.tsx` shows the patterned screen over the WebView and
  takes it away after **700ms plus a 200ms fade — 900ms worst case**, or
  sooner if the site has painted. Timings are the three constants at the top.
- The wordmark is the same picture at the same 200dp in both screens, so the
  handover from the system splash is invisible.
- The mobile shell's background was `#17140F`. That near-black WAS the black
  flash in TASK B item 1.4 — it is persimmon now.

**Two real bugs were found in SplashPattern.tsx while wiring it**, both
invisible until something rendered it: the mask stops were black, and a mask
is read by luminance, so the whole pattern drew as nothing; and the 4x4 tile
only ever used the first sixteen glyphs, silently dropping the headphones and
the gift card envelope. Tile is 6x18 now and every icon appears.

**Not verified on a real handset.** It was proved by rendering the actual
React Native tree at three phone shapes (16:9, 19.5:9, 20:9) and timing the
dismissal, not by installing an APK.

**Still to do:** the migration itself (deactivate GS's products, create Gift
Sets and Sport, retile the entry row, drop Gift Cards from the category row),
seed products for both new categories, the three photo swaps, wiring the
splash pattern, then verify at 375px and deploy.

## TASK 0 — the Android app: new icon, then build

Marwan wants the app icon to be **the Persimmon one with just the CADO
wordmark** — no gift box, no bow. Persimmon `#F94E33` background, cream
`#F6F1E7` wordmark in Jost 600, which is the same face the real logo uses.

**The icon must be made BEFORE the build.** The app icon is baked in at build
time; everything else about the app is not (see below).

**How to render it — do NOT shuttle base64 through the chat.** That was
tried and it is slow and fragile. The wordmark needs real Jost, which only a
browser has, so:
  1. Write `scripts/make-icons.mjs` that drives a headless browser to
     `https://cado-web.vercel.app` (where Jost 600 is already loaded and
     verified available), draws on a canvas, and writes the PNG straight to
     disk with `fs.writeFileSync`.
  2. `playwright-core` is NOT installed at the repo root — install it, or use
     any headless Chromium already on the machine.
  3. Two files: `apps/mobile/assets/icon.png` (1024x1024, Persimmon fill,
     wordmark ~55% of width) and `apps/mobile/assets/android-icon-foreground.png`
     (1024x1024, transparent, wordmark ~55% so it clears Android's circular
     mask — the safe zone is the middle ~66%).
  4. In `apps/mobile/app.json`, change `android.adaptiveIcon.backgroundColor`
     from `#F6F1E7` to `#F94E33`.

The canvas recipe that was verified working: `letterSpacing = '14px'`,
`font = '600 <size>px Jost'`, measure "CADO", scale the size so the measured
width hits the target, then centre using the actual bounding box ascent and
descent (not the baseline — it sits visibly low without that).

**Then build:**

    cd apps/mobile
    EXPO_TOKEN=<token> npx eas-cli build --platform android --profile preview

**Run it from `apps/mobile`, never from the repo root.** There is a stray
untracked `app.json` at the root containing nothing but `{"expo": {}}` — junk
from an Expo command run in the wrong folder. Building from the root would
pick that up instead of the real config and produce a nameless, iconless app.
Deleting it is safe.

The `preview` profile is already configured to produce an **APK**, which is
the installable file Marwan wants a link for. `production` makes an app
bundle for the Play Store instead — not what he asked for. The build runs on
Expo's servers and takes 10-20 minutes; it ends with a URL.

**Marwan's Expo account is `marwanfattal`** and his token worked. It is
almost certainly revoked by now — ask for a fresh one from
https://expo.dev/settings/access-tokens.

**Worth telling him again, because it is the good news:** the app is a
WebView wrapping `https://cado-web.vercel.app` (see `apps/mobile/app/index.tsx`).
So every page, price, product and feature changes without any rebuild — only
the icon, name, splash and permissions are baked in.

**Also still not done:** the site has NO web app manifest. Adding one would
let anyone install the site from Chrome's "Add to Home screen" and have it
open full-screen with the right icon, with no APK at all.

**But it is NOT the ten-minute job it looks like, checked 2026-08-15.** The
manifest itself is one small file plus two lines in `apps/web/index.html`, and
`public/brand/logo-icon-192.png` and `-512.png` already exist — but they are
the OLD branding: cream background, gift box with a gold bow, serif CADO. So
are the favicons and the apple-touch icon. Ship a manifest today and the old
logo goes onto people's home screens, which is TASK B item 1.4 made worse.
Order of work: regenerate 192, 512, 180, 32 and 16 as the persimmon wordmark
first (`scripts/make-app-icons.mjs` is the model — it already draws exactly
that), then the manifest is genuinely quick.

## ✅ TASK 1 — DONE 2026-08-14. Double-tap can no longer create two orders.

Fixed in `0050_one_payment_one_order.sql`, **applied to production and
proved**: two `place_order` calls fired at the same instant — one created
the order, the other was refused with "cart is empty", and exactly one order
existed afterwards. Before the fix both would have succeeded.

No deploy was needed; the fix is entirely inside the database and the
frontend calls it exactly as before. The migration was generated by
extracting the live function from 0047 and inserting one statement, so a
diff shows the lock as the only change.

The original description is kept below because the reasoning still matters.

---

**What happens:** `place_order` reads the cart, writes the order, then
deletes the cart — all in one transaction. A second tap a moment later finds
an empty cart and stops, which is why this has not been noticed. But two
SIMULTANEOUS calls — a double-tap, or a phone retrying on bad signal — both
read the cart before either commits. Both succeed. **Two orders, two
charges, one payment.** Once gift cards are minted at checkout it becomes
two cards for one payment as well.

**The fix, and it is small:** take a row lock on the cart lines at the very
top of `place_order`, before anything else:

    perform 1 from cart_items where profile_id = auth.uid() for update;

The second transaction then blocks until the first commits, finds no rows,
and stops on the "cart is empty" check that is already there. No new error
path, no new state.

**Prove it:** fire two identical `place_order` calls concurrently against a
one-item cart and confirm exactly one order exists afterwards. Do not accept
"the button is disabled while pending" as the fix — that is the browser, and
the browser is not the boundary.

## ✅ TASK 2 — DONE 2026-08-14. A gift card goes in the cart.

Built, applied (0051, 0052), verified and deployed. Checks 14 and 15 pass.
The design notes below were the plan and still describe what was built.

---

## TASK 2 (original plan) — a gift card in the cart (spec 9.1 / 9.2)

Start fresh. Do not touch anything else. Marwan's rule, in his words: no
fake product row and no fake store to stand in for a gift card. No fake data
in the database, ever.

**The constraint that decides the design:** `sub_orders.partner_id` is NOT
NULL. Every sub-order must name a real store, and a gift card has none. That
is precisely why the fake-store shortcut is tempting, and it is banned.

**The shape that follows:**

1. `cart_items.product_id` becomes nullable, and the table gains
   `gift_card_amount_cents` plus the note fields. A CHECK enforces exactly
   one of the two: either it points at a product, or it is a gift card for
   an amount. A row can never be both or neither, so no existing cart row
   changes meaning and nothing needs backfilling.
2. Gift card lines have no `partner_id`, so they group into their own cart
   on the Your carts screen. Everything already groups by
   `product.partner.id`, which is null for these — that is the separation,
   with no extra flag.
3. `place_order` gains a way to say "the gift card cart" rather than a store
   id. Today `p_partner_id = null` means "everything", so a third state is
   needed — most likely a separate argument, because overloading null would
   silently change what existing callers get.
4. The card is minted inside `place_order`, by calling
   `issue_gift_card_internal` (0045) — the one place that writes a gift card
   row. It is created `pending_payment`, exactly like a card bought today,
   so no card becomes spendable until an admin confirms the money arrived.
   The client never mints anything and never sets a balance.
5. Gift card lines cannot be `order_items`, because those hang off a
   sub_order which needs a store. They need their own table linking the
   order to the cards it created. Store payables stay untouched, which is
   correct: CADO owes no partner anything for its own gift card.
6. A gift-card-only order therefore has zero sub_orders. Check what that
   breaks before writing anything — the dashboard order list, the driver
   flow, and the order confirmation screen all read sub_orders today.

**Marwan's three additions, answered 2026-08-14. Plan approved otherwise.**

7. **Cancelling voids the card.** Most of this already exists in 0014 and
   must be reused, not rewritten: `cancel_unpaid_gift_card` (refuses unless
   the card is still `pending_payment`) and `refund_gift_card` (refuses if
   `current_balance <> original_amount`, i.e. if a single dollar has been
   spent, and does the check and the cancel inside one locked statement so a
   redemption cannot sneak between them). `gift_cards.status` already has
   `cancelled`. The ONLY missing piece is knowing which cards an order
   minted — which is the new order-to-card table above. So cancelling an
   order means looking up its cards and calling the existing function for
   each. A partly-spent card will be refused, and that is correct: the money
   is already at a store. That case goes to a human, like the pool refund
   list. Never write a new voiding path.

8. **Double-tap cannot mint twice.** The risk is not two cards on one order
   — it is two ORDERS. Today's accidental protection is that place_order
   deletes the cart in the same transaction, so a second, later tap finds an
   empty cart and stops. But two SIMULTANEOUS taps both read the cart before
   either commits, and both succeed: two orders, two cards, one payment. Fix
   is a `select ... for update` on the cart lines at the very top of
   place_order — the second transaction waits, then finds nothing, then
   stops on the existing "cart is empty". Small and surgical. Prove it by
   firing two concurrent calls and confirming exactly one order and one card.

9. **Never mix a gift card with store items, enforced in the database.**
   Same shape as 0046: a trigger on the new order-to-card table rejecting an
   insert when that order already has sub_orders, and the sub_orders trigger
   extended to reject when that order already has gift cards. Symmetrical,
   so neither order of insertion can slip through. A check at the top of
   place_order too, only so the message is a sentence rather than a
   constraint name.

10. **What breaks between the migration running and the new code deploying:
    nothing, for this change** — but only because of three deliberate
    choices, each of which must hold. Every new column is nullable or
    defaulted. The new CHECK is already satisfied by every existing cart row
    (verify against the real rows BEFORE adding it). The new place_order
    argument has a default, so old calls still resolve. The old deployed
    frontend cannot create a gift-card cart line at all, so it cannot trip
    any of the new rules. The lesson from 0046 is precise and worth keeping:
    a migration is only dangerous in that window when it makes the database
    STRICTER than the deployed frontend expects. 0046 did (it started
    refusing "Now" after 9pm while the live site still offered it until
    midnight). Nothing here does.

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

## TASK B — the Aug 15 fix + redesign batch (NOT STARTED)

Marwan's six-part batch: bugs first, then Shop Now behaviour, hero images,
a SHEIN-style filter rebuild, denser product cards, and coloured tags.
His full spec is in the chat; the parts that need context from tonight:

- **1.1 bottom nav floating mid-page** — he already named the cause and he is
  almost certainly right: `PageTransition.tsx` leaves a transform on an
  ancestor, and a transform creates a containing block that breaks every
  `position: fixed` descendant. The existing comment in tailwind.config.js
  says the class is removed "the moment it finishes" — evidently not on the
  product route. Start there.
- **1.4 old branding** — the in-app splash was already deleted tonight
  (Layout.tsx). If a black flash remains it is a different asset: check
  index.html, the favicon set, and apps/mobile/assets. The persimmon icons
  are already generated by scripts/make-app-icons.mjs.
- **1.5 occasion tags** — this is the big one and it is DATA, not code. The
  catalogue has no occasion tags, which is why every chip says 72. Tagging
  means an UPDATE per product against `occasion_tags` / `recipient_tags`.
  Do NOT scatter tags to hit a number; untagged is a valid answer.
- **Part 3 images** — he has said Unsplash or Pexels only, never Pinterest or
  Google Images, and to record the source URL for each in the repo.
- **Seed products from 0054 have no photos**, so any card redesign work
  (Part 5) must look right with a missing image, not just with one.

**Context that matters for all of it: CADO IS PRE-LAUNCH.** Nobody has the
app but Marwan, delivery is not set up, and every partner store is a
placeholder to be swapped for real shops later. Demo data is expected and
correct here. Everything invented is flagged `price_is_placeholder = true`
and comes out with one query.

## TASK C — Surprise Gifts Shop is a REAL partner now

Marwan closed the deal by phone on 2026-08-15. They said CADO can use
anything from their Instagram.

- Handle: **@surprisegiftsshop** — 2,533 posts, 23K followers
- Real shop: Maarad Street, Tripoli. Phone 03 128044
- Bio: "Curated gifts & décor for every celebration"
- Highlights worth mining: **Mugs**, Gifts for her, Men gifts, Candles,
  Number Balloons, "🎂topper &candles", Gadgets

**Their photos are exactly the style Marwan has been asking for all night** —
half-open gift boxes with a printed mug, chocolates and a plush inside,
wrapped in cellophane. Unsplash does not have this; three separate searches
turned up nothing close. Theirs is the right answer.

**How to get them:** their profile renders fine in the browser pane and the
post images are readable from the DOM (`main img`, src on
instagram.f*.fbcdn.net). Scroll the grid, collect srcs, download, then upload
to Supabase Storage with scripts/seed-product-photos.mjs as the model —
product photos are storage objects, not repo files.

**Do NOT paste their photos onto the invented demo products.** Surprise is a
real shop: add them as a partner and list their real boxes, replacing the
placeholder "The Gift Atelier" stock in Gift Sets. Ask Marwan for their real
prices before inventing any.

**Check each image before attaching it.** Several stock photos tonight turned
out to be the wrong thing entirely — SALE tags, a dog at a laptop, an Indian
festival card. A filename or an alt tag is not proof of what is in the file.

### Task C — how to actually get the Surprise photos (four routes tried)

- `curl` the CDN URL → **403**. The URLs are signed to the browser session.
- `fetch()` from inside the Instagram page → **blocked**. Instagram's CSP
  refuses outbound requests to supabase.co, so uploading from that tab fails.
- Loading the CDN URL into an `<img>` on cado-web.vercel.app → **refused**.
  The CDN wants an Instagram referer.
- **Reading the already-rendered image off the page DOES work.** The canvas
  is NOT tainted: `drawImage(img)` then `toBlob` succeeds on the profile
  page. This is the route that works.

So the working method is: on the Instagram tab, canvas each `main img`
(naturalWidth > 400) to a JPEG blob, then get those bytes out. The blocker
is only transport — the upload cannot happen from that tab, and the bytes
have to reach a tab that can talk to Supabase. Options: base64 through the
session (~200 KB per image, expensive), or ask Marwan to right-click-save
into `apps/web/public/surprise/` which takes him two minutes.

Grid indexes worth taking (alt text calls hampers "laundry basket"):
0 = ready gift boxes with printed mugs (the exact style he wants),
3, 9, 15, 22, 27 = hampers, chocolate boxes, toy boxes.

## ✅ TASK D — DONE 2026-08-15. Sport is a real tab now.

Applied to production with the service-role key by
`node scripts/seed-sport-category.mjs`. Written up for the record as
`supabase/migrations/0059_sport_tab_blocks_stores_and_photos.sql`, which is
marked DO NOT RUN — it has already been applied.

What was wrong and what it is now:

- **The Sport tab rendered COMPLETELY EMPTY.** A tab's sections are rows in
  `browse_blocks` and Sport had none. It now has the same four Electronics
  has: banner_carousel, category_circles (empty, correct — Sport has no
  sub-categories), stores, product_feed.
- **`--tab-sport` was never defined** in `apps/web/src/index.css`, so the
  hero's accent computed to transparent. Added as a deep pitch green,
  `26 82 58`. **This is the ONE part not yet live** — it is a stylesheet
  change and needs a deploy. Everything else is database rows and is live now.
- **Sport had one store**, and `StoreStrip.tsx` hides itself below three.
  Added **Pace Athletics** (running/fitness, 4 items) and **Courtside Sports**
  (basketball/racket, 4 items). All three shops now have cover images;
  Baseline Sports previously had none and showed as a grey rectangle.
- **All ten Sport product photos were wrong** — deleted, rows and storage
  objects both. Seven products across the category now have a photo that was
  opened and checked; **eight are deliberately left with none** because no
  clean unbranded shot exists. Reasons per product are in
  `scripts/assets/sport/SOURCES.md`, along with every source URL and a list of
  what was rejected so nobody re-tries the same images.

Every invented price is flagged `price_is_placeholder = true`, as before.

## The Android APK — the link already exists, do NOT rebuild

Built 2026-08-14, Persimmon CADO icon, 92 MB. The link is permanent and
lives on Expo's servers:

https://expo.dev/artifacts/eas/beVupGEBdAjW-AmpALeFR6umMuNa8ztds38ECky0oZk.apk

Build page:
https://expo.dev/accounts/cado222222222222222222/projects/cadolebanon/builds/0bcdc58b-988c-47c0-8005-9d9ba1632f96

If Marwan asks for "the app link", send that URL. A rebuild takes 10-20
minutes and is only needed when the ICON, NAME, SPLASH or Android permissions
change — never for shop content. The app is a WebView wrapping
cado-web.vercel.app, so products, prices, categories and features all update
by themselves.

Past builds are also listable with `EXPO_TOKEN=... npx eas-cli build:list
--platform android`, account `marwanfattal`.

## ✅ Electronics — stocked, photographed, hero'd. 2026-08-15.

Electronics had ZERO products, no store and no sub-categories, so "photos and
a hero" meant stocking it first. Applied to production with the service-role
key by `scripts/seed-electronics.mjs`; recorded as
`supabase/migrations/0062_seed_electronics_and_hero.sql` — **already applied,
do not run it again**.

- One placeholder store, **Bright Spark Electronics**, modelled on how 0054
  made Baseline Sports.
- Eight giftable products. **Every price is invented** and flagged
  `price_is_placeholder = true`.
- **Six photos, from Unsplash, every one opened and looked at** — and the
  finalists fetched again zoomed in on the product, which is how a JBL emboss
  on an ear cup got caught. Sources in `scripts/assets/electronics/SOURCES.md`.
- **Two listings have NO photo on purpose**: Instant Print Camera (every free
  instant-camera shot on Unsplash is a branded Instax or Polaroid with the
  wordmark readable) and Digital Photo Frame (Unsplash has none at all).
- **The banner is the first `browse_banners` row in the database with its own
  `image_url`.** The JPEG lives in the `product-images` Storage bucket, not on
  a third-party host. Copy went from the honest empty state "Electronics,
  coming soon" to "Unboxed tonight" / "Ordered this morning, plugged in by
  dinner." / SHOP NOW.

Two things still read as empty on that tab, both correctly: the **Stores**
strip (StoreStrip has `MIN_ITEMS = 3` and Electronics has one shop — it will
appear on its own when a third real partner arrives) and **Shop by category**
(Electronics has no sub-categories). Neither was faked to fill the space.

Useful pattern learned here, worth reusing: `plus.unsplash.com/premium_photo-…`
results are **Unsplash+ paid licence**, not free. They 404 when downloaded
server-side, which is a handy accident, but they should be filtered out on
licence grounds — match only `images.unsplash.com/photo-…`.

## V3 category tabs — nine designed worlds (Aug 18, 2026)

Every category tab is now its own shop with its own palette, hero, tile
shape, card style, section rhythm, and signature motif. All of it lives in
two files:

- `apps/web/src/components/shop/ThemedTab.tsx` — the nine recipes, keyed by
  TAB slug (note: `home` = Gift Sets, `jewelry`, `flowers`; tab slugs are not
  category slugs). Exports `THEMED_TAB_SLUGS`.
- `apps/web/src/components/shop/TabMotifs.tsx` — per-tab divider/decoration
  SVGs (gold rule, leaf, drizzle, confetti, ribbon, dot grid, diagonals).

`TabPanel.tsx` routes `!primary && THEMED_TAB_SLUGS.has(tab.slug)` to
ThemedTab; the **All tab and the Shoes tab keep the old block pipeline**
(Shoes wasn't in the nine — falling into a bare feed would be a regression).
Every photo on the themed tabs is a real product/store photo pulled by pool
(newest / deals / under-$50 / cheapest per category); "best sellers" sections
only render when the signals RPC shows real orders. Toys has no age tags in
the data — its chips are the real subcategories instead.

**Deploy path changed (important):** the Vercel token was revoked, and the
CLI is now logged in as fattalmarwan33-alt. Remote builds FAIL on this repo
(`workspace:*` needs pnpm; Vercel runs npm) and local `vercel build` FAILS
too (project env vars are Sensitive, unreadable locally). The working recipe,
from `apps/web`:
1. `npx vite build` (env from `apps/web/.env`)
2. copy `dist` → `.vercel/output/static`, write `.vercel/output/config.json`
   with the SPA fallback route
3. `npx vercel deploy --prebuilt --prod --yes`
`vercel link --yes` earlier clobbered `.env.local` (now just an OIDC token —
the real vars live in `.env`) and auto-created a junk Vercel project named
`web` that can be deleted from the dashboard.

## Revert & polish round (Aug 19, 2026)

**Six tabs reverted, three kept.** `THEMED_TAB_SLUGS` in `ThemedTab.tsx` is
now `{perfumes, toys, sport}`. Everything else — Fashion, Jewelry, Flowers,
Chocolate, Gift Sets, Electronics, Shoes — renders the original block
pipeline in `TabPanel.tsx`, which was never deleted, so reverting was
removing slugs from that set rather than rebuilding old screens by hand.
NOTE: Shoes was never part of the nine V3 tabs; it has always been on the
block layout, so "keep Shoes" and "revert" mean the same thing for it.

**Sport rebuilt** (kept as a designed tab, redesigned in full): clipped
diagonal hero instead of the rotated bar that hung off the page, a kit row of
three real products with real prices, tiles built from label-matching pools
with a used-photo set so no two tiles wear the same picture (and a tile with
no honest photo is dropped, never backfilled), uniform product rails, and
`SportHead` section headers. "Fan favorites" still hides until sport has real
orders.

**Uniform carousels.** `components/ProductRail.tsx` is now THE horizontal
product row: fixed 152px cards, `uniform` ProductCard, 12px gap, page-margin
lead-in. `ProductCard` gained a `uniform` prop — square photo + fixed 92px
text box + one chip — which is what makes rails and the favorites grid line
up; the free-height card is still the default for the masonry feed. Every
`--row-gap` on Home is 12px.

**Stores of the Week** (`useStoresOfWeek`) replaces the single-store block:
same ISO-week rotation and same admin pin from `homepage_config`, but it
returns up to three in-stock featured stores. `useStoreOfWeek` is still
exported and now unused by Home.

**Shop by budget** amounts are Inter, not Fraunces — the display serif's
numerals read as novelty at that size. Section titles keep Fraunces.

**Favorites** uses the uniform card in a 2-col `items-start` grid, so every
card is exactly 158x250 at 375px.

## One layout for all nine category tabs (Aug 24, 2026)

The per-tab designed worlds are gone for good: `ThemedTab.tsx` and
`TabMotifs.tsx` are DELETED and every category tab renders the same block
pipeline in `TabPanel.tsx`. Put any two tabs side by side and the skeleton is
identical; only content differs.

Order, every tab: hero carousel (3 slides) · entry tiles · Shop by category ·
**store circles** · Super Deals · New Arrivals · Top of {Category} ·
**More stores** · the full grid.

**Stores moved.** They used to sit eight cards deep inside the product grid.
`blocks/TabStores.tsx` now provides `TabStoreCircles` (round logos, directly
under Shop by category) and `TabStoreBanners` ("More stores", before the grid
starts). `StoreStrip` is no longer rendered on category tabs.

**Price tiles are per-tab, computed from real prices** (`scripts/unify-category-tabs.mjs`):
fashion/jewelry/flowers/perfumes/shoes/electronics $100, chocolate/toys $75,
gift-sets/sport $50. They are in-tab `{"max_price":N}` filters now, not
gift-finder links, so the tile narrows the grid you are already on. The
thresholds are high because the catalogue is small — 7–15 products per
category — and the rule was "must land on a well-stocked grid".

**Shop by category was empty on three tabs.** Shoes, Electronics and Sport
had the block but no circles; they now have circles for the subcategories
that actually hold stock (Sneakers/Boots/Heels & Sandals, Audio/Gadgets/
Cameras & Photo, Football/Training/Racket Sports).

**Photos** (`scripts/wire-tab-photos.mjs`, files in `apps/web/public/tiles`
and `public/heroes`, ids in `public/tiles/SOURCES.txt`): new hero photos for
Fashion, Chocolate, Gift Sets and Sport; new tile photos for Fashion (5),
Jewelry (4), Chocolate (2), Gift Sets (2), Sport (1). Every one was opened
and looked at; anything with a visible brand mark was rejected — that ruled
out most chocolate-gift-box and football-boot results (Dior, "Le Noir",
HOSG, HEAD, Adidas/Nike boots, BATCH/Nivea hampers). The Fashion hero's
"Leather Weekend Bag" is un-featured: Fashion shows clothing only.
Bright Spark Electronics had no cover image at all, which is why Electronics
only had two hero slides; it has one now.

## Dashboard V2, third slice (Sep 1, 2026)

Branch `dashboard-v2`. The dashboard is an operations back-office at
cado-dashboard.vercel.app; `apps/dashboard/PLAN-V2.md` holds the recon of what
0031–0033 already delivered and the names the live schema actually uses
(the store role is **`partner`**, not the spec's `store_owner`;
gift wrap is **`offers_gift_wrap`**).

**0068 shipped tables that nothing rendered.** This slice built the screens for
them: `/admin/support` (tickets + review moderation), `/admin/delivery`,
`/admin/stores/[id]`, `/store/profile`, `/store/reviews`, and payout details +
pause on `/store/account`. Nav in `AppShell.tsx` lists only pages that exist —
a dead nav link is a 404 with a friendly name.

**Four migrations written, NONE APPLIED.** They need a Supabase management
token; there is no apply script in the repo any more, it was written ad hoc and
deleted with the token. Until they run, the code paths they back are inert:

- `0069_delivery_fee_from_settings.sql` — place_order read a delivery fee
  hard-coded in its declarations. 0068 built `settings` + `delivery_fee_usd()`
  but never pointed the order path at them, so the Settings knob was decorative.
  Body is 0050 verbatim with ONE line changed; diff it against 0050 lines 34-234.
- `0070_paused_stores_hide_products.sql` — "Pause store" claimed to hide a store
  from the storefront. Nothing enforced it: visibility came from
  `products.is_active` alone and the storefront filters stores by `is_live`,
  never by `status`. A paused store kept selling. Now RLS, via a SECURITY
  DEFINER `partner_is_active()` — a policy's inline subquery runs under the
  CALLER's RLS, so reading partners inline would make visibility depend on who
  is looking. Measured first: all 101 active products belong to active partners,
  so it hides nothing visible today.
- `0071_store_owner_pause.sql` — lets a store pause ITSELF. 0026 pins
  `partners.status` behind a trigger (a store that sets its own status can
  self-approve out of `pending`). That lock stays; the trigger gains one escape
  hatch keyed on a transaction-local GUC that only `store_set_own_pause()` can
  open, and even then only active <-> paused. **Changes a security trigger —
  review before running.** Until applied the button fails closed.
- `0072_reviews_stores_may_only_reply.sql` — RLS has no column granularity, so
  0068's row-level `reviews_store_reply` let a partner edit `rating`, `text` and
  `status` on reviews of their own products: a store could turn one star into
  five, or bury every bad review. Trigger pins everything except `store_reply`.

**Bugs found and fixed while building:**
- `setPartnerStatus` wrote `'suspended'`, which 0068's new
  `partners_status_check` rejects — the Suspend button could never have worked.
  It is `'paused'` now, and the button says Pause.
- `NotificationBell` reused one channel name. `supabase.channel(name)` returns
  the EXISTING channel, and a subscribed channel refuses new `.on()` callbacks,
  so any remount threw an uncaught error that took the whole dashboard down with
  a client-side exception. Unique name per mount.
- `/store/layout.tsx` redirected on `status !== 'active'`, so pausing a store
  would have locked its owner out of the screen that unpauses it. Allow-list now.

**Things deliberately NOT faked:** `partners` has no `instagram` column, so the
store profile has no Instagram field. There is no image-upload helper in this
app, so logo/cover are plainly-labelled URL fields. The storefront has no
support thread, so the admin reply banner says so instead of claiming the
customer was emailed. `support_tickets` and `reviews` are genuinely empty in
production and render empty states; nothing was seeded.

### Dashboard access and two crash-class bugs (Sep 1, 2026)

**Signing in.** Admin is `fattalmarwan33@gmail.com` at
https://cado-dashboard.vercel.app/login. There is NO "forgot password" link and
the storefront has no password UI either, so a lost dashboard password today
means resetting it with the service role. Two things block the proper flow:
Resend is in sandbox (invite/reset mail only reaches the project owner), and
**the dashboard's URL is not in Supabase's redirect allow-list** — recovery
links bounce to cado-web. Add `https://cado-dashboard.vercel.app/**` under
Authentication → URL Configuration before building a reset flow, or it will
look like it works and land people on the storefront.

**Team & access (`/admin/invites`)** now creates accounts directly: a new store
with its owner login, an extra owner/staff on an existing store, or another
admin. Each shows a ONE-TIME password for the admin to pass on by phone, because
email cannot be relied on. The email-invite form is still there with a note
saying it does not deliver yet. Verified end to end in production: store created
active + live, profile linked `role=partner`/`store_role=owner`, the generated
password actually signs in; test store and login then deleted, 101 products
unchanged.

**Two bugs that made the dashboard look broken to its owner:**

- **CSP blocked Supabase Realtime.** `connect-src` listed the https origin but
  no `wss:` — CSP treats the schemes as separate sources, and the `ws: wss:`
  allowance was gated behind `isDev`. Realtime could never connect in
  production, the client retried forever, and it surfaced as "Application error:
  a client-side exception has occurred". `next.config.mjs` now names the wss
  origin explicitly. If you ever add another realtime host, it needs its own
  entry.
- **`/admin` Overview showed $0 / 0 orders / "No orders yet"** above a chart of
  that same range's orders — the third page to hit the 0020 trap (finance and
  the store detail page were the others). Its "needs attention" panel was worse:
  it read `sub_orders` directly, so it always said "Nothing waiting. All clear."
  no matter how long a store sat on an order. All of it goes through
  `admin_finance_breakdown` and `admin_orders` now.

**If a dashboard page shows a zero, suspect RLS before believing it.**

---

## Browse, filters and photo accuracy (commit `a54af11`)

**Filter state lives in the URL, on `/browse`.** There is no filter state in
component state anywhere. `lib/browseParams.ts` is the whole layer: parse,
serialize, `matches` (OR within a group, AND across groups), `sortResults`,
`optionCount`, and `browseHref(cat, patch)` which every entry point links to.
Category tabs no longer filter at all — their bottom grid is pure browse with a
single "See all" door. If you find yourself adding a filter to a tab, add it to
the URL instead.

**Two traps in this area, both cost real time:**

- **This project replaces Tailwind's spacing scale.** `tailwind.config.js` maps
  `5→24px, 6→32, 7→48, 8→64`. So `h-8` is 64px, not 32, and a control row that
  should have been 32px tall was 70. Write pixel heights (`h-[32px]`) on
  anything you are measuring. `h-9` and above are untouched and behave normally.
- **Deploy from the repo root, never from `apps/web`.** The root `vercel.json`
  carries the SPA rewrite and the CSP; `apps/web` has none, and `npm install`
  there cannot resolve `@cado/shared: workspace:*`. A deploy from `apps/web`
  builds green and serves a 404 on every route but `/`.

**Tab imagery is real product photography, not art.** Every recipient circle,
entry tile, shop-by-category circle and hero slide takes a photo from the pool
of products matching its label (`CategoryTab.tsx`, the `take()` allocator). So a
wrong-looking picture is nearly always a wrongly-filed product, and the fix is
the data. Migrations 0089 and 0090 did exactly that: kids clothing out of
Fashion's Men and Women buckets, bags/belts/scarves into Jewels & Accs, earrings
out of Necklaces and Rings, the two chocolate-free baskets into Gift Sets, and
both "Men" products into Women because both are photographed on women. Fashion
has no menswear, so the Men circle is gone until some exists.

`scripts/strip-image-overlays.mjs` finds another retailer's notice burnt into a
photo and paints it out. It flagged eight photos; seven were the product's own
dark area touching an edge. `--apply` therefore only touches paths listed in its
`CONFIRMED` set — adding one means a person opened the image and looked.

**Still needs real catalogue work:** Fashion has no menswear; "Merino Crewneck"
is a satin dress in its photograph and "Everyday Hoodie" is a woman's hoodie,
both title/photo mismatches from seeding; Chocolate is down to six products.

### Catalogue added for Fashion and Chocolate

`scripts/seed-menswear-and-chocolate.mjs` adds four menswear products (Anchor &
Oak, Cedar Street Fashion) and five chocolate products (Cocoa & Co., Sucré
Bakehouse), and re-photographs the Merino Crewneck. Fashion > Men exists again;
Chocolate is back to eleven products. Every Unsplash id is recorded next to its
product, and the six candidates rejected on sight are listed in the file header
with the reason, so nobody re-picks them. The test they failed is nearly always
the same one: baked-in text or a real brand mark in the frame.

**A correction that matters if you read migration 0090.** Its comment says the
Merino Crewneck was "a woman in a navy satin dress". That was a mix-up — the
dress is the Silk Wrap Dress. The crewneck's photo was a flat-lay of several
knits on autumn leaves: no product you could point at, and no reason in it to
call the garment womenswear. It has been re-photographed and moved back to Men.
Everyday Hoodie really is a woman in a hoodie and correctly stays in Women.

`0091` fixes four Chocolate products priced at $1, which rendered as "-98%" and
"-99%" badges on the live shelf. Two had a `compare_at_price` that was clearly
the intended price and now use it; the other two are priced against the shelf.
None was flagged `price_is_placeholder`, so nothing marked them as unfinished —
worth checking that flag is actually being set when prices are provisional.

---

## Facet chips, curated tab art, and accessories back in Fashion

**Filters are SHEIN-shaped now.** A row of dropdown chips (`For ▾`, `Price: Under $100 ▾`),
each opening a short sheet with only its own options, plus a `Filter ⛛` sheet
that stacks the same facets as accordions. `components/shop/Facets.tsx` is the
single implementation — chips and sheet share `FacetBody` and both write
`BrowseState`, so they cannot disagree; a check that they produce identical
URLs for identical selections is part of the verification. `useFacets` drops
any facet with fewer than two options that would return something, which is
what keeps Colour hidden without a hard-coded exception list.

**The title row on `/browse` is deliberately NOT sticky.** Four sticky rows
measured 152px against a 120px budget. The three control rows come to 110px.

**Tab art is curated, and the tabs must never derive it again.**
`lib/tabArt.ts` holds one image per recipient and one per tile, uploaded by
`scripts/seed-tab-art.mjs` to `product-images/art/...`. Recipient circles used
to take the first product matching the tag, which is how "For Him" on Fashion
became a girls' t-shirt and Perfume's "Dad" rendered as an empty disc — there
was nothing tagged `father` to pick. `tabArt.ts` throws at import time in dev
if a recipient or tile has no entry, so a blank slot fails on the first render
instead of shipping. Subcategory circles still come from the catalogue on
purpose: a "Rings" circle showing a ring from Rings is showing the labelled
thing by construction.

**Bags, belts and scarves are Fashion, not Jewelry** (0092, reversing part of
0089). Jewelry & Accessories is jewellery and watches only. `0093` reactivates
Fashion › Accessories, which 0089 had switched off when it emptied it — a
deactivated subcategory is invisible in circles and in the Category facet even
when it holds products, which is worth remembering the next time a bucket
looks empty.

**Sizes are real product data now.** `product_variants` was always the size
mechanism; it just held twelve rows, all on [TEST] products.
`scripts/seed-sizes.mjs` sized Fashion (22), Shoes (8) and Sport (4). Sport is
four on purpose — a dumbbell has a weight and a bottle has a volume.

---

## The Fashion tab template (commit pending)

`components/shop/category/TabTemplate.tsx` is the new tab layout. `CategoryTab`
dispatches to it from a `REBUILT` set that currently holds only `fashion`;
adding a slug there is the whole migration for the next tab.

**The page is short on purpose.** The recipient circles, the shop-by-category
circles, the occasion block and the Super deals / New arrivals carousels are
gone — every one of them was a filter in a different costume, and they are now
the facet bar. What is left is hero → AI line → stores → four tiles → one grid.

**Filtering never navigates.** State lives in the tab route's own query string
and the grid re-renders in place. `?tab=fashion&for=her&cat=women&size=m`.
`browseParams.ts` maps state fields to param names in one place (`PARAM`):
`state.cat`→`tab`, `state.type`→`cat`, `state.tile`→`view`. Home deletes
`FILTER_PARAM_NAMES` when the tab changes, because `cat=women` means nothing on
Chocolate.

**Two image bugs, both found here, both fixed in shared components.**

- `loading="lazy"` DOES NOT WORK inside the tab panels. Measured: tile and
  product images were never requested at all — no resource entry — even after
  scrolling them into view, and an IntersectionObserver of our own did not fire
  either. The panels are nested scrollers with `-webkit-overflow-scrolling:
  touch`. `Img` is now `loading="eager"` always. If a tab ever carries hundreds
  of cards the answer is a virtualised grid, not a lazy attribute that does not
  fire.
- `onLoad` and `complete` both miss. On /stores/fashion five photos had
  `naturalWidth === 900` while `complete` stayed false and no load event
  arrived, so `.blur-up` held them at `opacity: 0` over perfectly good
  pictures. `Img` polls `naturalWidth` instead.
- `ProductCard` had its own `<img loading="lazy">` with an onLoad-only reveal —
  both bugs, second copy. It uses `Img` now.

**`npx tsc -p tsconfig.json` CHECKS NOTHING.** That file is a solution stub with
`"files": []`. Use `npx tsc -b`, which is what `npm run build` runs.

---

## Flowers tab, and one filter engine for real

`components/shop/category/FilterableGrid.tsx` now holds `useTabFilters` and
`FilterGridSection`. Fashion (via `TabTemplate`) and Flowers (via the legacy
`CategoryTab`, gated by the `FILTERED_GRID` set) both mount it. TabTemplate had
its own copy until Flowers needed the same thing — that copy is gone.

**Two slug bugs the shared hook fixed, both invisible on Fashion.**
The pager owns `?tab=`, and it wants the TAB slug. Four tabs have a tab slug
that differs from their category slug — flowers/flowers-gifts,
jewelry/jewelry-accessories, home/gift-sets. Fashion's are the same word, so:

1. `serializeBrowse` wrote the CATEGORY into `tab`, producing
   `?tab=flowers-gifts` — a tab that does not exist. `push` now overwrites it
   with the tab slug.
2. `parseBrowse` reads the category back OUT of `tab`, so it then parsed
   `cat: "flowers"`, nothing matched `FACETS_BY_CATEGORY`, and the chip row
   fell back to its two-item default. `state.cat` is now forced from the panel.

**Facet chips are decided by the category, not the selection.** Counted against
the live selection the row emptied itself: one filter on a six-product category
dropped five of seven chips, so the control you had just used vanished. Options
inside a sheet still respond to the selection and still grey at zero.

**Flower type lives in `products.tags` as `flower:roses`** — an existing text[],
no new column. Colour uses the existing `products.color`. Only what a product's
own title or description states: 6 of 6 flower types, 4 of 6 colours, and the
two that say nothing about colour are now null rather than a guess.

### Flowers, round two: entry points filter in place

Every control on the Flowers tab — hero SHOP NOW, the recipient circles, the
Shop-by-category circles, the occasion chips and the tiles — now narrows the
grid at the bottom and scrolls to it instead of navigating to /browse. They all
call one `apply()` in `CategoryTab`, which MERGES into the current selection, so
Birthday then Roses leaves you holding both. `FilterEntry` in CategorySections
renders a Link or a button depending on whether the tab passes `apply`.

**The blur-up opacity is inline now, and that was a real bug.** Measured on
Flowers: thirty images with `data-loaded="true"`, `naturalWidth === 900`,
matching `.blur-up[data-loaded="true"]` — and a computed opacity of 0. A probe
element with the identical class and attribute computed to 1 in the same
document, so the cascade was correct and those elements' style was stale: the
attribute flip never triggered a recalc inside the pager's panels. `Img` writes
`style={{opacity}}` from React state; blur and scale stay in CSS where a frame
of lag is free. If you ever see "the image is downloaded but invisible" again,
this is the third distinct cause and inline style is the answer.
