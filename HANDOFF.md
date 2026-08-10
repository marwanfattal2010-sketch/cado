# CADO — complete handoff

**Paste this whole document into a new Claude Code session.** It contains everything needed to continue the project cold, with no prior conversation.

**No passwords, keys or tokens are in here — deliberately.** Every credential is named, with where it lives and how to obtain it, in §12. Never paste a live key into a chat window or commit one to the repo. Ask Marwan for the specific one you need, use it, and he revokes it after.

---

## 1. Who you're working with

**Marwan Fattal.** Founder of CADO. **He is not a developer.** Explain things in plain language — "the page that shows the gift", not "the Product route component". Never hand him a task that assumes engineering knowledge.

How he works, and it matters more than any technical detail below:

- **Verify before claiming something is done.** He has repeatedly been told things worked when they didn't. Open the page, run the query, place the actual order. If you genuinely can't verify, say **"unverified, because X"** — that is a good and welcome answer.
- **Never fake anything to make a screen look finished.** No invented reviews, no "3 people are viewing this", no fake countdown timers, no fake Instagram feed, no made-up partner or customer counts. If the data isn't there, say the screen isn't ready. He has explicitly rejected work for looking fake — his words were *"thats soo ugly"* and *"no i dont like this one"* about auto-picked stock photos.
- **He says "do everything" a lot.** It means keep going without checking in. It does **not** mean risky or irreversible actions are pre-approved.
- He often works from his phone and leaves the laptop running for long autonomous stretches.
- He'll ask for something in one message and change it two messages later — that's normal, follow the latest.
- **Trademark boundary:** never imitate real brands.
- Time zone **Asia/Beirut**. The machine clock is roughly 3 hours behind actual Beirut time — don't trust `date` for scheduling.

---

## 2. What CADO is

A Lebanese gift marketplace. Same-day delivery from real local boutiques — flowers, jewellery, chocolate, fashion, beauty, kids, perfume. Think "the Amazon of gifts, for Lebanon."

**The insight that drives most design decisions: you're buying for someone else, and you usually don't know their address.** So checkout is gift-first, and it can ask the recipient for their address over WhatsApp rather than demanding the buyer know it. That single idea explains the schema, the checkout flow, and the Occasions feature.

| | |
|---|---|
| Repo | `C:\Users\Marwan\cado-app` |
| GitHub | `github.com/marwanfattal2010-sketch/cado` |
| Live site | `https://cado-web.vercel.app` (Vercel) |
| Supabase project | ref `tzuntmerjhegkzsbfmnf` → `https://tzuntmerjhegkzsbfmnf.supabase.co` |
| Supabase dashboard | `https://supabase.com/dashboard/project/tzuntmerjhegkzsbfmnf` |

---

## 3. Stack — a lot of instructions assume this wrong

| App | What it actually is |
|---|---|
| `apps/web` | **Vite + React + React Router.** **NOT Next.js.** No server components, no API routes, no server actions, no `next/image`, no middleware. |
| `apps/dashboard` | **Next.js App Router.** This one *is* Next.js. Admin + store-owner. **Incomplete** — see §8. |
| `apps/mobile` | **Expo / React Native.** A WebView wrapper around the site. Builds via EAS. |
| `apps/admin` | Legacy, superseded by `apps/dashboard`. |
| `packages/shared` | Shared types, including generated `database.types.ts`. |

Monorepo uses **pnpm workspaces**.

### The single most important architectural fact

The storefront client talks to **Supabase PostgREST directly**. There is no API layer. Therefore:

- **RLS is the only authorization boundary.** A wrong policy means public data.
- `SECURITY DEFINER` Postgres functions are the only server-side logic that exists.
- "Validate with Zod in the API route" is **meaningless here** — validation must live *inside the Postgres function*, because anyone can call the database API directly with their own token.
- Security headers live in `vercel.json`, not `next.config.js`.

---

## 4. Money — rules that must never be broken

Money logic lives in `SECURITY DEFINER` functions: `place_order`, `purchase_gift_card`, `check_gift_card_balance`, `reconcile_gift_cards`, `admin_money_summary`.

