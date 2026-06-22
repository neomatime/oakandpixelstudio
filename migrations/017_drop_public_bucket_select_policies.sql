-- Public buckets serve files via /storage/v1/object/public/... URLs without
-- any RLS policy on storage.objects. A SELECT policy only enables API-based
-- bucket listing, which we do not want for either bucket.
-- Dropping these policies clears the public_bucket_allows_listing advisories.
DROP POLICY IF EXISTS "admin-avatars authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_client_logos" ON storage.objects;
