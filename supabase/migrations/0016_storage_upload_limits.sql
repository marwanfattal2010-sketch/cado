-- PART 8: file uploads. Ownership was already correctly scoped per-partner
-- via the {partner_id}/... path convention, but nothing stopped a 500MB file
-- or an .html/.exe being uploaded into a bucket meant for product photos.
-- Whitelist real image types and cap size per bucket.

update storage.buckets set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('product-images', 'partner-logos', 'avatars');