- **Never trust a price, total, quantity or discount from the client.** Always recalculate server-side from `products`. The checkout page computes a total for *display only*; `place_order` ignores it entirely.
- `order_items` stores **snapshots** (`product_title_snapshot`, `unit_price_snapshot`, commission rate). Never compute historical revenue from live prices — prices change.
- Delivery fee is **$5**, set inside `place_order`.
- Commission default **15%**, stored per partner, snapshotted onto the line item at order time.
- Gift card redemption locks the row (`SELECT … FOR UPDATE`) inside the transaction so it can't be double-spent.
- Stock decrements in the same transaction as order creation with a `stock_quantity >= 0` constraint. Overselling is impossible — the loser's transaction rolls back. (The customer currently sees a raw Postgres error; friendlier messaging is an open nicety.)
- **`place_order` takes 12 parameters.** Don't change the signature casually — the web client calls it by name, and a mismatch 404s with `PGRST202` while looking like it works.

---

## 5. Database

Migrations in `supabase/migrations/`, numbered sequentially. **Additive only — never edit an applied migration, never DROP or ALTER a column the storefront uses.**

The Supabase CLI is **not logged in**. Migrations go through the **Management API**:
`POST https://api.supabase.com/v1/projects/tzuntmerjhegkzsbfmnf/database/query` with a Bearer token.
A working script exists at `scratchpad/apply-migration.mjs` (reads `MGMT_TOKEN` from env, prints HTTP status then JSON). **201 = applied. Always verify against `information_schema` / `pg_policies` afterwards — 201 does not mean correct.**

**Applied through 0040.** The ones that matter:

- **0020** — fixed an RLS leak where the admin account could read **every** customer's order, plus an `order_items` INSERT policy of `with check (is_admin() or true)` which was always true.
- **0021** — gift cards: PIN removed entirely, one 12-char `DDDD-DDDD-DDDD` code from an ambiguity-free alphabet (no 0/O/1/I/L).
- **0024** — gift checkout. `delivery_address_id` became **nullable**, guarded by a CHECK that an order must still be deliverable: an address, *or* a phone number to go ask for one.
- **0025** — `occasion_reminders` (saved birthdays). **Careful:** a separate `occasions` table already existed as a *catalog of occasion types* for tagging products. Different things. Don't conflate them.
- **0026** — privilege escalation fix, see §7.
- **0027** — rate limiting on checkout and gift-card purchase (5 orders/min per account, IP at 6× looser because carrier NAT in Lebanon puts many real customers behind one address).
- **0028** — missing indexes, notably `order_items.sub_order_id`.
- **0029** — OMT payment: the function accepted it but the table CHECK didn't, so OMT orders failed at the last step.
- **0030** — audit triggers on partner/profile/product/payable changes.
- **0031–0033** — dashboard schema/RLS/functions. Written by an agent that was interrupted. **Verify before trusting.**
- **0040** — blocks ordering a product a store has withdrawn (`is_active = false`) out of a stale cart. Applied and proven.
- **0041** — written but **NOT applied**, awaiting approval: bounds `p_gift_card_code` length. Needs a body edit to `place_order`, which is why it wasn't auto-applied. Low severity.

### Naming trap — the dashboard spec doesn't match reality

A spec was written using table names that don't exist. **Map onto what's there; do not create the spec's tables** — that would fork live data and break the storefront.

| Spec says | Reality |
|---|---|
| `stores` | **`partners`** |
| `profiles.store_id` | **`profiles.partner_id`** |
| `products.name` | **`products.title`** |
| `payouts` | **`store_payables`** |
| `order_items.store_id` | via `order_items.sub_order_id → sub_orders.partner_id` |

---

## 6. Current data

Roughly 47 products, 18 partners, a handful of real orders. **The products and stores are seed/placeholder data** — realistic names like "Beirut Blooms" and "Cedar Street Fashion" so screens render properly. When real stores sign up they get added alongside, then the fakes get deleted in one pass. Marwan has been told this and expects it.

**Two leftover test accounts exist in production auth** from an old session: `diag-1785888333415-buyer@example.com` and `diag-1785888335023-a@example.com`. Safe to delete.

---

## 7. Security — current state, verified against production

A full hardening pass ran. Migrations 0026–0030 and 0040 are **applied to production**.

**The one that mattered:** `profiles`' UPDATE policy pinned `role` but **not `partner_id`**. Partner IDs are public. So any logged-in customer could PATCH their own profile to claim any store, then — through existing partner policies — rewrite that store's prices, move other people's orders through delivery statuses, and **set their own `commission_rate` to 0**, meaning CADO silently earned nothing on that store forever. Fixed in `0026` with BEFORE UPDATE triggers (a trigger can compare OLD to NEW; a `WITH CHECK` cannot, which is exactly why the original looked correct while missing a column).

