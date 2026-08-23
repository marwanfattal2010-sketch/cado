# CADO backups

> **⚠️ Read this before restoring anything.**
> Restoring **overwrites** the database you point it at. Everything currently
> in that project — orders, accounts, products — is replaced by whatever is in
> the dump. Never point a restore at the live project unless the live project
> is already lost or you have decided, deliberately, to roll it back.

This repository is written to by a robot. Nobody needs to commit here by hand.

Every night at **01:00 UTC (04:00 Beirut)** a GitHub Action in the `cado`
repository dumps the whole Supabase project, checks that the dump can actually
be restored, and pushes the result here. If the check fails, nothing is
pushed and the run goes red — a backup that cannot be restored is worse than
no backup, because it feels like safety.

## What is in here

| Path | What it is |
| --- | --- |
| `db/YYYY-MM-DD.sql.gz` | The whole database for that night: tables, data, functions, triggers, RLS policies. Gzipped plain SQL. The last **30 days** are kept; older ones are pruned automatically. |
| `storage/<bucket>/<path>` | Every uploaded file, mirrored from Supabase Storage — product photos, store logos, avatars. This is a **mirror**, not a history: a file deleted in Supabase disappears here too on the next run. |

The database dump does **not** contain the uploaded files, and the storage
mirror does **not** contain any database rows. A real restore needs both.

## If disaster happens

### 1. Restore the database

You do not need Postgres installed on your computer. Use the manual workflow:

1. Decide which project you are restoring **into**. Usually a brand-new
   Supabase project, so you can check it before pointing the app at it.
2. In that project: **Project Settings → Database → Connection string →
   Session pooler** (or Direct connection). Copy it, and put the real password
   into it where it says `[YOUR-PASSWORD]`.
3. In the `cado` repo on GitHub: **Settings → Secrets and variables → Actions
   → New repository secret**, named `RESTORE_TARGET_DB_URL`, pasted value.
4. Go to **Actions → "Restore a backup (manual)" → Run workflow** and fill in:
   - `dump_date` — e.g. `2026-08-24` (pick a file from `db/` here)
   - `confirm_project_ref` — the target project's ref, the random-looking
     string in its URL. The run **aborts** unless it matches the connection
     string you saved, so you cannot restore into the wrong project by
     mistake.
   - tick **"This ERASES and replaces the target database"**.
5. Watch the run. At the end it prints the row counts it restored.

The log will show some `ERROR:` lines about extensions and roles like
`supabase_admin`. That is normal and expected: those pieces belong to Supabase
itself and already exist in the target project. What matters is the row counts
at the end.

**Restoring into an existing project instead of a fresh one?** Same steps —
but everything in it is replaced. Take a manual dump first if there is
anything in there you want to keep.

### 2. Put the photos back

The storage mirror is re-uploaded with a script from the `cado` repo, run on
your machine (it only needs Node, which you have):

```bash
# from the cado repo, with the backups repo cloned next to it
SUPABASE_URL=https://<new-project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<new project's service_role key> \
node scripts/backup/storage-restore.mjs ../cado-backups/storage
```

It creates any missing buckets, then uploads every file to the same path it
had before, so the `storage_path` values already in the database keep working.
Files that are already there are skipped, so it is safe to re-run.

### 3. Point the app at the new project

If you restored into a **new** project, update these and redeploy:

- `apps/web/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Vercel → both `cado-web` and `cado-dashboard` project env vars
- `apps/dashboard/.env.local` → service-role key (local scripts only)
- The `SUPABASE_DB_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets in the `cado`
  repo, so the nightly backup follows the project that is actually live

### 4. Things a restore does not bring back

- **Sessions.** Everyone is signed out and signs in again. Accounts and
  passwords themselves are in the dump (`auth.users`).
- **Anything written after the dump ran.** The most you can lose is one day —
  whatever happened between 04:00 Beirut and the moment things broke.
- **Storage files uploaded after the last nightly mirror.**

## Checking the backups are alive

Look at the commit list here. There should be a commit every day, named
`backup <date> — partners 12 products 103 ...`. No commit for a day means the
run failed, and GitHub emails the repository owner when a scheduled workflow
fails.

To test the whole thing without waiting for the night: in the `cado` repo,
**Actions → "Nightly backup" → Run workflow**.

## Cost

Zero. GitHub Actions is free for private repositories up to 2,000 minutes a
month; this job takes a few minutes a night. Storage here is a few hundred MB
of photos plus 30 small dumps.
