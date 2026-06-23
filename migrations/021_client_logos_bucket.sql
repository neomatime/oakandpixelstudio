-- Ensure client logo uploads work for Client Profile and onboarding.
-- Public reads are controlled by storage.buckets.public=true; authenticated users can upload and manage logo objects.

alter table clients add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "client-logos auth insert" on storage.objects;
create policy "client-logos auth insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'client-logos');

drop policy if exists "client-logos auth update" on storage.objects;
create policy "client-logos auth update"
  on storage.objects for update to authenticated
  using (bucket_id = 'client-logos')
  with check (bucket_id = 'client-logos');

drop policy if exists "client-logos auth delete" on storage.objects;
create policy "client-logos auth delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'client-logos');

-- Remove old read policies that can trigger bucket-listing security advisories on public buckets.
drop policy if exists "auth_read_client_logos" on storage.objects;
drop policy if exists "client-logos auth select" on storage.objects;