**Tested against production as a real logged-in customer. All four attacks blocked:**

| Attack | Result |
|---|---|
| Grant self `partner_id` | `partner_id cannot be changed` (P0001) |
| Promote self to admin | `role cannot be changed` (P0001) |
| Zero a store's commission | HTTP 200, `[]` — zero rows, RLS filtered it out |
| Steal a store's slug/status | HTTP 200, `[]` — zero rows |

Also verified live: RLS enabled on all 29 tables; all 30 `SECURITY DEFINER` functions pin `search_path`; no always-true write policies anywhere; `gift_cards`, `gift_card_transactions` and `audit_log` unreachable from any browser session; a normal order still completes in ~330ms under the rate limiter with correct money (`CADO-1029`: $65 + $5 = $70, commission $9.75, net $55.25).

### Open and needing Marwan, not code

**1. NO BACKUPS. Highest-consequence item in the project.** Verified directly:
```
"pitr_enabled": false,  "backups": []
```
No point-in-time recovery, zero backups listed. **Right now a mistake is unrecoverable.** This is a Supabase plan/settings issue.

**2. Auth settings, all dashboard toggles:**

| Setting | Current | Should be |
|---|---|---|
| `password_min_length` | 6 | 10+ |
| `password_hibp_enabled` (breach check) | false | true |
| `security_captcha_enabled` | false | true |
| `sessions_timebox` / inactivity | **0 / 0 (never expire)** | set a limit |
| `security_update_password_require_current_password` | **false** | true |
| `mfa_totp_enroll_enabled` | false | true for admins |
| `mailer_autoconfirm` | true | consider off |

Two of those compound badly: **sessions never expire, and a password can be changed without knowing the current one** — so one stolen token becomes permanent account takeover. And auto-confirmed signup with no captcha means the per-account rate limits are cheap to sidestep by registering more accounts.

### Known open, technical

- **Session tokens live in `localStorage`**, not httpOnly cookies. Supabase's JS client defaults there and a static SPA has no server to set a cookie from. Mitigations in place: strict CSP (`script-src 'self'`), no `dangerouslySetInnerHTML` anywhere in the codebase, 1h token TTL. The dashboard, being Next.js, **does** use httpOnly cookies via `@supabase/ssr`.
- **Gift card codes in `sessionStorage`** to carry from redeem → checkout. Same exposure class. Checkout does clear it after use.
- Gift-card **concurrency and overdraft tests have never been run** — they need the service role key.
- Login/signup/password-reset **cannot** be rate limited in Postgres; they never reach it. That's Supabase Auth's own setting.
- **Process lesson:** for ~2 minutes during the dashboard build, seven production tables existed with RLS off and full grants to `anon`. They were empty so nothing leaked. **Always put `create table` and `enable row level security` in the same migration.**

---

## 8. Where the work stands

### Storefront redesign — "PROMPTS 1–10"
**1–9 complete.** Design tokens in `apps/web/src/index.css`; component library in `apps/web/src/components/ui/` (`Button`, `Chip`, `Sheet`, `Toast`, `Ribbon`).

- Legacy classes (`bg-white`, `ring-ink/10`, `text-sm`, `text-2xl`) are the **old** system — replace on sight with `bg-surface`, `bg-canvas`, `border-line`, `text-body`, `text-h1`, `text-caption`, `shadow-rest`.
- Three radii only (`rounded-card/pill/sheet`). No new colours, no one-off buttons.
- Mobile-first at 375px, tap targets ≥44px, primary buttons 52px.
- Skeletons not spinners. Real empty states with a next action.
- `Category.tsx` and `Search.tsx` are the reference for "done": instant `Chip` filters, counts computed with the *other* filters applied, IntersectionObserver progressive reveal.

**PROMPT 10 partly done.** Done: Category page, Search page (partial-word matching, sanitised `.or()`), gift-card copy fixes. **Outstanding: the rest of the copy pass, and the 375px ship checklist.**

### Dashboard — Stage 1 **incomplete**
App skeleton, login / invite / set-password, admin and store shells exist. **The cross-store isolation test has NEVER been run.** Until a store owner is *proven* unable to read another store's products, orders and payouts, this must not go near a real store account. Build in numbered stages, stopping after each so Marwan can test.

