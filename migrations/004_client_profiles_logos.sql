-- Oak & Pixel Studio client profiles and logo storage.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'Active';

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "auth_read_client_logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_insert_client_logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_client_logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos')
  WITH CHECK (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_delete_client_logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
