-- Client asset and document repository for OPS onboarding.
-- Stores upload metadata, internal checklist state, access notes, folder placeholders, and OPS document slots.

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'document',
  folder TEXT NOT NULL,
  document_key TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_path TEXT,
  public_url TEXT,
  status TEXT NOT NULL DEFAULT 'Missing',
  notes TEXT,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, document_key)
);

ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'document';
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'OPS Documents';
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS document_key TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Missing';
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS client_documents_client_key_idx ON client_documents(client_id, document_key);
CREATE INDEX IF NOT EXISTS client_documents_client_folder_idx ON client_documents(client_id, folder);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_client_documents" ON client_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "auth_read_client_documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_insert_client_documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_update_client_documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-documents') WITH CHECK (bucket_id = 'client-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_delete_client_documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
