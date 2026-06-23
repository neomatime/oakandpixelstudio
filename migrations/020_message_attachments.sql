-- Message attachments (Communications Hub). Files are uploaded to a private
-- Storage bucket from the browser; /api/send-message downloads them with the
-- service key and attaches them to the Resend email. messages.attachments
-- stores metadata [{ name, size, type, path }] for history + downloads.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

drop policy if exists "message-attachments auth select" on storage.objects;
create policy "message-attachments auth select"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments');

drop policy if exists "message-attachments auth insert" on storage.objects;
create policy "message-attachments auth insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments');

drop policy if exists "message-attachments auth delete" on storage.objects;
create policy "message-attachments auth delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'message-attachments');
