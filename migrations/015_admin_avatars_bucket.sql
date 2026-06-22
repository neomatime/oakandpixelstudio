-- Public bucket for the admin profile avatar image (backlog items 1-2).
insert into storage.buckets (id, name, public)
values ('admin-avatars', 'admin-avatars', true)
on conflict (id) do nothing;

drop policy if exists "admin-avatars public read" on storage.objects;
create policy "admin-avatars public read"
  on storage.objects for select
  using (bucket_id = 'admin-avatars');

drop policy if exists "admin-avatars authenticated insert" on storage.objects;
create policy "admin-avatars authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'admin-avatars');

drop policy if exists "admin-avatars authenticated update" on storage.objects;
create policy "admin-avatars authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'admin-avatars');

drop policy if exists "admin-avatars authenticated delete" on storage.objects;
create policy "admin-avatars authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'admin-avatars');
