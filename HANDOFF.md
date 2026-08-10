# CADO — full handoff

Paste this into a new Claude Code session. It contains everything needed to pick up the project.

**No passwords or keys are in this document, deliberately.** Anything secret is named, with where it lives and how to get it — see "Credentials" at the bottom. Never paste a live key into a chat or a repo; ask Marwan for it when you actually need it, and he revokes it after.

---

## 1. What CADO is

A Lebanese gift marketplace. Same-day delivery from real local boutiques — flowers, jewellery, chocolate, fashion, beauty, kids. Think "the Amazon of gifts, for Lebanon". Marwan is the founder; he is **not a developer**, so explain things in plain language and never hand him a task that assumes engineering knowledge.

The product's core insight, which drives most design decisions: **you are usually buying for someone else, and you often don't know their address.** So checkout is gift-first and can ask the recipient for their address over WhatsApp instead of demanding the buyer know it.

**Repo:** `C:\Users\Marwan\cado-app` — GitHub `marwanfattal2010-sketch/cado`
**Live storefront:** deployed on Vercel
**Backend:** Supabase project ref `tzuntmerjhegkzsbfmnf`

---

## 2. Stack — get this right, a lot of instructions assume wrong

| App | What it is | Notes |
|---|---|---|
| `apps/web` | **Vite + React + React Router** | **NOT Next.js.** No server components, no API routes, no server actions, no `next/image`, no middleware. |
| `apps/dashboard` | **Next.js App Router** | This one *is* Next.js. Admin + store-owner. Incomplete — see §6. |
| `apps/mobile` | Expo / React Native | WebView wrapper around the site. Builds via EAS. |
| `apps/admin` | legacy | Superseded by `apps/dashboard`. |
| `packages/shared` | Shared types | Includes generated `database.types.ts`. |

**The single most important architectural fact:** the storefront client talks to **Supabase PostgREST directly**. There is no API layer. That means:

- **RLS is the only authorization boundary.** If a policy is wrong, the data is public.
- `SECURITY DEFINER` Postgres functions are the only server-side logic.
- "Validate with Zod in the API route" is meaningless here — validation must be **inside the Postgres function**, because anyone can call the database API directly with their own token.
- Security headers live in `vercel.json`, not `next.config.js`.

---

## 3. Money — the rules that must never be broken

All money logic lives in `SECURITY DEFINER` Postgres functions: `place_order`, `purchase_gift_card`, `check_gift_card_balance`, `reconcile_gift_cards`, `admin_money_summary`.

- **Never trust a price, total, quantity or discount from the client.** Always recalculate server-side from the `products` table. The checkout page computes a total for *display only*; `place_order` ignores it.
- `order_items` stores **snapshots** (`product_title_snapshot`, `unit_price_snapshot`). Never compute historical revenue from live prices — prices change.
- Delivery fee is **$5**, set inside `place_order`.
- Gift card redemption locks the row (`SELECT ... FOR UPDATE`) inside the transaction so it can't be double-spent.
- Stock decrements in the same transaction as order creation, with a `stock_quantity >= 0` constraint. Overselling is impossible; the loser's whole transaction rolls back.
- **`place_order` currently takes 12 parameters.** Don't change the signature casually — the web client calls it by name.

---

## 4. Database

Migrations in `supabase/migrations/`, numbered sequentially. **Additive only — never edit an applied migration, never DROP or ALTER a column the storefront uses.**

The Supabase CLI is **not logged in**. Migrations are applied through the **Management API**: `POST https://api.supabase.com/v1/projects/tzuntmerjhegkzsbfmnf/database/query` with a Bearer token. A working script exists at `scratchpad/apply-migration.mjs` (reads `MGMT_TOKEN` from env). HTTP 201 = applied. **Always verify against `information_schema` / `pg_policies` afterwards — 201 does not mean correct.**

**Applied through 0033.** Key ones:

