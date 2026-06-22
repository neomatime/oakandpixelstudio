-- Drop anon INSERT on clients.
-- Clients are only created by authenticated admins (direct or via "Convert to Client").
-- Authenticated users keep full access via the existing "auth_all" policy.
DROP POLICY IF EXISTS "anon_insert" ON clients;

-- Restrict admin-avatars SELECT to authenticated users only.
-- Individual file access via public URL (/storage/v1/object/public/admin-avatars/...)
-- is controlled by the bucket's public=true flag and is unaffected by RLS.
-- This only blocks anonymous bucket enumeration via the Storage API.
DROP POLICY IF EXISTS "admin-avatars public read" ON storage.objects;
CREATE POLICY "admin-avatars authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-avatars');
