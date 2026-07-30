-- Storage buckets: product-images (public), partner-logos (public), avatars (private).
-- Convention: objects are stored under `{partner_id}/...` (product-images, partner-logos)
-- so the ownership check mirrors the products/partners RLS policies.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('partner-logos', 'partner-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "public reads product-images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "partner writes own product-images" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = my_partner_id()::text
  );
create policy "partner updates own product-images" on storage.objects
  for update using (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = my_partner_id()::text
  );
create policy "partner deletes own product-images" on storage.objects
  for delete using (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = my_partner_id()::text
  );

create policy "public reads partner-logos" on storage.objects
  for select using (bucket_id = 'partner-logos');
create policy "partner writes own partner-logos" on storage.objects
  for insert with check (
    bucket_id = 'partner-logos' and (storage.foldername(name))[1] = my_partner_id()::text
  );
create policy "partner updates own partner-logos" on storage.objects
  for update using (
    bucket_id = 'partner-logos' and (storage.foldername(name))[1] = my_partner_id()::text
  );

create policy "owner reads own avatar" on storage.objects
  for select using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner writes own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner updates own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
