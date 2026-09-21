-- Secure, bounded storage for Communications email attachments and retain
-- attachment metadata when an email is saved as a draft.

alter table public.message_drafts
  add column if not exists attachments jsonb not null default '[]'::jsonb;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv', 'text/plain',
      'application/zip', 'application/x-zip-compressed',
      'application/octet-stream'
    ]
where id = 'message-attachments';

drop policy if exists "message-attachments auth select" on storage.objects;
create policy "message-attachments auth select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner_id = (select auth.uid()::text)
  );

drop policy if exists "message-attachments auth insert" on storage.objects;
create policy "message-attachments auth insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "message-attachments auth delete" on storage.objects;
create policy "message-attachments auth delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner_id = (select auth.uid()::text)
  );
