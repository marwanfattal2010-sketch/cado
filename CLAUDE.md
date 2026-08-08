# CADO — project context

Gift marketplace for Lebanon. Customers browse gifts from local boutique
stores, order same-day delivery, and send gift cards.

Read this before making changes. It exists so a new session doesn't have to
rediscover the decisions below — several of them are non-obvious and a couple
were security fixes.

---

## What runs where

| Piece | Lives in | Notes |
|---|---|---|
| Customer website | `apps/web` (Vite + React + React Router) | **This is the real product.** Deployed to Vercel at `cado-web.vercel.app` |
| Android/iOS app | `apps/mobile` (Expo) | A **WebView wrapper** around the live website — it is not a separate app. Website changes reach it instantly; only native changes (splash, keyboard, icons) need a rebuild. |
| Partner/admin portal | `apps/admin` (Vite + React) | Mostly unbuilt |
| Database + auth | Supabase, project ref `tzuntmerjhegkzsbfmnf` | Named "CADO" in the dashboard |
| Shared types | `packages/shared` | `database.types.ts` is hand-maintained; CLI type-gen access was lost |

> The root `README.md` predates the web app and describes `apps/mobile` as the
> customer app. That is no longer true — treat this file as authoritative.

**Not Next.js.** No `loading.tsx`, no `next/image`, no server components.
Loading states, route transitions, and image handling are all built by hand
(`components/Skeleton.tsx`, `TopProgressBar.tsx`, `PageTransition.tsx`,
`ScrollToTop.tsx`).

---

## Architecture: the database *is* the server

There is no API layer. The browser talks to Supabase directly via PostgREST.
That means:

- **Row Level Security is the only authorization boundary.** If RLS is wrong,
  the data is exposed. There is no middleware to catch it.
- **All business logic that touches money lives in Postgres functions**
  (`SECURITY DEFINER`), not in React. `place_order()`, `purchase_gift_card()`,
  `check_gift_card_balance()`, `admin_money_summary()`, etc.
- Client-side checks (e.g. hiding the admin page) are **UX only**. The real
  gate is always `is_admin()` inside the function.
- Never accept `user_id`, `role`, or `store_id` from the browser. Identity
  comes from `auth.uid()` only.

Migrations in `supabase/migrations` are the source of truth and are applied
via the Supabase Management API (`POST /v1/projects/{ref}/database/query`),
because CLI login was lost.

---

## Rules that must not be broken

**Secrets** (the owner set this rule explicitly):
- The service role key must never appear in client code, in a `NEXT_PUBLIC_*`
  or `VITE_*` variable, in the repo, or in the built bundle. Only the anon key
  is client-side.
- After building, grep the bundle to confirm. If a key ever lands in git,
  rotate it — deleting the file is not enough, history keeps it.

**Money integrity:**
- Gift cards are created `pending_payment` and are **not spendable** until an
  admin confirms payment. Never auto-activate.
- Redemption uses `SELECT ... FOR UPDATE` row locking. There are real
  concurrency tests in `scripts/test-gift-card-security.mjs` proving two
  simultaneous redemptions can't double-spend, and that a $150 order against a
  $100 card can't go negative. Run them after touching gift card logic
  (needs `SUPABASE_SERVICE_ROLE_KEY` in env — never hardcode it).
- Every balance change writes to `audit_log`.

**Never invent content that implies real activity.** Reviews are built but
render only when `REVIEWS.length > 0` — fake testimonials on a new marketplace
are easy to spot and cost trust. Same for the partner store count, which stays
hidden until it's real.

---

## Known state / gotchas

- **Email is broken for anyone but the owner.** Resend is in sandbox mode with
  no verified domain, so it only delivers to the account owner. Signup
  confirmation was therefore disabled (`mailer_autoconfirm: true`) so new
  customers can actually register. Password reset still won't work for others
  until a domain is bought and verified.
- **Payments are not automated.** Cash on delivery or manual Whish transfer to
  81 900 002. There is no payment provider, no webhook. Don't describe it as
  automated.
- **Google sign-in is wired up but inert** until a Google OAuth Client ID +
  Secret are added to Supabase. Apple sign-in needs a paid Apple Developer
  account and is deferred.
- **Some homepage product rows use placeholder data** (`PLACEHOLDER_CATALOG`
  in `pages/Home.tsx`) — clearly commented. Their "+" buttons are inert
  because there's no real product id behind them.
- Instagram strip is placeholder images behind `SHOW_INSTAGRAM`; the account
  doesn't exist yet. No Instagram API is used.
- Delivery fee is a flat $5, set inside `place_order()`.

---

## Conventions

- Budget bands and recipient options live in `apps/web/src/lib/filters.ts` —
  the homepage, gift finder, and category filter all read from there so they
  can't drift. Recipient values must match real `recipient_tags` on products,
  or the card leads to an empty page.
- Horizontal card rows use the `.scroll-row` utility (`index.css`) and bleed to
  the screen edge so the last card is visibly cut off.
- Images below the fold get `loading="lazy"`.
- Verify at **390px width first** — mobile is the primary surface.
- Placeholder photography is real, freely-licensed stock. Check each image
  visually before committing: several have come back with visible brand logos
  or the wrong subject entirely.

---

## Deploying

```bash
# web (from repo root)
npx vercel deploy --prod --token=$VERCEL_TOKEN --yes

# android (from apps/mobile) — only needed for native changes
npx eas-cli build --platform android --profile preview --non-interactive
```

Credentials (Supabase service role + management token, Vercel, GitHub, Expo)
are held by the owner and passed in at run time. **Do not commit them.**
