# CADO

Gift marketplace app for Lebanon — customer app (Expo/React Native) + partner/admin portal (Vite/React), backed by Supabase.

## Structure

- `apps/mobile` — customer-facing Expo Router app (iOS/Android/web)
- `apps/admin` — partner + admin web portal (Vite + React)
- `packages/shared` — shared types, Zod schemas, Supabase client factory
- `supabase/migrations` — versioned SQL schema (source of truth)
- `supabase/seed.sql` — fixed reference data (categories, occasions)
- `scripts/seed.ts` — demo data seeding (partners/products), added in Stage 9

## One-time setup

1. Install dependencies from the repo root:
   ```
   pnpm install
   ```
2. Create a free Supabase project at https://supabase.com (pick a region close to Lebanon, e.g. EU).
3. Link this repo to your project and push the schema:
   ```
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   npx supabase db execute -f supabase/seed.sql
   npx supabase gen types typescript --linked > packages/shared/src/database.types.ts
   ```
4. Copy `.env.example` to `.env` in both `apps/mobile` and `apps/admin`, and fill in your project's URL + anon key (Project Settings → API in the Supabase dashboard).

## Running the apps

```
pnpm mobile   # starts Expo dev server (scan QR with Expo Go, or press w for web)
pnpm admin    # starts the Vite dev server for the partner/admin portal
```