### Mobile
APK rebuild pending, to pick up two native fixes: **keyboard `adjustResize`** (the Android keyboard covered the email field on the gift-card page) and **splash spinner removal**. `expo-doctor` found real config problems that were being fixed when work stopped — fix those before burning a build slot.
Build: `cd apps/mobile && EXPO_TOKEN=… npx eas-cli build --platform android --profile preview --non-interactive` (~10–20 min, produces a `.apk`). Verify both fixes are actually in the source first, and that the WebView points at the live site and not localhost.

### Known broken / not built
- **Email doesn't send.** Gift cards can't reach their recipient. Resend needs a verified domain.
- **No payment processor.** No webhooks, so nothing to verify signatures on. Gift cards are born `pending_payment` and inert until an admin confirms. COD is the real payment path (60–70% of Lebanese e-commerce).
- **Card payment isn't live** — checkout says so plainly rather than pretending.
- **Occasion reminders save but never send** — no scheduler, no WhatsApp sender. The page says so on screen.
- **Google OAuth** unfinished — blocked on a Google Cloud billing prompt.
- **Guest checkout not built.** `place_order` requires a login. Removing that wall needs order-lookup tokens plus RLS rework on the money path.
- **WhatsApp not set up.** No Twilio/Meta credentials. Notifications must stub to `console.log`.

---

## 9. Git state — read carefully

- Everything is linear on branch **`prompt-10-storefront`**, pushed to GitHub. **This is the real branch.**
- `master` is behind at `f20f89d` — a force-move was blocked by a safety classifier. Do a normal fast-forward merge at deploy time.
- Other branches (`security-hardening-tier1`, `security-verify-2`, `dashboard-stage-1`) are older snapshots of the same line.
- **Nothing has been deployed since `8e1aab3`.** Marwan's explicit choice was to deploy once at the end. A lot is committed and unshipped.
- **There is uncommitted work in the tree** from three agents that were stopped mid-task: `apps/web` (BottomNav, ProductCard, useProducts — verified good, one step from commit), `apps/mobile` (app.json, package.json — real expo-doctor fixes), `apps/dashboard` (package.json, seed script — **possibly broken, was mid-edit**). Check before committing.

---

## 10. Local setup that carries over (same machine, new account)

These are files on disk, so they survive an account switch:

