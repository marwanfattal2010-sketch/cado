-- 0081: actually restrict the anon role's view of `partners`.
--
-- 0080 ran `revoke select (commission_rate, ...) on partners from anon` and
-- changed nothing — commission rates were still world-readable afterwards, as
-- a check against the live database showed. The reason is a Postgres rule
-- worth writing down: a TABLE-level SELECT grant covers every column, present
-- and future, and a column-level revoke cannot carve a hole in it. The only way
-- to restrict columns is to drop the table-level grant and hand back the
-- columns you do want, explicitly.
--
-- So: anon loses SELECT on the table and gets it back on the public columns
-- only. `authenticated` is untouched, so the dashboard — which always has a
-- session — keeps working exactly as before.
--
-- WHAT ANON KEEPS is the storefront's own list, taken from every
-- `.from("partners").select(...)` in apps/web:
--   id, name, slug, description, tagline, logo_url, cover_image_url, city,
--   featured_rank, is_live
-- plus the columns the shop page needs after 0080's edit (country, is_featured,
-- store_of_week, offers_gift_wrap, status, created_at). Anything not listed
-- here will 403 for a logged-out visitor, which is the point — but it also
-- means a new storefront query must add its column here.
--
-- WHAT ANON LOSES: commission_rate, pickup_address, driver_contact, email,
-- phone, application_text, rejection_reason, reviewed_by, reviewed_at,
-- applied_at, is_demo, confirmation_timeout_minutes.
--
-- SAFETY: the storefront was deployed with explicit column lists BEFORE this
-- ran. Applying it against the old `select("*")` build would have broken every
-- store page — the 0046 mistake.

revoke select on partners from anon;

grant select (
  id,
  name,
  slug,
  description,
  tagline,
  logo_url,
  cover_image_url,
  city,
  country,
  is_live,
  is_featured,
  featured_rank,
  store_of_week,
  offers_gift_wrap,
  status,
  created_at
) on partners to anon;
