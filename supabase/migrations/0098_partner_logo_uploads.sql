-- 0098 — let a shop upload its own logo, and let an admin do it for them.
--
-- `partners.logo_url` already exists and the `partner-logos` bucket is already
-- public, so nothing here adds a column or a bucket. What was missing was the
-- storage side of the story:
--
--   * a partner could INSERT and UPDATE inside its own folder but could not
--     DELETE, so replacing a logo left the old file orphaned in the bucket
--     forever;
--   * an admin had no write access at all. `admin full access to partners`
--     covers the ROW, so an admin could already point `logo_url` anywhere —
--     but not put a file there, which made "upload on a store's behalf"
--     impossible for the one person most likely to be doing it (a shop emails
--     its logo to CADO rather than logging in).
--
-- The folder is the partner's id, matching the existing policies and the two
-- logos already in the bucket. Everything is additive; no policy is dropped.

-- A shop can clear out its own old logo when it replaces one.
create policy "partner deletes own partner-logos"
  on storage.objects for delete
  using (
    bucket_id = 'partner-logos'
    and (storage.foldername(name))[1] = (my_partner_id())::text
  );

-- An admin can put a file in any shop's folder, replace it, and remove it.
-- `is_admin()` is the same predicate guarding every other admin surface.
create policy "admin writes partner-logos"
  on storage.objects for insert
  with check (bucket_id = 'partner-logos' and is_admin());

create policy "admin updates partner-logos"
  on storage.objects for update
  using (bucket_id = 'partner-logos' and is_admin());

create policy "admin deletes partner-logos"
  on storage.objects for delete
  using (bucket_id = 'partner-logos' and is_admin());