- `0020` — fixed an RLS leak where the admin account could read **every** customer's orders, and an `order_items` INSERT policy of `with check (is_admin() or true)` which was always true.
- `0021` — gift cards: PIN removed entirely, one 12-char `DDDD-DDDD-DDDD` code, ambiguity-free alphabet.
- `0024` — gift checkout. `delivery_address_id` became **nullable** (you don't always know the address), guarded by a CHECK that an order must still be deliverable: either an address, or a phone to go and ask for one.
- `0025` — `occasion_reminders` (saved birthdays). **Note:** a separate `occasions` table already existed as a *catalog of occasion types* for tagging products — these are different things, don't conflate them.
- `0026` — **privilege escalation fix.** See §5.
- `0027` — rate limiting on checkout and gift-card purchase (5 orders/min per account).
- `0029` — OMT payment method: the function accepted it but the table CHECK didn't, so OMT orders failed.
- `0031`–`0033` — dashboard schema/RLS/functions, written by an agent that was cut off. **Unverified. Check whether they were actually applied before trusting them.**

### Naming trap — the dashboard spec doesn't match reality

A spec was written using table names that don't exist. **Map, don't create:**

| Spec says | Reality |
|---|---|
| `stores` | **`partners`** |
| `profiles.store_id` | **`profiles.partner_id`** |
| `products.name` | **`products.title`** |
| `payouts` | **`store_payables`** |
| `order_items.store_id` | via `order_items.sub_order_id → sub_orders.partner_id` |

Creating the spec's tables verbatim would fork live data and break the storefront.

---

## 5. Security — state of play

A hardening pass ran; migrations 0026–0030 are **applied to production**.

**The one that mattered:** `profiles`' UPDATE policy pinned `role` but **not `partner_id`**. Partner IDs are public. So any logged-in customer could `PATCH` their own profile to claim any store, and then — via existing partner policies — rewrite that store's prices, move other people's orders through delivery statuses, and **set their own `commission_rate` to 0**, meaning CADO silently earned nothing on that store. Fixed in `0026` with BEFORE UPDATE triggers (a trigger can compare OLD to NEW; a `WITH CHECK` cannot).

**This was tested against production, as a real logged-in customer, and all four attacks were blocked:**

| Attack | Result |
|---|---|
| Grant self `partner_id` | blocked — `partner_id cannot be changed` |
| Promote self to admin | blocked — `role cannot be changed` |
| Zero a store's commission | blocked — 0 rows (RLS filtered it) |
| Steal a store's slug | blocked — 0 rows |

**Known open, be honest about these:**

- **Session tokens are in `localStorage`**, not httpOnly cookies. Supabase's JS client does this and a static SPA has no server to set a cookie from. Any XSS reads the session. Mitigations in place: strict CSP (`script-src 'self'`), no `dangerouslySetInnerHTML` anywhere, 1h token TTL. The dashboard, being Next.js, **does** use httpOnly cookies via `@supabase/ssr`.
- **Gift card codes in `sessionStorage`** to carry from redeem → checkout. Same exposure class.
- `place_order` has **no length bound on `p_gift_card_code`** and **doesn't check `products.is_active`**, so a deactivated product left in a cart can still be ordered.
- Supabase Auth rate limits and `minimum_password_length` are **dashboard settings nobody has verified**. `supabase/config.toml` is local CLI config and is *not* authoritative.
- Backup retention unverified. A backup nobody has restored is not a backup.
- Login/signup/password-reset **cannot** be rate limited in Postgres — they never reach it. That's Supabase Auth's own setting.

---

## 6. Where the work actually stands

### Storefront — PROMPTS 1–10 (a full redesign)
1–9 **done**. Design tokens in `apps/web/src/index.css`; component library in `apps/web/src/components/ui/` (`Button`, `Chip`, `Sheet`, `Toast`, `Ribbon`). Legacy classes (`bg-white`, `ring-ink/10`, `text-sm`) are the old system — replace on sight with `bg-surface`, `border-line`, `text-body`, `shadow-rest`.

PROMPT 10 **partly done**: Category and Search pages rebuilt (instant chip filters, counts computed with other filters applied, progressive reveal, partial-word search). **Still outstanding: four gift-card fixes (the "4.10" spec text was only ever in chat — ask Marwan for it), a copy pass, and a 375px ship checklist.**

### Dashboard — Stage 1 **incomplete**
App skeleton, login/invite/set-password, admin + store shells exist. **The cross-store isolation test has never been run.** Until a store owner is *proven* unable to read another store's products, orders and payouts, this must not go near real store accounts. Build in stages, stopping after each.

### Mobile
An APK rebuild is pending to pick up two native fixes: **keyboard `adjustResize`** (the Android keyboard covered the email field on the gift-card page) and **splash spinner removal**. Build with `EXPO_TOKEN=... npx eas-cli build --platform android --profile preview --non-interactive` from `apps/mobile`. Verify both fixes are actually in the source first, and check the WebView points at the live site and not localhost.

### Known broken / not built
- **Email doesn't send.** Gift cards can't reach their recipient. Resend needs a verified domain.
- **No payment processor.** No webhooks, so nothing to verify signatures on. Gift cards are born `pending_payment` and inert until an admin confirms. COD is the real payment path.
- **Card payment isn't live** — checkout says so plainly rather than pretending.
- **Occasion reminders save but never send** — no scheduler, no WhatsApp sender. The page says so on screen.
- **Google OAuth** unfinished — blocked on a Google Cloud billing prompt.
- **Guest checkout not built.** `place_order` requires a login. Removing the wall needs order-lookup tokens + RLS rework on the money path.

---

## 7. Branches

Everything is linear on **`prompt-10-storefront`** (pushed to GitHub). `master` is behind at `f20f89d` — a force-move was blocked, so do a normal fast-forward merge at deploy time. Other branches (`security-hardening-tier1`, `security-verify-2`, `dashboard-stage-1`) are older snapshots of the same line.

**Nothing has been deployed since `8e1aab3`.** Marwan's explicit choice was to deploy once at the end.

---

## 8. How Marwan works — read this, it matters most

- **He is not technical.** No jargon. "The page that shows the gift", not "the Product route component".
- **Verify before claiming done.** He has been burned by being told something works when it didn't. Open the page, run the query, place the order. If you can't verify, say "unverified, because X" — that is a good answer.
- **Never fake data to make a screen look finished.** No invented reviews, no "3 people are viewing this", no fake countdowns, no fake Instagram feed, no invented partner counts. If the data isn't there, say the screen isn't ready. He has explicitly rejected work for looking fake.
- **"Arrives today" only when `same_day && stock_quantity > 0`.**
- He says "do everything" a lot. It means keep going without checking in — **not** that risky, irreversible actions are pre-approved.
- He often works from his phone and leaves the laptop running. Long autonomous stretches are expected.
- **Trademark boundary:** don't imitate real brands.

### Traps that have bitten this codebase more than once
- **A CSS `transform` makes an element the containing block for `position: fixed` descendants.** A page-transition animation left one behind and silently broke *every* sticky bottom bar, including checkout's. `PageTransition.tsx` strips the class after animating for exactly this reason. If you add animation, measure `getBoundingClientRect().top` before and after a scroll and prove the bar didn't move.
- **Tailwind config changes don't hot-reload** — restart the dev server or you'll "verify" the old value.
- The repo uses **CRLF**; regex patches written for LF match nothing.
- Budget bands share edges — every price filter must go through `inBudgetRange()` in `lib/filters.ts` (upper bound exclusive). An inclusive test put $50 gifts in two bands at once.
- Never build a raw PostgREST `.or()` string from user input — sanitise commas, parens, `*`.
- Screenshots time out in this environment. Use page text / DOM assertions instead. Lazy images never fire their observer headless — that's a harness artifact, not a bug.

---

## 9. Credentials — how to get them, not what they are

**Nothing secret is written down here on purpose.** Ask Marwan when you need one; he generates it, you use it, he revokes it.

| What | Where it lives | How to get it |
|---|---|---|
| Supabase URL + **anon** key | `apps/web/.env` (gitignored) | Already on disk. Public by design — it ships in the browser. |
| Supabase **service role** key | Supabase dashboard → Project Settings → API | Ask. **Server-side only. Never in client code, never in a `VITE_*` var, never committed.** |
| Supabase **management** token | supabase.com/dashboard/account/tokens | Ask. Expires in 30 days. Needed to apply migrations. |
| Expo token | expo.dev/settings/access-tokens | Ask. Needed for APK builds. |
| Vercel | Vercel CLI has built-in auth | Try `vercel` first before asking for a token. |
| WhatsApp (Twilio / Meta) | not set up yet | Doesn't exist. Notifications stub to `console.log`. |

`.env*` is gitignored and **no secret has ever been committed** — history was scanned across all 66 commits. If one ever is, **rotate it**; deleting the file doesn't remove it from history.

---

## 10. If you do nothing else

1. **Run the dashboard's cross-store isolation test** before that app touches a real store account.
2. **Don't deploy** without checking with Marwan — a lot is committed and unshipped.
3. **Ask about the gift-card "4.10" fixes** — that spec exists only in an old chat.
4. When something is broken, **say so plainly**. He'd far rather hear "email doesn't work yet" than discover it from a customer.