**Subagents** — `C:\Users\Marwan\.claude\agents\`. Five defined, each pre-loaded with hard-won context so you don't re-explain it:
- `jad`, `ramzi` — general-purpose workers. Point them at anything. Spawn several at once.
- `security` — knows RLS is the only auth boundary, must prove exploits rather than describe them.
- `storefront` — knows Vite-not-Next, the design tokens, the CSS trap below, the no-fake-data rule.
- `dashboard` — knows the spec's table names don't match reality.

Marwan likes spawning several at once and saying "jad do X, ramzi do Y". **Agent files are only read at session start** — new ones need a restart before they're summonable by name.

**Memory** — `C:\Users\Marwan\.claude\projects\C--Users-Marwan--claude\memory\` with `MEMORY.md` as the index. Covers CADO plus his other projects: **Zeinab Jewelry**, **myaccessories.lb**, **ja-accessories** (all WhatsApp-checkout shops), and the CADO mobile app plan.

**Preview servers** — `.claude/launch.json` defines named dev servers. CADO's web app is `cado-web` on port 5173. **Use the preview tooling, never `npm run dev` in a shell.**

**Scratchpad scripts** — `apply-migration.mjs` and various check scripts.

**Connectors/MCP** — nothing meaningful is authorised. Many plugin servers show as needing auth (Slack, Linear, GitHub, Figma, etc.) — none are set up and none are needed. Ignore them.

---

## 11. Traps that have bitten this codebase more than once

- **A CSS `transform` makes an element the containing block for `position: fixed` descendants.** A page-transition animation left a transform behind and silently broke **every** sticky bottom bar, including checkout's. `PageTransition.tsx` strips the class after animating for exactly this reason. If you add animation, measure `getBoundingClientRect().top` before and after a scroll and prove the bar didn't move.
- **Tailwind config changes don't hot-reload.** Restart the dev server or you'll "verify" the old value and ship the bug.
- The repo uses **CRLF** line endings — regex patches written for LF match nothing and silently report "patched 0 files".
- **Budget bands share edges.** Every price filter must go through `inBudgetRange()` in `lib/filters.ts` (upper bound exclusive). An inclusive test put $50 gifts in two bands at once, and filter counts summed to more than the number of products.
- **Never build a raw PostgREST `.or()` string from user input** — sanitise commas, parens and `*` first, or it's an injection vector.
- **Screenshots time out** in this environment. Assert with page text / DOM values instead. **Lazy images never fire their IntersectionObserver headless** — that's a harness artifact, not a bug.
- A test suite silently passed a **removed** parameter, so every call 404'd with `PGRST202` and every assertion was unreachable while appearing to pass.

---

## 12. Credentials — how to get them, never what they are

**Nothing secret is written here on purpose.** Ask Marwan; he generates it, you use it, he revokes it.

| What | Where | Notes |
|---|---|---|
| Supabase URL + **anon** key | `apps/web/.env` (gitignored) | Already on disk. Public by design — ships in the browser. |
| Supabase **service role** key | Supabase dashboard → Settings → API | Ask. **Server-side only. Never in client code, never in a `VITE_*` var, never committed.** |
| Supabase **management** token | supabase.com/dashboard/account/tokens | Ask. Max 30-day expiry. Needed to apply migrations. |
| Expo token | expo.dev/settings/access-tokens | Ask. Needed for APK builds. |
| Vercel | CLI has built-in auth | **Try `vercel` first** before asking for a token — it usually just works. |
| WhatsApp (Twilio/Meta) | not set up | Doesn't exist yet. Stub notifications to `console.log`. |

`.env*` is gitignored and **no secret has ever been committed** — history was scanned across all commits on all branches. If one ever is, **rotate it**; deleting the file doesn't remove it from history.

---

## 13. What was actually done, in order

A log of the work, so you know what's been tried and don't redo it.

**Fixed early on:** signup was broken for every new customer (the page showed "check your email" unconditionally even though email confirmation is off, so nobody could get in). Mobile keyboard covering the gift-card email input. Gift-card recipient now accepts email **or** phone.

**The gift card system was simplified:** PIN dropped entirely, one 12-char code, `$5` delivery fee added to `place_order`, and order totals fixed — they were wrong.

**A security pass found and fixed a live data leak:** the admin account could read **every** customer's order, because `OR is_admin()` had been folded into the "read your own orders" policy. The same pass found `order_items` had an INSERT policy of `with check (is_admin() or true)` — always true — letting anyone inject arbitrary line items and bypass `place_order` entirely.

**Homepage was restructured** several times at Marwan's direction: horizontal scroll rows with real photos, budget bands settled at Under $20 / $20–50 / $50–100 / $100–200 / $200+, categories as a 5-and-5 grid, inline search on the homepage, Search removed from the bottom nav. "Trending", "order by 4PM", "Partner Stores" and the Instagram section were all cut. "For Her"/"For Him" were kept but their photos replaced.

**Two would-be-empty traps were caught before shipping:** the "For Her"/"For Him" cards and the homepage recipient cards pointed at `recipient_tags` that didn't exist on any product, so every one of those links led to an empty page. Fixed by tagging products (migration 0022), not by hiding the links.

**Product photos were chosen semi-automatically and it went badly twice** — the script picked a completely blank white frame for sneakers, and a photo of a person wearing Nikes. Also rejected: a Christmas-branded mug, a Calvin Klein–branded shoe, a cannabis-brand product for "For Dad". Lesson: automated image selection needs a human look, every time.

**PROMPTS 1–9 of the redesign were built and verified in-browser.** Design tokens, component library, homepage, product page, gift finder, cart, one-page checkout, order-confirmed screen, Occasions tab.

**A real order was placed end-to-end to verify checkout** (`CADO-1028`), then deleted and the stock restored — that's the standard: test with real data, then clean up and verify the cleanup.

**The privilege escalation was found, fixed, and then actually attacked** to prove the fix holds (§7).

**`vercel.json` CSP was tightened** and an external QR service removed — `GiftCardSend.tsx` was drawing its QR via `api.qrserver.com`, which put every gift card's redemption code into a third party's access logs. Now generated in-browser.

**Not deployed.** Everything since `8e1aab3` is committed and unshipped, by Marwan's explicit choice.

---

## 14. If you do nothing else

1. **Tell Marwan to fix the backups.** No PITR, zero backups. Everything else is recoverable; this isn't.
2. **Run the dashboard's cross-store isolation test** before that app touches a real store account.
3. **Don't deploy** without asking — a lot is committed and unshipped, deliberately.
4. **Ask about the remaining gift-card "4.10" fixes** — that spec existed only in an old chat and is not in the repo.
5. When something is broken, **say so plainly**. He'd far rather hear "email doesn't work yet" than find out from a customer.
