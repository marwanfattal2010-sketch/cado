@echo off
REM Full Postgres dump of the CADO database - roles, schema and data.
REM Writes to C:\Users\Marwan\cado-backups\dumps\<timestamp>\ (outside the repo).
REM Needs the database connection string in
REM   C:\Users\Marwan\cado-secrets\supabase-db-url.txt
cd /d "%~dp0.."
node scripts\db-dump.mjs
